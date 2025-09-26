import mongoose, { Schema } from "mongoose";

import CabinsModel from "./cabinsModel.js";
import SettingsModel from "./settingsModel.js";
import { customAlphabet } from "nanoid";
import AppError from "../utils/appError.js";
import { addDays, areIntervalsOverlapping, differenceInDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { toUtcMidnight } from "../helpers/tz-helpers.js";

const nanoid6 = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  6
);

const BookingsSchema = new mongoose.Schema(
  {
    // startDate: {
    //   type: Date,
    //   required: [true, "A booking must has a start date."],
    //   validate: {
    //     validator: function (value) {
    //       return this.endDate > value;
    //     },
    //     message: () => "Start date should be before the end date.",
    //   },
    // },
    // endDate: {
    //   type: Date,
    //   required: [true, "A booking must has a end date."],
    //   validate: {
    //     validator: function (value) {
    //       return this.startDate < value;
    //     },
    //     message: () => "End date should be later than start date.",
    //   },
    // },
    startDateUtc: {
      type: Date,
      required: [true, "A booking must have a start date (UTC)."],
    },
    numNights: {
      type: Number,
      required: [true, "A booking must have a number of nights."],
      min: [1, "Number of nights must be at least 1."],
    },
    hotelTimeZone: {
      type: String,
      required: [true, "Hotel time zone is required."],
    },
    endDateUtc: { type: Date },
    numGuests: {
      type: Number,
      required: [true, "A booking must have number of guests."],
      trim: true,
    },
    cabinPrice: {
      type: Schema.Types.Decimal128,
    },
    extraPrice: {
      type: Schema.Types.Decimal128,
    },
    totalPrice: {
      type: Schema.Types.Decimal128,
    },
    status: {
      type: String,
      enum: {
        values: ["unconfirmed", "checked-in", "checked-out"],
        message: "Status is not valid.",
      },
      validate: {
        validator: function (value) {
          if (value === "checked-in" || value === "checked-out")
            return this.isPaid;
        },
        message: () => "A checkedin or checkedout booking should be paid.",
      },
      required: [true, "A booking must have a status."],
      default: "unconfirmed",
      lowercase: true,
    },
    hasBreakfast: {
      type: Boolean,
      required: true,
      default: false,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    pnrCode: {
      type: String,
      required: true,
      default: () => nanoid6(),
    },
    observations: {
      type: String,
      trim: true,
      maxLength: [250, "An observation can not exceed 250 characters."],
    },
    cabinId: {
      type: mongoose.Schema.ObjectId,
      ref: "Cabins",
      required: true,
      index: true,
    },
    guestId: {
      type: mongoose.Schema.ObjectId,
      ref: "Guests",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        Bookings.convertDecimal128Fields(ret);
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        Bookings.convertDecimal128Fields(ret);
        return ret;
      },
    },
    strictQuery: true,
  }
);

BookingsSchema.methods.checkAvalibilityofCabin = async function () {
  const existing = await this.constructor
    .find({ cabinId: this.cabinId, _id: { $ne: this._id } })
    .select("startDateUtc numNights")
    .lean();

  const cStart = toUtcMidnight(this.startDateUtc);
  const cEnd = addDays(cStart, this.numNights);

  return existing.some((b) => {
    const bStart = toUtcMidnight(b.startDateUtc);
    const bEnd = addDays(bStart, b.numNights);

    return !(bEnd <= cStart || cEnd <= bStart);
  });
};

BookingsSchema.methods.setEndDateUtc = function () {
  if (this.startDateUtc && this.numNights > 0) {
    const end = addDays(this.startDateUtc, this.numNights);
    return end;
  }

  return undefined;
};

// BookingsSchema.methods.setStartAndEndDateTimes = function () {
//   const startDateZ = toZonedTime(this.startDate, process.env.TZ);
//   const endDateZ = toZonedTime(this.endDate, process.env.TZ);
//   if (
//     startDateZ.getHours() !== 14 ||
//     startDateZ.getMinutes() !== 0 ||
//     startDateZ.getSeconds !== 0
//   ) {
//     startDateZ.setHours(14, 0, 0, 0);
//     this.startDate = fromZonedTime(startDateZ, process.env.TZ);
//   }

//   if (
//     endDateZ.getHours() !== 11 ||
//     endDateZ.getMinutes() !== 0 ||
//     endDateZ.getSeconds !== 0
//   ) {
//     endDateZ.setHours(11, 0, 0, 0);
//     this.endDate = fromZonedTime(endDateZ, process.env.TZ);
//   }
// };

BookingsSchema.methods.checkCabinPrice = async function (numNights) {
  const cabin = await CabinsModel.findById(this.cabinId).lean();
  return (
    (parseFloat(cabin.regularPrice.toString()) -
      parseFloat(cabin.discount.toString())) *
    numNights
  );
};

BookingsSchema.methods.checkExtraPrice = async function (numNights, numGuests) {
  const settings = await SettingsModel.findOne({ isActive: true });
  return parseFloat(settings.breakfastPrice.toString()) * numNights * numGuests;
};

BookingsSchema.methods.calculateTotalPrice = function () {
  const cabin = parseFloat(this.cabinPrice?.toString() ?? "0");
  const extra = parseFloat(this.extraPrice?.toString() ?? "0");
  return cabin + extra;
};

BookingsSchema.pre("validate", function (next) {
  this.endDateUtc = this.setEndDateUtc();
  next();
});

BookingsSchema.path("endDateUtc").validate(function (value) {
  if (!this.startDateUtc || !value) return true;
  return value.getTime() > toUtcMidnight(this.startDateUtc).getTime();
}, "End date must be later than start date.");

BookingsSchema.pre("save", async function (next) {
  if (await this.checkAvalibilityofCabin()) {
    next(new AppError("The cabin is not avaliable for submitted days.", 409));
  }

  this.cabinPrice ??= await this.checkCabinPrice(this.numNights);

  if (this.hasBreakfast) {
    this.extraPrice ??= await this.checkExtraPrice(
      this.numNights,
      this.numGuests
    );
  } else {
    this.extraPrice ??= undefined;
  }

  this.totalPrice = this.calculateTotalPrice();
  next();
});

BookingsSchema.statics.convertDecimal128Fields = function (docOrDocs) {
  const convert = (doc) => {
    if (doc && doc.cabinPrice)
      doc.cabinPrice = parseFloat(doc.cabinPrice.toString());
    if (doc && doc.extraPrice)
      doc.extraPrice = parseFloat(doc.extraPrice.toString());
    if (doc && doc.totalPrice)
      doc.totalPrice = parseFloat(doc.totalPrice.toString());
  };

  if (Array.isArray(docOrDocs)) {
    docOrDocs.forEach(convert);
  } else {
    convert(docOrDocs);
  }
};

BookingsSchema.post(/^find/, function (docs) {
  this.model.convertDecimal128Fields(docs);
});

BookingsSchema.post("save", function (doc, next) {
  this.constructor.convertDecimal128Fields(doc);
  next();
});

BookingsSchema.index({ cabinId: 1, startDateUtc: 1, endDateUtc: 1 });

BookingsSchema.index({ pnrCode: 1 }, { unique: true });

const Bookings = mongoose.model("Bookings", BookingsSchema);
export default Bookings;
