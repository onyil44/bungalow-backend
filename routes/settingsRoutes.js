import express from "express";

import settingsController from "../controllers/settngsController.js";
import protect from "../middlewares/protect.js";

const router = express.Router();

router.get("/", settingsController.getAllDocuments);

router.use(protect);

router.use(settingsController.restrictedTo("admin", "superAdmin", "manager"));

router
  .route("/")

  .post(settingsController.createOne)
  .delete(settingsController.deleteInactiveSettings);

export default router;
