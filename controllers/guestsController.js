"use strict";

import ApiController from "./apiController.js";
import GuestsModel from "../models/guestsModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import apiTranslation from "../utils/apiTranslation.js";

// import { cabins } from "../restore_data/data-cabins.js";
// import { guest } from "../restore_data/data-guests.js";

import { guests } from "../restore/data-guests.js";

class GuestsController extends ApiController {
  constructor() {
    super();
    this._Model = GuestsModel;
  }

  createGuest = catchAsync(async (req, res, next) => {
    const guest = await this._Model.findOne({ email: req.body.email });
    if (guest) {
      if (
        guest.fullName !== req.body.fullName ||
        guest.nationalId !== req.body.nationalId ||
        guest.nationality !== req.body.nationality
      ) {
        return next(
          new AppError(
            apiTranslation.translate(req.query.lang, "guestNotMatch"),
            403
          )
        );
      }

      res.status(200).json({ status: "success", data: { guest } });
    } else {
      const guest = await this._Model.create(req.body);
      res.status(201).json({ status: "success", data: { guest } });
    }
  });

  reloadGuestsData = catchAsync(async (req, res, next) => {
    const restoredGuests = guests;
    await this._Model.deleteMany({});
    await this._Model.create(restoredGuests);
    res.status(201).json({ status: "success", message: "Guests reloaded!" });
  });
}

export default new GuestsController();
