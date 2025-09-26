"use strict";

import mongoose from "mongoose";
import jsValidator from "validator";

const GuestsSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "A guest must has a fullname."],
      trim: true,
      maxLength: [50, "A fullname can not exceed 50 characters."],
    },
    fullNameLowerCase: {
      type: String,
      required: [true, "Plese submit lowercase of the fullname."],
      trim: true,
      lowerCase: true,
      default: function () {
        return this.fullName.toLowerCase();
      },
      select: false,
    },
    email: {
      type: String,
      required: [true, "A guest must has an email."],
      validate: [jsValidator.isEmail, "Please submit a valid email address."],
      trim: true,
      lowercase: true,
      unique: true,
    },
    nationalId: {
      type: String,
      required: [true, "A guest must has a national id number."],
      trim: true,
      maxLength: [30, "A national Id number can not exceed 30 characters."],
    },
    nationality: {
      type: String,
      required: [true, "A guest must has a nationality."],
      trim: true,
      lowercase: true,
      maxLength: [50, "A nationality can not exceed 50 characters."],
    },
    countryFlag: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictQuery: true,
  }
);

const Guests = mongoose.model("Guests", GuestsSchema);

export default Guests;
