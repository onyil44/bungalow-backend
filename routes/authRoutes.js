import express from "express";

import authController from "../controllers/authController.js";
import protect from "../middlewares/protect.js";

const router = express.Router();

router.route("/login").post(authController.login);

router
  .route("/receptionistAutoLogin")
  .post(authController.autoLogin, authController.login);
router
  .route("/managerAutoLogin")
  .post(authController.autoLogin, authController.login);

router
  .route("/createNewPasswordAndActivateUser/:token")
  .patch(authController.createNewPasswordAndActivateUser);

router.route("/token").post(authController.refreshAccessToken);

router.route("/logout").post(authController.logout);

router
  .route("/updateMe")
  .patch(
    protect,
    authController.restrictedTo("admin", "superAdmin"),
    authController.uploadImages,
    authController.resizeAndSaveImages,
    authController.updateMe
  );

router
  .route("/updatePassword")
  .patch(
    protect,
    authController.restrictedTo("admin", "superAdmin"),
    authController.updatePassword
  );

export default router;
