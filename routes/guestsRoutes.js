"use strict";

import express from "express";

import guestsController from "../controllers/guestsController.js";
import protect from "../middlewares/protect.js";

const router = express.Router();

router.route("/reloadGuestsData").post(guestsController.reloadGuestsData);

router
  .route("/")
  .get(guestsController.getAllDocuments)
  .post(guestsController.createGuest);

router.use(protect);

router.route("/").delete(guestsController.deleteAll);

router
  .route("/:id")
  .get(guestsController.getOne)
  .patch(guestsController.updateOne)
  .delete(guestsController.deleteOne);

export default router;
