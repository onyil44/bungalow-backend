import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jsValidator from "validator";

const UsersSchema = mongoose.Schema(
  {
    email: {
      type: String,
      lowerCase: true,
      trim: true,
      unique: true,
      required: [true, "A user must have an e-mail address."],
      validate: [jsValidator.isEmail, "Please submit a valid e-mail address"],
    },
    fullName: {
      type: String,
      trim: true,
      required: [true, "A user must have a name"],
      maxLength: [70, "A user name cano not exceeed 70 characters."],
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
    role: {
      type: String,
      true: true,
      enum: {
        values: ["receptionist", "manager", "admin", "superAdmin"],
        message: "Please submit a valid role",
      },
      required: [true, "A user must have a role."],
    },
    avatar: {
      type: String,
    },
    password: {
      type: String,
      required: [true, "Please provide a valid password."],
      validate: {
        validator: (value) =>
          jsValidator.isStrongPassword(value, {
            minLength: 9,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
            returnScore: false,
            pointsPerUnique: 1,
            pointsPerRepeat: 0.5,
            pointsForContainingLower: 10,
            pointsForContainingUpper: 10,
            pointsForContainingNumber: 10,
            pointsForContainingSymbol: 10,
          }),
        message: "This password does not meet the criteria.",
      },
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password."],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not the same.",
      },
    },
    passwordChangeAt: { type: Date, select: false },
    isActive: {
      type: Boolean,
    },
    lang: {
      type: String,
      validate: {
        validator: function (value) {
          return value.length === 2;
        },
        message: "Language code should be 2 digit!",
      },
      default: "en",
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
    wrongAttemptNumber: {
      type: Number,
      default: 0,
      select: false,
    },
    refreshToken: { type: String, select: false },
    firstActivateToken: { type: String, select: false },
    autoLoginCouter: { type: Number, default: 0, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictQuery: true,
  }
);

UsersSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

UsersSchema.methods.compareRefreshToken = async function (token, refreshToken) {
  return await bcrypt.compare(token, refreshToken);
};

UsersSchema.methods.passwordChangedAfter = function (JWTTimestamp) {
  const changeTime = parseInt(this.passwordChangeAt.getTime() / 1000);
  return JWTTimestamp < changeTime;
};

UsersSchema.pre("save", async function (next) {
  if (!this.password) next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  this.passwordChangeAt = Date.now() - 1000;

  next();
});

const Users = mongoose.model("Users", UsersSchema);

export default Users;
