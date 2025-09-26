"use strict";

import cabinsController from "../controllers/cabinsController.js";
import protect from "../middlewares/protect.js";

import express from "express";

const router = express.Router();

router.get("/", cabinsController.getAllDocuments);
router.get("/:id", cabinsController.getOne);

router.use(protect);

router
  .route("/reloadCabinsData")
  .post(
    cabinsController.restrictedTo("admin", "superAdmin"),
    cabinsController.reloadCabinsData
  );

router
  .route("/")
  .post(
    cabinsController.restrictedTo("admin", "superAdmin"),
    cabinsController.createOne
  )
  .delete(
    cabinsController.restrictedTo("admin", "superAdmin"),
    cabinsController.deleteAll
  );

router
  .route("/:id")
  .delete(
    cabinsController.restrictedTo("admin", "superAdmin"),
    cabinsController.deleteOne
  )
  .patch(
    cabinsController.restrictedTo("admin", "superAdmin"),
    cabinsController.uploadImages,
    cabinsController.resizeAndSaveImages,
    cabinsController.updateOne
  );

export default router;
