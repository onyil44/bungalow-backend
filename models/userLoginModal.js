"use strict";

import mongoose from "mongoose";

const UserLoginSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      //   required: true,
      index: true,
    },
    loginAt: {
      type: Date,
      default: Date.now(),
      required: true,
    },
    ipAddress: String,
    location: {
      country: String,
      city: String,
      latitude: Number,
      longtitude: Number,
    },
    deviceType: String,
    wasSuccessful: {
      type: Boolean,
      default: true,
    },
    loginMethod: String,
    failureReason: {
      type: String,
      enum: [
        "INVALID_PASSWORD",
        "NEW_USER_NO_PASSWORD",
        "USER_NOT_FOUND",
        "ACCOUNT_LOCKED",
        "TOO_MANY_ATTEMPTS",
        "INVALID_2FA_CODE",
        "UNKNOWN",
      ],
      required: function () {
        return this.wasSuccessful === false;
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictQuery: true,
  }
);

const UserLogin = mongoose.model("UserLogin", UserLoginSchema);

export default UserLogin;
