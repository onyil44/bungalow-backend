"use strict";

import _ from "lodash";
import APIFeatures from "../utils/apiFeatures.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import apiTranslation from "../utils/apiTranslation.js";

export default class ApiController {
  _Model;
  _ModelDefaultSortBy;
  _nestedRouteFilter;
  _userRestriction;
  _rolesRestriction;
  _allowedPopulatePaths;

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

  setUserRestriction = (req, res, next) => {
    if (req.user.role === "admin" || req.user.role === "superAdmin") {
      this._userRestriction = undefined;
    } else {
      this._userRestriction = { _id: req.user._id };
    }
  };

  setNestedRouteFilter = (resourceName, filter) => {
    return (req, res, next) => {
      if (req.params[filter]) {
        this._nestedRouteFilter = { [resourceName]: req.params[filter] };
      } else {
        this._nestedRouteFilter = {};
      }
      next();
    };
  };

  _restrictedFieldsForUpdate = (obj, ...restrictedFields) => {
    let error = false;
    Object.keys(obj).forEach((el) => {
      if (restrictedFields.includes(el)) return (error = true);
    });
    return error;
  };

  createOne = catchAsync(async (req, res, next) => {
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

    const newDocument = await this._Model.create(createObjectBody);
    res.status(201).json({ status: "succes", data: { newDocument } });
  });

  getAllDocuments = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(
      this._Model.find({
        ...this._nestedRouteFilter,
        ...this._userRestriction,
        ...this._rolesRestriction,
      }),
      req.parsedQuery || req.query,
      this._ModelDefaultSortBy,
      this._allowedPopulatePaths
    )
      .populateFields()
      .filter()
      .sort()
      .limitFields();

    //*Features deep cloned by lodash, as the all documents count can be requested from DB server.
    // const cloneFeatures = _.cloneDeep(features);

    const docs = await features
      .paginate()
      .query.lean({ getters: true, virtuals: true });

    //*To backend pagination we need to sent all documents count to client. First we need to diagnosis if limited documents count is higer than all documents count requested from DB by client. If so not need to request a second query from DB server for all documents count.

    const combinedFilter = {
      ...this._nestedRouteFilter,
      ...this._userRestriction,
      ...this._rolesRestriction,
      ...features.filterQuery,
    };

    //* estimatedDocumentCount returns an estimation for the document count, the volue is not exact but the method is muchj faster than countDocuments. estimatedDocumentCount method shoul be used for big datas and when the exact count is not musch important (like if he value is used for pagination). But for small data counts countDocuments can be used. If the exact count is important countDocument method can be used with docs.length < +req.query.limit check.

    let allDocsCount = await this._Model.countDocuments(combinedFilter);
    // let allDocsCount = await this._Model.estimatedDocumentCount(combinedFilter);

    // if (docs.length < +req.query.limit) {
    //   //*If count of documents requested by client is lower than limited docoment count; all documents count is requested documents count.
    //   allDocsCount = docs.length;
    // } else {
    //   //*If count of documents requested by client is not lower than limited documents count; to find the all documents count sent a second request to DB server with deep clonned copy of features that instance os APIFeatures class.
    //   // allDocsCount = await cloneFeatures.query.countDocuments();
    //   allDocsCount = await this._Model.countDocuments({
    //     ...this._nestedRouteFilter,
    //     ...this._userRestriction,
    //   });
    // }

    res.status(200).json({
      status: "succes",
      allDocsNumber: allDocsCount,
      results: docs.length,
      data: { docs },
    });
  });

  getOne = catchAsync(async (req, res, next) => {
    const features = new APIFeatures(
      this._Model.findOne({
        _id: req.params.id,
        ...this._userRestriction,
      }),
      req.parsedQuery || req.query,
      _,
      this._allowedPopulatePaths
    ).populateFields();

    const doc = await features.query.lean({ getters: true, virtuals: true });

    if (!doc)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "noDocument"),
          404
        )
      );

    res.status(200).json({ status: "success", data: { doc } });
    next();
  });

  updateOne = catchAsync(async (req, res, next) => {
    const doc = await this._Model.findOne({
      _id: req.params.id,
      ...this._userRestriction,
      ...this._rolesRestriction,
    });

    if (!doc)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "noDocument"),
          404
        )
      );
    Object.assign(doc, req.body);
    await doc.save();
    res.status(200).json({ status: "success", data: { doc } });
  });

  deleteOne = catchAsync(async (req, res, next) => {
    const doc = await this._Model.findOneAndDelete({
      _id: req.params.id,
      ...this._userRestriction,
      ...this._rolesRestriction,
    });
    if (!doc)
      return next(
        new AppError(
          apiTranslation.translate(req.query.lang, "noDocument"),
          404
        )
      );
    res.status(204).json({ status: "success", data: null });
  });

  deleteAll = catchAsync(async (req, res, next) => {
    await this._Model.deleteMany({});
    res.status(204).json({ status: "success", data: null });
  });
}
