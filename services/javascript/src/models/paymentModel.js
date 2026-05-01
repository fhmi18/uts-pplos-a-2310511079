const db = require("../config/database");

const PaymentModel = {
  createPayment: async (data) => {
    const {
      bookingId,
      tenantId,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes,
    } = data;
    const query = `INSERT INTO payments 
                       (booking_id, tenant_id, amount, payment_date, payment_method, reference_number, notes) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const [result] = await db.query(query, [
      bookingId,
      tenantId,
      amount,
      paymentDate || new Date(),
      paymentMethod || "transfer",
      referenceNumber || null,
      notes || null,
    ]);
    return result.insertId;
  },

  getPaymentsByBookingId: async (bookingId) => {
    const query = `SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC`;
    const [rows] = await db.query(query, [bookingId]);
    return rows;
  },

  getPaymentById: async (paymentId) => {
    const query = `SELECT * FROM payments WHERE id = ?`;
    const [rows] = await db.query(query, [paymentId]);
    return rows[0];
  },

  updatePaymentStatus: async (paymentId, oldStatus, newStatus) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(`UPDATE payments SET status = ? WHERE id = ?`, [
        newStatus,
        paymentId,
      ]);

      await connection.query(
        `INSERT INTO payment_history (payment_id, old_status, new_status) VALUES (?, ?, ?)`,
        [paymentId, oldStatus, newStatus],
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  getPaymentHistoryLog: async (paymentId) => {
    const query = `SELECT * FROM payment_history WHERE payment_id = ? ORDER BY changed_at DESC`;
    const [rows] = await db.query(query, [paymentId]);
    return rows;
  },
};

module.exports = PaymentModel;
