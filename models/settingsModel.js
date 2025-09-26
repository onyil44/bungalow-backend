import mongoose, { Schema } from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    minBookingLength: {
      type: Number,
      required: [true, "Please submit minimum booking days."],
      trim: true,
    },
    maxBookingLength: {
      type: Number,
      required: [true, "Please submit maximum booking days."],
      trim: true,
      validate: {
        validator: function (v) {
          return (
            parseFloat(v.toString()) >=
            parseFloat(this.minBookingLength.toString())
          );
        },
        message:
          "Maximum booking days should be more than minimum booking days.",
      },
    },
    maxGuestsPerBooking: {
      type: Number,
      required: [true, "Please submit maximum guests number per booking."],
      trim: true,
    },
    breakfastPrice: {
      type: Schema.Types.Decimal128,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        Settings.convertDecimal128Fields(ret);
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        Settings.convertDecimal128Fields(ret);
        return ret;
      },
    },
    strictQuery: true,
  }
);

SettingsSchema.statics.convertDecimal128Fields = function (docOrDocs) {
  const convert = (doc) => {
    if (doc && doc.breakfastPrice)
      doc.breakfastPrice = parseFloat(doc.breakfastPrice.toString());
  };

  if (Array.isArray(docOrDocs)) {
    docOrDocs.forEach(convert);
  } else {
    convert(docOrDocs);
  }
};

SettingsSchema.post("save", async function (doc, next) {
  if (doc.isActive) {
    const activeDocs = await Settings.find({ isActive: true });
    const filteredActiveDocs = activeDocs.filter((el) => el.id !== doc.id);
    filteredActiveDocs.forEach(async (el) => {
      el.isActive = false;
      await el.save();
    });
  }
  next();
});

SettingsSchema.post(/^find/, function (docs) {
  this.model.convertDecimal128Fields(docs);
});

const Settings = mongoose.model("Setings", SettingsSchema);

export default Settings;
