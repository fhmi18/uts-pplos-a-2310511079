const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { verifyJWT } = require("../middleware/jwtMiddleware");

router.use(verifyJWT);

router.post("/booking/:bookingId", paymentController.createPayment);
router.get("/:paymentId", paymentController.getPaymentDetail);
router.put("/:paymentId/status", paymentController.updatePaymentStatus);

module.exports = router;
