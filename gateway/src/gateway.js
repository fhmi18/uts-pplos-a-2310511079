const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const {
  createProxyMiddleware,
  fixRequestBody,
} = require("http-proxy-middleware");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Verification Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    // Beberapa endpoint tidak memerlukan token (login, register, oauth)
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }
};

app.use(verifyToken);

// Health Check Endpoint
app.get("/api/gateway/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API Gateway is running",
    timestamp: new Date().toISOString(),
  });
});

app.use(
  "/api/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
    changeOrigin: true,
    logLevel: "debug",
    onProxyReq: fixRequestBody,
    onError: (err, req, res) => {
      console.error("[Gateway] Auth Service Error:", err.message);
      res.status(503).json({
        status: "error",
        message: "Auth Service unavailable",
        details: err.message,
      });
    },
  }),
);

app.use(
  "/api/property",
  createProxyMiddleware({
    target: process.env.PROPERTY_SERVICE_URL || "http://localhost:3002",
    changeOrigin: true,
    logLevel: "debug",
    onProxyReq: fixRequestBody,
    onError: (err, req, res) => {
      console.error("[Gateway] Property Service Error:", err.message);
      res.status(503).json({
        status: "error",
        message: "Property Service unavailable",
        details: err.message,
      });
    },
  }),
);

app.use(
  "/api/booking",
  createProxyMiddleware({
    target: process.env.BOOKING_SERVICE_URL || "http://localhost:3003",
    changeOrigin: true,
    logLevel: "debug",
    onError: (err, req, res) => {
      console.error("[Gateway] Booking Service Error:", err.message);
      res.status(503).json({
        status: "error",
        message: "Booking Service unavailable",
        details: err.message,
      });
    },
  }),
);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("[Gateway] Error:", err);
  res.status(500).json({
    status: "error",
    message: "Internal Gateway Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`\n[API Gateway] Running on port ${PORT}`);
  console.log(`[API Gateway] Environment: ${process.env.NODE_ENV}`);
  console.log(`\n[Gateway Routing Map]`);
  console.log(
    `  /api/auth      -> ${process.env.AUTH_SERVICE_URL || "http://localhost:3001"}`,
  );
  console.log(
    `  /api/property  -> ${process.env.PROPERTY_SERVICE_URL || "http://localhost:3002"}`,
  );
  console.log(
    `  /api/booking   -> ${process.env.BOOKING_SERVICE_URL || "http://localhost:3003"}`,
  );
  console.log(
    `\n[Health Check] GET http://localhost:${PORT}/api/gateway/health\n`,
  );
});
