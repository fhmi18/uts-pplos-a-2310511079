const { body, validationResult } = require("express-validator");
const ApiResponse = require("./apiResponse");

/**
 * Middleware untuk handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // express-validator v7 menggunakan 'path' bukan 'param'.
    // Map manual agar fungsi format pada ApiResponse tetap bisa membacanya dengan baik.
    const formattedErrors = errors.array().map((err) => ({
      ...err,
      param: err.path || err.param,
    }));
    return ApiResponse.validationError(res, formattedErrors);
  }
  next();
};

/**
 * Validation rules untuk Booking
 */
const bookingValidationRules = () => [
  body("room_id")
    .isInt({ min: 1 })
    .withMessage("room_id harus berupa angka positif"),
  body("check_in_date")
    .isISO8601()
    .withMessage("check_in_date harus format tanggal yang valid (ISO8601)"),
  body("check_out_date")
    .isISO8601()
    .withMessage("check_out_date harus format tanggal yang valid (ISO8601)")
    .custom((value, { req }) => {
      const checkIn = new Date(req.body.check_in_date);
      const checkOut = new Date(value);
      if (checkOut <= checkIn) {
        throw new Error("check_out_date harus lebih akhir dari check_in_date");
      }
      return true;
    }),
  body("number_of_guests")
    .isInt({ min: 1 })
    .withMessage("number_of_guests harus angka positif minimal 1"),
  body("total_price")
    .isFloat({ min: 0 })
    .withMessage("total_price harus angka positif"),
  body("special_requests")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("special_requests maksimal 500 karakter"),
];

/**
 * Validation rules untuk Payment
 */
const paymentValidationRules = () => [
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("amount harus angka positif minimal 0.01"),
  body("paymentDate")
    .optional()
    .isISO8601()
    .withMessage("paymentDate harus format tanggal yang valid"),
  body("paymentMethod")
    .isIn(["transfer", "cash", "card", "e-wallet"])
    .withMessage(
      "paymentMethod harus salah satu dari: transfer, cash, card, e-wallet",
    ),
  body("referenceNumber")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("referenceNumber harus antara 1-100 karakter"),
  body("notes")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("notes maksimal 500 karakter"),
];

/**
 * Validation rules untuk Update Booking Status
 */
const updateBookingStatusValidationRules = () => [
  body("status")
    .isIn(["pending", "confirmed", "cancelled"])
    .withMessage("status harus salah satu dari: pending, confirmed, cancelled"),
];

/**
 * Validation rules untuk Update Payment Status
 */
const updatePaymentStatusValidationRules = () => [
  body("status")
    .isIn(["pending", "paid", "failed", "refunded"])
    .withMessage(
      "status harus salah satu dari: pending, paid, failed, refunded",
    ),
];

module.exports = {
  handleValidationErrors,
  bookingValidationRules,
  paymentValidationRules,
  updateBookingStatusValidationRules,
  updatePaymentStatusValidationRules,
};
