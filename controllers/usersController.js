"use strict";

import crypto from "crypto";

import ApiController from "./apiController.js";
import Users from "../models/usersModel.js";
import catchAsync from "../utils/catchAsync.js";
import apiTranslation from "../utils/apiTranslation.js";
import AppError from "../utils/appError.js";
import Email from "../utils/email.js";

import { roleHierarchy } from "../helpers/roleHierarchy.js";

class UsersController extends ApiController {
  constructor() {
    super();
    this._Model = Users;
  }

  setRolesRestriction = (req, res, next) => {
    const currentUserRole = req.user.role;

    if (currentUserRole === "superAdmin") {
      this._rolesRestriction = {}; // Tüm kullanıcılar erişebilir
    } else {
      const visibleRoles = roleHierarchy[currentUserRole] || [];
      this._rolesRestriction = { role: { $in: visibleRoles } };

      if (
        ["POST", "PATCH", "PUT"].includes(req.method) &&
        req.body?.role &&
        !visibleRoles.includes(req.body?.role)
      ) {
        return next(
          new AppError(
            apiTranslation.translate(req.query.lang, "unAuthorized"),
            401
          )
        );
      }
    }

    next();
  };

  createNewUser = catchAsync(async (req, res, next) => {
    const activateToken = crypto.randomBytes(32).toString("hex");
    const newUser = await this._Model({
      email: req.body.email,
      fullName: req.body.fullName,
      role: "receptionist",
      isActive: false,
      firstActivateToken: crypto
        .createHash("sha256")
        .update(activateToken)
        .digest("hex"),
    }).save({ validateBeforeSave: false });

    try {
      await new Email(
        newUser,
        `${req.protocol}://bungalow.onyilprojects.com/activateUser/${activateToken}`
      ).sendWelcome();
      res.status(201).json({
        status: "success",
        data: {
          doc: {
            email: newUser.email,
            name: newUser.fullName,
            message: apiTranslation.translate(
              req.query.lang,
              "activationMailSend"
            ),
          },
        },
      });
    } catch (err) {
      await this._Model.deleteOne({ _id: newUser._id });
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "emailSendError"),
          500
        )
      );
    }
  });

  getMe = catchAsync(async (req, res, next) => {
    const user = await this._Model.findOne(
      { _id: req.user._id },
      "-refreshToken -__v -passwordChangeAt -fullNameLowerCase -createdAt -updatedAt"
    );

    res.status(200).json({ status: "success", data: user });
  });

  updateUser = catchAsync(async (req, res, next) => {
    const doc = await this._Model.findOne(
      {
        _id: req.params.id,
        ...this._userRestriction,
        ...this._rolesRestriction,
      },
      "+firstActivateToken"
    );

    if (!doc)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "noDocument"),
          404
        )
      );

    if (doc.firstActivateToken && req.body.isActive)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "userNotRegistered"),
          401
        )
      );
    Object.assign(doc, req.body);
    await doc.save({ validateBeforeSave: false });
    res.status(200).json({ status: "success", data: { doc } });
  });

  resetUserPassword = catchAsync(async (req, res, next) => {
    const userId = req.params.userId;
    const resetPasswordUser = await this._Model.findOne({ _id: userId });

    if (!resetPasswordUser)
      return next(
        new AppError(apiTranslation.translate(req.query.lang, "noUser"), 400)
      );

    if (!roleHierarchy[req.user.role].includes(resetPasswordUser.role))
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "unAuthorized"),
          401
        )
      );

    const activateToken = crypto.randomBytes(32).toString("hex");

    Object.assign(resetPasswordUser, {
      password: null,
      passwordConfirm: null,
      isActive: false,
      wrongAttemptNumber: 0,
      refreshToken: null,
      firstActivateToken: crypto
        .createHash("sha256")
        .update(activateToken)
        .digest("hex"),
    });

    await resetPasswordUser.save({ validateBeforeSave: false });

    try {
      await new Email(
        resetPasswordUser,
        `${req.protocol}://bungalow.onyilprojects.com/activateUser/${activateToken}`
      ).sendResetPassword();
      res.status(200).json({
        status: "success",
        message: apiTranslation.translate(req.query.lang, "resetPassword"),
      });
    } catch (err) {
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "emailSendError"),
          500
        )
      );
    }
  });

  protectUserToDelete = (req, res, next) => {
    const protectedUserIds = [
      "68adb4f57157587dcb845a41",
      "6874ea13f02c2ce3fdb548fc",
    ];
    const userId = req.params.id;

    if (protectedUserIds.includes(userId))
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "userCannotDeleted"),
          403
        )
      );

    next();
  };
}

export default new UsersController();
