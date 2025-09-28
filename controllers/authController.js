"use strict";

import crypto from "crypto";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import multer from "multer";

import { __dirname } from "../utils/path.js";

import catchAsync from "../utils/catchAsync.js";
import Users from "../models/usersModel.js";
import AppError from "../utils/appError.js";
import apiTranslation from "../utils/apiTranslation.js";
import useragent from "useragent";
import UserLogin from "../models/userLoginModal.js";
import verifyToken from "../utils/verifyToken.js";
import sharp from "sharp";

class Authcontroller {
  restrictedTo = (...roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.user.role))
        return next(
          new AppError(
            apiTranslation.translate(req.query.lang, "unAuthorized"),
            403
          )
        );
      next();
    };
  };

  _multerStorage = multer.memoryStorage();
  _multerFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith("image")) {
      cb(
        new AppError(
          apiTranslation.translate(req.query.lang, "notAnImageFile"),
          400
        ),
        false
      );
    } else {
      cb(null, true);
    }
  };

  _multerLimits = { fileSize: 1024 * 1024 * 35 };
  _upload = multer({
    storage: this._multerStorage,
    fileFilter: this._multerFilter,
    limits: this._multerLimits,
  });

  uploadImages = this._upload.single("avatar");

  resizeAndSaveImages = catchAsync(async (req, res, next) => {
    if (!req.file) return next();

    req.file.filename = `avatar-${req.user.id}-${Date.now()}.jpeg`;

    const dir = `/app/data/imgs/avatars`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true,
      });
    }

    await sharp(req.file.buffer)
      .resize({ width: 100, fit: "contain" })
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`${dir}/${req.file.filename}`);

    if (req.user.avatar && fs.existsSync(`app${req.user.avatar}`))
      fs.unlinkSync(`app${req.user.avatar}`);

    req.body.avatar = `/imgs/avatars/${req.file.filename}`;

    next();
  });

  _createLoginLog = async ({
    req,
    userId,
    wasSuccessful = true,
    failureReason = undefined,
    loginMethod = "password",
  }) => {
    try {
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        "unknown";

      const agent = useragent.parse(req.headers["user-agent"]) || "unknown";
      const deviceType = agent.device
        .toString()
        .toLowerCase()
        .includes("mobile")
        ? "mobile"
        : "desktop";

      const location = {};

      await UserLogin.create({
        userId,
        ipAddress: ip,
        userAgent: req.headers["user-agent"],
        location,
        deviceType,
        wasSuccessful,
        loginMethod,
        failureReason,
      });
    } catch (err) {
      console.log("Login log error: ", err);
    }
  };

  _signTokens = (id) => {
    const refreshToken = jwt.sign(
      { id: id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );
    const accessToken = jwt.sign({ id: id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    });

    return { refreshToken, accessToken };
  };

  _createAndSendToken = async (user, statusCode, res) => {
    const { accessToken, refreshToken } = this._signTokens(user._id);
    const cookieOptions = {
      expires: new Date(
        Date.now() +
          Number(process.env.REFRESH_TOKEN_EXPIRES_IN.slice(0, -1)) *
            24 *
            60 *
            60 *
            1000
      ),
      httpOnly: true,
      secure: true,
      sameSite: "none",
    };

    await Users.updateOne(
      { _id: user.id },
      {
        refreshToken: crypto
          .createHash("sha256")
          .update(refreshToken)
          .digest("hex"),
      }
    );

    if (user.password) user.password = undefined;
    if (user.refreshToken) user.refreshToken = undefined;
    if (user.wrongAttemptNumber || user.wrongAttemptNumber === 0)
      user.wrongAttemptNumber = undefined;
    if (user.__v) user.__v = undefined;

    res.cookie("REFRESH_TOKEN", refreshToken, cookieOptions);
    res.status(statusCode).json({
      status: "success",
      accessToken,
      data: { user },
    });
  };

  _createAndSendAccessToken = async (user, statusCode, res) => {
    const accessToken = jwt.sign(
      { id: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
      }
    );

    if (user.password) user.password = undefined;
    if (user.refreshToken) user.refreshToken = undefined;
    if (user.wrongAttemptNumber || user.wrongAttemptNumber === 0)
      user.wrongAttemptNumber = undefined;
    if (user.__v) user.__v = undefined;

    res.status(statusCode).json({
      status: "success",
      accessToken,
      data: { user },
    });
  };

  createNewPasswordAndActivateUser = catchAsync(async (req, res, next) => {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await Users.findOne({
      firstActivateToken: hashedToken,
      isActive: false,
    });

    if (!user) {
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "invalidActivateToken"),
          498
        )
      );
    }

    if (!req.body.password || !req.body.passwordConfirm) {
      return next(
        new AppError(
          apiTranslation.translate(
            req.query.lang,
            "passwordConfirmNotSubmitted"
          ),
          401
        )
      );
    }

    if (req.body.password !== req.body.passwordConfirm) {
      return next(
        new AppError(
          apiTranslation.translate(
            req.query.lang,
            "passwordAndConfirmPasswordNotSame"
          ),
          401
        )
      );
    }

    user.firstActivateToken = undefined;
    user.isActive = true;
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    res.status(200).json({
      status: "success",
      data: {
        doc: {
          name: user.fullName,
          message: apiTranslation.translate(req.query.lang, "passwordCreated"),
        },
      },
    });
  });

  login = catchAsync(async (req, res, next) => {
    console.log(req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "emailPasswordNotSubmitted"),
          401
        )
      );
    }

    const user = await Users.findOne(
      { email: email },
      "+password +wrongAttemptNumber +paswordChangeAt +firstActivateToken"
    );

    if (!user) {
      await this._createLoginLog({
        req,
        userId: null,
        wasSuccessful: false,
        failureReason: "USER_NOT_FOUND",
      });
      return next(
        new AppError(apiTranslation.translate(req.query.lang, "noUser")),
        401
      );
    }

    if (user.firstActivateToken && !user.password) {
      await this._createLoginLog({
        req,
        userId: user._id,
        wasSuccessful: false,
        failureReason: "NEW_USER_NO_PASSWORD",
      });

      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "newUserNoPassword"),
          401
        )
      );
    }

    if (!user.isActive) {
      await this._createLoginLog({
        req,
        userId: user._id,
        wasSuccessful: false,
        failureReason: "ACCOUNT_LOCKED",
      });

      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "lockecAccount"),
          423
        )
      );
    }

    if (user && !(await user.comparePassword(password, user.password))) {
      user.wrongAttemptNumber++;

      console.log(process.env.WRONG_ATTEMPT_RANGE);

      if (user.wrongAttemptNumber >= process.env.WRONG_ATTEMPT_RANGE) {
        user.isActive = false;

        await Users.updateOne(
          { _id: user._id },
          {
            $set: { isActive: user.isActive },
            $inc: { wrongAttemptNumber: 1 },
          }
        );

        await this._createLoginLog({
          req,
          userId: user._id,
          wasSuccessful: false,
          failureReason: "TOO_MANY_ATTEMPTS",
        });

        return next(
          new AppError(
            apiTranslation.translate(req.query.lang, "tooManyWronAttempt"),
            401
          )
        );
      }

      await Users.updateOne(
        { _id: user._id },
        {
          $inc: { wrongAttemptNumber: 1 },
        }
      );

      await this._createLoginLog({
        req,
        userId: user._id,
        wasSuccessful: false,
        failureReason: "INVALID_PASSWORD",
      });

      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "wrongPassword"),
          401
        )
      );
    }

    if (user.wrongAttemptNumber > 0) user.wrongAttemptNumber = 0;

    await Users.updateOne({ _id: user._id }, { wrongAttemptNumber: 0 });
    await this._createLoginLog({ req, userId: user._id });

    await this._createAndSendToken(user, 200, res);
  });

  refreshAccessToken = catchAsync(async (req, res, next) => {
    //! refreshAccessToken fonksiyonunun döndüreceği hiç bir hata kodu 401 olmamalı. FrontEnd de axiosInstance hata kodu kontrolü yaparak eğer hata kodu 401 ise interceptors yardımı ile yeni bir sorgu yaparak refresfToken ile yeni bir accessToken almaya çalışıyor(axiosInstance.interceptors.response.use). Ancak refreshToken kontrol basamaklarında refreshAccessToken fonksiyonu içerisinde 401 hata kodu döndürürse sonsoz döngüye sebep oluyor.
    let token = "";

    if (req.cookies?.REFRESH_TOKEN) {
      token = req.cookies.REFRESH_TOKEN;
    }

    if (!token)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "noRefreshToken"),
          498
        )
      );

    const decoded = await verifyToken({ token, tokenType: "refresh" });
    if (!decoded)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "noRefreshToken"),
          498
        )
      );

    const currentUser = await Users.findById(
      decoded.id,
      "+refreshToken +passwordChangeAt"
    );

    if (!currentUser)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "notExistUser"),
          403
        )
      );

    if (!currentUser.refreshToken) {
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "userNotLoggedIn"),
          403
        )
      );
    }

    if (currentUser.passwordChangedAfter(decoded.iat))
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "changedPassword"),
          403
        )
      );

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    if (hashedToken !== currentUser.refreshToken)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "refreshTokenNotCorrect"),
          403
        )
      );

    this._createAndSendAccessToken(currentUser, 200, res);
  });

  logout = catchAsync(async (req, res, next) => {
    let token = "";

    if (req.cookies?.REFRESH_TOKEN) {
      token = req.cookies.REFRESH_TOKEN;
    }

    if (!token)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "noRefreshToken"),
          498
        )
      );

    const decoded = await verifyToken({ token, tokenType: "refresh" });
    if (!decoded)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "noRefreshToken"),
          498
        )
      );

    await Users.updateOne({ _id: decoded.id }, { refreshToken: null });
    res.clearCookie("REFRESH_TOKEN", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
    res.status(200).json({ ACCESS_TOKEN: null, message: "Logged out" });
  });

  updateMe = catchAsync(async (req, res, next) => {
    const doc = await Users.findOne({
      _id: req.user._id,
    });

    if (!doc)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "noDocument"),
          404
        )
      );

    if (req.body.role) {
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "roleUpdateForbidden"),
          401
        )
      );
    }

    if (req.body.password) {
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "passwordUpdateForbidden"),
          401
        )
      );
    }

    Object.assign(doc, req.body);
    await doc.save({ validateBeforeSave: false });
    res.status(200).json({ status: "success", data: { doc } });
  });

  updatePassword = catchAsync(async (req, res, next) => {
    const { password, newPassword, newPasswordConfirm, ...restParams } =
      req.body;

    if (Object.keys(restParams).length > 0)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "onlyPasswordUpdate"),
          401
        )
      );

    if (!password)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "noCurrentPassword"),
          401
        )
      );

    if (!newPassword || !newPasswordConfirm) {
      return next(
        new AppError(
          apiTranslation.translate(
            req.query.lang,
            "passwordConfirmNotSubmitted"
          ),
          401
        )
      );
    }

    if (newPassword !== newPasswordConfirm) {
      return next(
        new AppError(
          apiTranslation.translate(
            req.query.lang,
            "passwordAndConfirmPasswordNotSame"
          ),
          401
        )
      );
    }

    const user = await Users.findById(req.user._id, "+password");

    if (!(await user.comparePassword(password, user.password)))
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "wrongPassword"),
          401
        )
      );

    user.password = newPassword;
    user.passwordConfirm = newPasswordConfirm;
    user.wrongAttemptNumber = 0;

    await user.save({ validateBeforeSave: false });
    await this._createLoginLog({ req, userId: user._id });

    await this._createAndSendToken(user, 200, res);
  });

  autoLogin = catchAsync(async (req, res, next) => {
    const role = req.path === "/managerAutoLogin" ? "manager" : "receptionist";

    const users = await Users.find({ role: role }).select(
      "autoLoginCouter email"
    );

    const minAutoLoginUser = users
      .sort((a, b) => Number(a.autoLoginCouter) - Number(b.autoLoginCouter))
      .at(0);

    req.body.email = minAutoLoginUser.email;
    req.body.password = process.env.SECURE_PASSWORD;

    minAutoLoginUser.autoLoginCouter++;

    await minAutoLoginUser.save({ validateBeforeSave: false });

    next();
  });
}

export default new Authcontroller();
