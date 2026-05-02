const PaymentModel = require("../models/paymentModel");
const BookingModel = require("../models/bookingModel");
const axios = require("axios");

exports.createPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { amount, paymentDate, paymentMethod, referenceNumber, notes } =
      req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== "tenant") {
      return res.status(403).json({
        status: "error",
        message: "Hanya tenant yang dapat membuat pembayaran",
      });
    }

    const validPaymentMethods = ["transfer", "cash", "card", "e-wallet"];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      return res.status(422).json({
        status: "error",
        message:
          "Metode pembayaran harus berupa 'transfer', 'cash', 'card', atau 'e-wallet'",
      });
    }

    const booking = await BookingModel.getBookingById(bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ status: "error", message: "Booking tidak ditemukan" });
    }

    if (booking.tenant_id !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak: Anda tidak berhak membayar pesanan ini",
      });
    }

    const paymentId = await PaymentModel.createPayment({
      bookingId,
      tenantId: userId,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes,
    });

    res.status(201).json({
      status: "success",
      message:
        "Data pembayaran berhasil dicatat dan sedang menunggu konfirmasi",
      data: { paymentId },
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
};

exports.getPaymentDetail = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await PaymentModel.getPaymentById(paymentId);
    if (!payment)
      return res
        .status(404)
        .json({ status: "error", message: "Payment tidak ditemukan" });

    const historyLog = await PaymentModel.getPaymentHistoryLog(paymentId);
    payment.history_log = historyLog;

    let tenantProfile = null;
    try {
      const authResponse = await axios.get(
        `http://localhost:3001/api/auth/users/${payment.tenant_id}`,
      );
      tenantProfile = authResponse.data.data;
    } catch (error) {
      console.log(
        `[Warning] Gagal mengambil data user (ID: ${payment.tenant_id}) dari Auth Service`,
      );
    }
    res.status(200).json({
      status: "success",
      data: {
        ...payment,
        tenant_info: tenantProfile,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;
    const userRole = req.user.role;

    if (userRole !== "owner") {
      return res.status(403).json({
        status: "error",
        message:
          "Akses ditolak: Hanya owner yang dapat mengubah status pembayaran",
      });
    }

    if (!["pending", "success", "failed"].includes(status)) {
      return res.status(422).json({
        status: "error",
        message: "Status harus bernilai 'pending', 'success', atau 'failed'",
      });
    }

    const currentPayment = await PaymentModel.getPaymentById(paymentId);
    if (!currentPayment) {
      return res
        .status(404)
        .json({ status: "error", message: "Payment tidak ditemukan" });
    }

    if (currentPayment.status === status) {
      return res.status(400).json({
        status: "error",
        message: `Pembayaran sudah berstatus ${status}`,
      });
    }

    await PaymentModel.updatePaymentStatus(
      paymentId,
      currentPayment.status,
      status,
    );

    if (status === "success") {
      await BookingModel.updateBooking(currentPayment.booking_id, "active");
    }

    res.status(200).json({
      status: "success",
      message: `Status pembayaran berhasil diubah menjadi ${status}`,
    });
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
};
