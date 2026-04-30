const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./config/database");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/api/booking/health", async (req, res) => {
  try {
    const connection = await db.getConnection();
    await connection.query("SELECT 1");
    connection.release();
    res
      .status(200)
      .json({ status: "success", message: "Booking Service is running" });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Database connection failed" });
  }
});

// Routes
app.use("/api/booking", bookingRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`[Booking Service] Running on port ${PORT}`);
  console.log(`[Booking Service] Environment: ${process.env.NODE_ENV}`);
});
