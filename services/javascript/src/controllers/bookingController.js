const BookingModel = require("../models/bookingModel");

exports.getAllBookings = async (req, res) => {
  try {
    let bookings;
    if (req.user.role === "tenant") {
      bookings = await BookingModel.getAllBookingsByTenant(req.user.id);
    } else {
      bookings = await BookingModel.getAllBookings();
    }
    res.status(200).json({ status: "success", data: bookings });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = await BookingModel.getBookingById(req.params.id);

    if (!booking) {
      return res
        .status(404)
        .json({ status: "error", message: "Booking tidak ditemukan" });
    }

    // Proteksi: Tenant hanya bisa melihat detail booking-nya sendiri
    if (req.user.role === "tenant" && booking.tenant_id !== req.user.id) {
      return res
        .status(403)
        .json({ status: "error", message: "Akses ditolak" });
    }

    res.status(200).json({ status: "success", data: booking });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    if (req.user.role !== "tenant") {
      return res.status(403).json({
        status: "error",
        message: "Hanya tenant yang dapat membuat booking",
      });
    }

    const { propertyId, roomId, startDate, endDate, totalPrice, notes } =
      req.body;

    if (!propertyId || !roomId || !startDate || !endDate || !totalPrice) {
      return res
        .status(400)
        .json({ status: "error", message: "Data input tidak lengkap" });
    }

    const bookingData = {
      tenantId: req.user.id,
      propertyId,
      roomId,
      startDate,
      endDate,
      totalPrice,
      notes,
    };

    const newBookingId = await BookingModel.createBooking(bookingData);

    res.status(201).json({
      status: "success",
      message: "Booking berhasil dibuat",
      data: { id: newBookingId, ...bookingData, status: "pending" },
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!status && notes === undefined) {
      return res
        .status(400)
        .json({ status: "error", message: "Tidak ada data yang diupdate" });
    }

    const affectedRows = await BookingModel.updateBooking(
      req.params.id,
      status,
      notes,
    );

    if (affectedRows === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Booking tidak ditemukan" });
    }
    res.status(200).json({
      status: "success",
      message: `Booking ID: ${req.params.id} berhasil diperbarui`,
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const affectedRows = await BookingModel.cancelBooking(req.params.id);

    if (affectedRows === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Booking tidak ditemukan" });
    }
    res
      .status(200)
      .json({ status: "success", message: "Booking berhasil dibatalkan" });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
};

exports.checkAvailability = async (req, res) => {
  try {
    const { startDate, endDate, propertyId } = req.query;
    const { roomId } = req.params;

    if (!startDate || !endDate || !propertyId) {
      return res.status(400).json({
        status: "error",
        message:
          "Parameter startDate, endDate, dan propertyId wajib disertakan dalam query string",
      });
    }

    const BookingModel = require("../models/bookingModel");
    const isAvailable = await BookingModel.checkAvailability(
      roomId,
      startDate,
      endDate,
    );

    let roomDetails = null;
    try {
      const axios = require("axios");
      const propertyServiceUrl = `http://localhost:3002/api/property/${propertyId}/rooms/${roomId}`;
      const response = await axios.get(propertyServiceUrl);

      roomDetails = response.data.data;
    } catch (error) {
      console.error(
        "[Booking Service] Gagal mengambil detail kamar dari Service Property:",
        error.message,
      );
    }

    res.status(200).json({
      status: "success",
      message: `Pengecekan kamar ID ${roomId}`,
      isAvailable: isAvailable,
      room: roomDetails,
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
};
