import mongoose, { Schema } from "mongoose";

import BookingsModel from "../models/bookingsModel.js";
import AppError from "../utils/appError.js";
import apiTranslation from "../utils/apiTranslation.js";

const CabinsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      maxLength: [20, "A cabin name can not exceed 20 characters."],
      required: [true, "A cabin must have a name."],
      trim: true,
    },
    nameLowerCase: { type: String, trim: true },
    maxCapacity: {
      type: Number,
      required: [true, "A cabin must have a maximum capacity."],
      trim: true,
    },
    regularPrice: {
      type: Schema.Types.Decimal128,
      required: [true, "A cabin must have reqular price."],
      trim: true,
    },
    discount: {
      type: Schema.Types.Decimal128,
      trim: true,
      validate: {
        validator: function (v) {
          return (
            parseFloat(v.toString()) <= parseFloat(this.regularPrice.toString())
          );
        },
        message: "Discount should be less than regular price.",
      },
    },
    description: {
      type: String,
      trim: true,
    },
    images: {
      type: Array,
      items: { type: String },
      validate: {
        validator: function (v) {
          return v.length <= 5;
        },
        message: "Only 5 images for each cabin.",
      },
    },
    image: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        Cabins.convertDecimal128Fields(ret);
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        Cabins.convertDecimal128Fields(ret);
        return ret;
      },
    },
    strictQuery: true,
  }
);

CabinsSchema.statics.convertDecimal128Fields = function (docOrDocs) {
  const convert = (doc) => {
    if (doc && doc.regularPrice)
      doc.regularPrice = parseFloat(doc.regularPrice.toString());
    if (doc && doc.discount) doc.discount = parseFloat(doc.discount.toString());
  };
  if (Array.isArray(docOrDocs)) {
    docOrDocs.forEach(convert);
  } else {
    convert(docOrDocs);
  }
};

CabinsSchema.methods.checkCabinHasBooking = async function () {
  const cabinBookings = await BookingsModel.find({ cabinId: this._id });
  if (cabinBookings.length > 0)
    return new AppError(
      "This cabin can not be deleted. It has active bookings.",
      404
    );
};

CabinsSchema.post(/^find/, function (docs) {
  this.model.convertDecimal128Fields(docs);
});

CabinsSchema.pre("save", function (next) {
  this.nameLowerCase = this.name.toLowerCase();
  next();
});

CabinsSchema.pre("findOneAndDelete", async function (next) {
  const cabin = await Cabins.findOne(this.getQuery());
  const cabinHasBooking = await cabin.checkCabinHasBooking();
  if (cabinHasBooking) return next(cabinHasBooking);
  next();
});

const Cabins = new mongoose.model("Cabins", CabinsSchema);

export default Cabins;
