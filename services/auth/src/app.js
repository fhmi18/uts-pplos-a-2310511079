const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("./config/database");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test Database Connection
app.get("/api/auth/health", async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query("SELECT 1");
    connection.release();

    res.status(200).json({
      status: "success",
      message: "Auth Service is running",
      database: "Connected to db_auth",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Auth Service] Running on port ${PORT}`);
  console.log(`[Auth Service] Environment: ${process.env.NODE_ENV}`);
});
