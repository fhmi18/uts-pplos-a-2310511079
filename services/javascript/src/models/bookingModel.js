const db = require("../config/database");

const BookingModel = {
  getAllBookingsByTenant: async (tenantId) => {
    const [rows] = await db.query(
      "SELECT * FROM bookings WHERE tenant_id = ? ORDER BY created_at DESC",
      [tenantId],
    );
    return rows;
  },

  getAllBookings: async () => {
    const [rows] = await db.query(
      "SELECT * FROM bookings ORDER BY created_at DESC",
    );
    return rows;
  },

  getBookingById: async (id) => {
    const [rows] = await db.query("SELECT * FROM bookings WHERE id = ?", [id]);
    return rows[0];
  },

  createBooking: async (data) => {
    const {
      tenantId,
      propertyId,
      roomId,
      startDate,
      endDate,
      totalPrice,
      notes,
    } = data;
    const [result] = await db.query(
      "INSERT INTO bookings (tenant_id, property_id, room_id, start_date, end_date, total_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        tenantId,
        propertyId,
        roomId,
        startDate,
        endDate,
        totalPrice,
        notes || null,
      ],
    );
    return result.insertId;
  },

  updateBooking: async (id, status, notes) => {
    let updateQuery = "UPDATE bookings SET ";
    let params = [];
    let updates = [];

    if (status) {
      updates.push("status = ?");
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push("notes = ?");
      params.push(notes);
    }

    updateQuery += updates.join(", ") + " WHERE id = ?";
    params.push(id);

    const [result] = await db.query(updateQuery, params);
    return result.affectedRows;
  },

  cancelBooking: async (id) => {
    const [result] = await db.query(
      'UPDATE bookings SET status = "cancelled" WHERE id = ?',
      [id],
    );
    return result.affectedRows;
  },

  checkAvailability: async (roomId, startDate, endDate) => {
    const [rows] = await db.query(
      `SELECT COUNT(*) as count FROM bookings 
             WHERE room_id = ? 
             AND status != 'cancelled'
             AND (
                 (start_date <= ? AND end_date >= ?) OR
                 (start_date <= ? AND end_date >= ?) OR
                 (start_date >= ? AND end_date <= ?)
             )`,
      [roomId, endDate, startDate, startDate, endDate, startDate, endDate],
    );
    return rows[0].count === 0;
  },
};

module.exports = BookingModel;
