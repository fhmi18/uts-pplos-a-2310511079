// services/booking/src/routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { verifyJWT } = require("../middleware/jwtMiddleware");

router.get("/room/:roomId/availability", bookingController.checkAvailability);

router.use(verifyJWT);

router.get("/", bookingController.getAllBookings);
router.get("/:id", bookingController.getBookingById);
router.post("/", bookingController.createBooking);
router.put("/:id", bookingController.updateBooking);
router.delete("/:id", bookingController.cancelBooking);

module.exports = router;
