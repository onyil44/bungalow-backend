"use strict";

import AppError from "../utils/appError.js";
import logger from "../utils/logger.js";

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  let message;
  if (err.keyValue) {
    message = `Duplicate field value: ${Object.keys(err.keyValue)
      .join(", ")
      .trim()}. Please use another value.`;
  } else {
    message = `Duplicate field error. Please check your request.`;
  }
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errorsMessages = Object.values(err.errors)
    .map((el) => el.message)
    .join(". ");
  const message = `Invalid input data. ${errorsMessages}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again.", 401);

const handleJETExpireError = () =>
  new AppError("Token expired. Please log in again.", 401);

const handleTooLargeFileUploadError = () =>
  new AppError("File is too large to upload!", 400);

const sendErrDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrProd = (err, res) => {
  if (err.isOperational) {
    res
      .status(err.statusCode)
      .json({ status: err.status, message: err.message });
  } else {
    res.status(500).json({ status: "error", message: "Something went wrong!" });
  }
};

export default (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (process.env.NODE_ENV === "development") {
    sendErrDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = JSON.parse(JSON.stringify(err));
    error.message = err.message; // Bu satır olmazsa err objectinin message propertysi kopyalanmadığı için production modda messagea ulaşılamıyor
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJETExpireError();
    if (err.code === "LIMIT_FILE_SIZE") error = handleTooLargeFileUploadError();
    sendErrProd(error, res);
  }
};
