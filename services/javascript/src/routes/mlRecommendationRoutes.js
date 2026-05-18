const express = require("express");
const { body } = require("express-validator");
const mlRecommendationController = require("../controllers/mlRecommendationController");

const router = express.Router();

/**
 * POST /api/ml/predict
 *
 * Direct prediction endpoint - forward langsung ke Python ML Service
 * Accepts semua fields langsung tanpa wrapper
 */
router.post(
  "/predict",
  [
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a valid number"),
    body("room_size_m2")
      .isFloat({ min: 0 })
      .withMessage("Room size must be a valid number"),
    body("distance_to_campus_km")
      .isFloat({ min: 0 })
      .withMessage("Distance must be a valid number"),
    body("has_wifi")
      .isInt({ min: 0, max: 1 })
      .withMessage("has_wifi must be 0 or 1"),
    body("has_ac")
      .isInt({ min: 0, max: 1 })
      .withMessage("has_ac must be 0 or 1"),
    body("has_private_bathroom")
      .isInt({ min: 0, max: 1 })
      .withMessage("has_private_bathroom must be 0 or 1"),
    body("facility_count")
      .isInt({ min: 0 })
      .withMessage("facility_count must be a valid integer"),
    body("occupancy_rate")
      .isFloat({ min: 0, max: 1 })
      .withMessage("occupancy_rate must be between 0 and 1"),
    body("user_budget")
      .isFloat({ min: 0 })
      .withMessage("User budget must be a valid number"),
  ],
  mlRecommendationController.directPredict,
);

/**
 * POST /api/ml/recommend-room
 *
 * Room recommendation endpoint dengan wrapper
 * Untuk app internal yang perlu user_id dan room_id
 */
router.post(
  "/recommend-room",
  [
    // Validasi input
    body("features").notEmpty().withMessage("Features field is required"),
    body("features.price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a valid number"),
    body("features.room_size_m2")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Room size must be a valid number"),
    body("features.distance_to_campus_km")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Distance must be a valid number"),
    body("features.user_budget")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("User budget must be a valid number"),
  ],
  mlRecommendationController.recommendRoom,
);

/**
 * GET /api/ml/health
 *
 * Check health status of Python ML Service
 * dan circuit breaker status
 */
router.get("/health", mlRecommendationController.checkMLHealth);

/**
 * GET /api/ml/circuit-status
 *
 * Get current circuit breaker status
 */
router.get("/circuit-status", mlRecommendationController.getCircuitStatus);

module.exports = router;
