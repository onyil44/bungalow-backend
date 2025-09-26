import fs from "node:fs";

import multer from "multer";

import { __dirname } from "../utils/path.js";

import CabinsModel from "../models/cabinsModel.js";
import ApiController from "./apiController.js";
import AppError from "../utils/appError.js";
import apiTranslation from "../utils/apiTranslation.js";
import catchAsync from "../utils/catchAsync.js";
import sharp from "sharp";

import { cabins } from "../restore/data-cabins.js";

class CabinsController extends ApiController {
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

  constructor() {
    super();
    this._Model = CabinsModel;
    this._ModelDefaultSortBy = "name";
  }

  // this._upload.single('image')
  // this._upload.array('images',5)

  // uploadTourImages = this._upload.fields([
  //   { name: "imageCover", maxCount: 1 },
  //   { name: "images", maxCount: 3 },
  // ]);

  uploadImages = this._upload.array("images", 5);

  resizeAndSaveImages = catchAsync(async (req, res, next) => {
    if (!req.files) return next();

    req.body.images = [];

    const dir = `/app/data/imgs/cabins`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    for (const [i, file] of req.files.entries()) {
      const fileName = `cabin_image-${req.params.id}-${Date.now()}-${i}.jpeg`;

      try {
        await sharp(file.buffer)
          .resize({ width: 1024, height: 576, fit: "contain" })
          .toFormat("jpeg")
          .jpeg({ quality: 90 })
          .toFile(`${dir}/${fileName}`);

        req.body.images.push(`/imgs/cabins/${fileName}`);
      } catch (err) {
        console.error(`Image processing failed for ${file.originalname}`, err);
      }
    }

    req.body.image = req.body.images[0];

    next();
  });

  reloadCabinsData = catchAsync(async (req, res, next) => {
    const restoredCabins = cabins;
    await this._Model.deleteMany({});
    await this._Model.create(restoredCabins);

    res.status(201).json({ status: "success", message: "Cabins restored." });
  });
}

export default new CabinsController();
