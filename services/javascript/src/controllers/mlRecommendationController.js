const mlClient = require("../services/mlClient");
const { validationResult } = require("express-validator");

const recommendRoom = async (req, res) => {
  try {
    // Validasi request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }

    const { user_id, room_id, features } = req.body;

    // Validasi features wajib
    if (!features) {
      return res.status(400).json({
        success: false,
        message: "Features field is required",
        error: "Missing required field: features",
      });
    }

    // Validasi semua fitur wajib ada
    const requiredFeatures = [
      "price",
      "room_size_m2",
      "distance_to_campus_km",
      "has_wifi",
      "has_ac",
      "has_private_bathroom",
      "facility_count",
      "occupancy_rate",
      "user_budget",
    ];

    const missingFeatures = requiredFeatures.filter((f) => !(f in features));
    if (missingFeatures.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required features",
        missing_features: missingFeatures,
      });
    }

    // Prepare payload untuk Python ML Service
    const mlPayload = {
      price: parseFloat(features.price),
      room_size_m2: parseFloat(features.room_size_m2),
      distance_to_campus_km: parseFloat(features.distance_to_campus_km),
      has_wifi: parseInt(features.has_wifi),
      has_ac: parseInt(features.has_ac),
      has_private_bathroom: parseInt(features.has_private_bathroom),
      facility_count: parseInt(features.facility_count),
      occupancy_rate: parseFloat(features.occupancy_rate),
      user_budget: parseFloat(features.user_budget),
      user_id: user_id || null,
      room_id: room_id || null,
    };

    console.log(`[recommendRoom] Calling Python ML Service...`);
    console.log(`[recommendRoom] User ID: ${user_id}, Room ID: ${room_id}`);

    // Call Python ML Service
    const mlPrediction = await mlClient.predict(mlPayload);

    // Return combined response
    const response = {
      success: true,
      message: "Room recommendation prediction success",
      data: {
        user_id: user_id || null,
        room_id: room_id || null,
        input_features: features,
        ml_prediction: mlPrediction,
        source: {
          express_service: "javascript-service",
          python_service: "python-ml-service",
        },
        timestamp: new Date().toISOString(),
      },
    };

    console.log(`[recommendRoom] Success - Prediction: ${mlPrediction.label}`);
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[recommendRoom] Error:`, error.message);

    // Handle circuit breaker open
    if (error.isCircuitOpen) {
      return res.status(503).json({
        success: false,
        message: "Python ML Service is temporarily unavailable",
        error: "Circuit breaker open or ML service unreachable",
        circuit_breaker: {
          state: error.circuitState,
          failureCount: error.failureCount,
        },
      });
    }

    // Handle ML service error
    if (error.isMLServiceError) {
      return res.status(503).json({
        success: false,
        message: "Python ML Service error",
        error: error.message,
        circuit_breaker: {
          state: error.circuitState,
          failureCount: error.failureCount,
        },
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const checkMLHealth = async (req, res) => {
  try {
    const healthCheck = await mlClient.checkHealth();

    if (healthCheck.success) {
      return res.status(200).json({
        success: true,
        message: "ML Service is healthy",
        ml_service: healthCheck.data,
        circuit_breaker: mlClient.getCircuitStatus(),
      });
    } else {
      return res.status(503).json({
        success: false,
        message: "ML Service is unavailable",
        error: healthCheck.error,
        circuit_breaker: mlClient.getCircuitStatus(),
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error checking ML Service health",
      error: error.message,
    });
  }
};

const getCircuitStatus = (req, res) => {
  return res.status(200).json({
    success: true,
    circuit_breaker: mlClient.getCircuitStatus(),
  });
};

/**
 * POST /api/ml/predict
 *
 * Direct prediction endpoint - forward langsung ke Python ML Service
 * tanpa wrapper, hanya pass JSON yang sama dengan Python endpoint
 */
const directPredict = async (req, res) => {
  try {
    const payload = req.body;

    // Validasi minimal - harus ada semua fields
    const requiredFields = [
      "price",
      "room_size_m2",
      "distance_to_campus_km",
      "has_wifi",
      "has_ac",
      "has_private_bathroom",
      "facility_count",
      "occupancy_rate",
      "user_budget",
    ];

    const missingFields = requiredFields.filter((f) => !(f in payload));
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        missing_fields: missingFields,
      });
    }

    console.log(`[directPredict] Calling Python ML Service...`);

    // Forward langsung ke Python
    const prediction = await mlClient.predict(payload);

    console.log(`[directPredict] Success - Prediction: ${prediction.label}`);
    return res.status(200).json(prediction);
  } catch (error) {
    console.error(`[directPredict] Error:`, error.message);

    // Handle circuit breaker open
    if (error.isCircuitOpen) {
      return res.status(503).json({
        status: "error",
        message: "ML Service unavailable",
        details: "Circuit breaker open",
        circuit_breaker: {
          state: error.circuitState,
          failureCount: error.failureCount,
        },
      });
    }

    // Handle ML service error
    if (error.isMLServiceError) {
      return res.status(503).json({
        status: "error",
        message: "ML Service unavailable",
        details: error.message,
      });
    }

    // Handle other errors
    return res.status(500).json({
      status: "error",
      message: "Prediction error",
      details: error.message,
    });
  }
};

module.exports = {
  recommendRoom,
  directPredict,
  checkMLHealth,
  getCircuitStatus,
};
