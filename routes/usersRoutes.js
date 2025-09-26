import express from "express";

import usersController from "../controllers/usersController.js";
import protect from "../middlewares/protect.js";

const router = express.Router();

router
  .route("/resetUserPassword/:userId")
  .patch(
    protect,
    usersController.restrictedTo("superAdmin", "admin"),
    usersController.resetUserPassword
  );

router
  .route("/")
  .post(
    protect,
    usersController.restrictedTo("superAdmin", "admin"),
    usersController.createNewUser
  )
  .get(
    protect,
    usersController.restrictedTo("superAdmin", "admin", "manager"),
    usersController.setRolesRestriction,
    usersController.getAllDocuments
  );

router.route("/me").get(protect, usersController.getMe);

router
  .route("/:id")
  .patch(
    protect,
    usersController.restrictedTo("admin", "superAdmin"),
    usersController.setRolesRestriction,
    usersController.updateUser
  )
  .delete(
    protect,
    usersController.restrictedTo("admin", "superAdmin"),
    usersController.protectUserToDelete,
    usersController.deleteOne
  );

export default router;
