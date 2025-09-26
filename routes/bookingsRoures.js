import express from "express";

import bookingsController from "../controllers/bookingsController.js";
import protect from "../middlewares/protect.js";

const router = express.Router();

router.route("/bookingFromPnr").get(bookingsController.getBookingFromPnr);

router
  .route("/getOccupaidDays/:cabinId")
  .get(bookingsController.getCabinOccupaidDays);

router.post("/", bookingsController.createNewBooking);

router.use(protect);
router
  .route("/reloadBookingsData")
  .post(
    bookingsController.restrictedTo("admin", "superAdmin"),
    bookingsController.reloadBookingsData
  );

router
  .route("/")
  .get(bookingsController.getAllDocuments)
  .delete(bookingsController.deleteAll);

router.route("/getDailyStats").get(bookingsController.getDailyBookingStats);

router
  .route("/:id")
  .get(bookingsController.getOne)
  .patch(bookingsController.updateOne)
  .delete(bookingsController.deleteOne);

export default router;
