import BookingsModel from "../models/bookingsModel.js";
import catchAsync from "../utils/catchAsync.js";
import { isPast, isToday, isFuture, format, addDays } from "date-fns";

import { isPastUtc, isTodayUtc, isFutureUtc } from "../helpers/tz-helpers.js";

import ApiController from "./apiController.js";
import Guests from "../models/guestsModel.js";
import Cabins from "../models/cabinsModel.js";
import Email from "../utils/email.js";
import AppError from "../utils/appError.js";
import apiTranslation from "../utils/apiTranslation.js";

import { createBookings } from "../restore/data-bookings.js";

class BookingsController extends ApiController {
  constructor() {
    super();
    this._Model = BookingsModel;
    this._allowedPopulatePaths = {
      cabinId: ["name"],
      guestId: ["fullName", "email", "nationalId"],
    };
  }

  createNewBooking = catchAsync(async (req, res, next) => {
    let createObjectBody;
    if (Array.isArray(req.body)) {
      createObjectBody = req.body.map((obj) => {
        return { ...obj, ...this._nestedRouteFilter };
      });
    } else {
      createObjectBody = {
        ...req.body,
        ...this._nestedRouteFilter,
      };
    }

    createObjectBody.status = "unconfirmed";

    const newBooking = await this._Model.create(createObjectBody);

    const populatedNewBooking = await newBooking.populate({
      path: "guestId",
      select: "email nationalId",
    });

    const guest = await Guests.findById(newBooking.guestId).lean();

    try {
      await new Email(
        guest,
        undefined,
        newBooking.pnrCode
      ).sendBookingCreated();
      res.status(201).json({ status: "succes", data: { populatedNewBooking } });
    } catch (err) {
      await this._Model.deleteOne({ _id: newBooking._id });
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "emailSendError"),
          500
        )
      );
    }
  });

  getBookingFromPnr = catchAsync(async (req, res, next) => {
    const { email, pnrCode, nationalId } = req.query;
    if (!email || !pnrCode || !nationalId)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "bookingDataMissing")
        )
      );

    const booking = await this._Model
      .findOne({ pnrCode })
      .populate({
        path: "guestId",
        match: {
          $and: [{ email: email || null }, { nationalId: nationalId || null }],
        },
      })
      .populate({ path: "cabinId", select: "name" });

    if (!booking || !booking.guestId)
      return next(
        new AppError(apiTranslation.translate(req.query.lang, "noBooking"))
      );

    res.status(200).json({ status: "success", data: { booking } });
  });

  // A new agregation pipeline creared to calculate the daily sales statics. firstDate and lastDate params send via query and based on these params the pipeline calculate the statics of the sales.
  getDailyBookingStats = catchAsync(async (req, res, next) => {
    const { firstDate, lastDate } = req.query;
    const stats = await this._Model.aggregate([
      {
        $match: {
          $and: [
            { createdAt: { $gte: new Date(firstDate) } },
            { createdAt: { $lte: new Date(lastDate) } },
          ],
        },
      },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: "$createdAt",
              unit: "day",
              timezone: "Europe/Istanbul",
            },
          },
          totalSalesDecimal: { $sum: "$totalPrice" },
          extrasSalesdecimal: { $sum: "$extraPrice" },
        },
      },
      {
        $project: {
          totalSales: { $toDouble: "$totalSalesDecimal" },
          extrasSales: { $toDouble: "$extrasSalesdecimal" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({ status: "success", data: { stats } });
  });

  reloadBookingsData = catchAsync(async (req, res, next) => {
    const guests = await Guests.find({});
    const allGuestIds = guests.map((guest) => guest._id);
    const cabins = await Cabins.find({});
    const allCabinIds = cabins.map((cabin) => cabin._id);
    const bookings = createBookings();

    const finalBookings = bookings.map((booking) => {
      let status;
      let isPaid;
      let numGuests = booking.numGuests;

      if (
        isPastUtc(addDays(booking.startDateUtc, booking.numNights)) &&
        !isTodayUtc(addDays(booking.startDateUtc, booking.numNights))
      ) {
        status = "checked-out";
        isPaid = true;
      }
      if (
        isFutureUtc(new Date(booking.startDateUtc)) ||
        isTodayUtc(new Date(booking.startDateUtc))
      )
        status = "unconfirmed";
      if (
        (isFutureUtc(addDays(booking.startDateUtc, booking.numNights)) ||
          isTodayUtc(addDays(booking.startDateUtc, booking.numNights))) &&
        isPastUtc(new Date(booking.startDateUtc)) &&
        !isTodayUtc(new Date(booking.startDateUtc))
      ) {
        status = "checked-in";
        isPaid = true;
      }
      if (
        booking.numGuests >
        cabins.find(
          (cabin) => cabin._id === allCabinIds.at(+booking.cabinId - 1)
        ).maxCapacity
      ) {
        numGuests = cabins.find(
          (cabin) => cabin._id === allCabinIds.at(+booking.cabinId - 1)
        ).maxCapacity;
      }
      return {
        ...booking,
        guestId: allGuestIds.at(+booking.guestId - 1),
        cabinId: allCabinIds.at(+booking.cabinId - 1),
        numGuests,
        status,
        isPaid,
      };
    });

    await this._Model.deleteMany({});
    await this._Model.create(finalBookings);

    res.status(201).json({ status: "success", message: "Bookings restored." });
  });

  getCabinOccupaidDays = catchAsync(async (req, res, next) => {
    const { cabinId } = req.params;
    const bookingsOfCabins = await this._Model
      .find({ cabinId })
      .select("startDateUtc numNights");

    res.status(200).json({ status: "success", data: bookingsOfCabins });
  });
}

export default new BookingsController();
