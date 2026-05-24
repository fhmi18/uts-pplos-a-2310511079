const { TimeSyncClient } = require("../utils/timeSync");

class BookingServiceWithTimeSync {
  constructor(serviceName = "Booking Service", timeServer = null) {
    this.serviceName = serviceName;
    this.timeServer = timeServer;
    this.timeClient = new TimeSyncClient(serviceName);
    this.bookings = []; // Database bookings
    this.bookingIdCounter = 1000;
  }

  /* Sinkronisasi waktu dengan server */
  async syncTime() {
    if (!this.timeServer) {
      console.warn(`[${this.serviceName}] Time server tidak tersedia`);
      return null;
    }

    const result = await this.timeClient.syncWithServer(this.timeServer);
    console.log(`✓ ${this.serviceName} tersinkronisasi:`, result);
    return result;
  }

  /* Buat booking baru dengan timestamp yang tersinkronisasi */
  createBooking(userId, roomId, checkInDate, checkOutDate) {
    if (!this.timeClient.isSynced) {
      throw new Error(
        `[${this.serviceName}] Service belum tersinkronisasi dengan time server`,
      );
    }

    const bookingId = ++this.bookingIdCounter;
    const now = this.timeClient.getSyncedTime();
    const nowISO = this.timeClient.getSyncedTimeISO();

    const booking = {
      bookingId,
      userId,
      roomId,
      checkInDate,
      checkOutDate,
      createdAt: nowISO, // Menggunakan waktu tersinkronisasi
      createdAtMs: now,
      status: "PENDING",
      version: 1,
    };

    this.bookings.push(booking);

    console.log(`\n📅 Booking dibuat:`, {
      bookingId: booking.bookingId,
      userId: booking.userId,
      roomId: booking.roomId,
      createdAt: booking.createdAt,
      service: this.serviceName,
    });

    return booking;
  }

  /* Confirm booking (simulasi proses bisnis) */
  confirmBooking(bookingId, adminId) {
    const booking = this.bookings.find((b) => b.bookingId === bookingId);

    if (!booking) {
      throw new Error(`Booking dengan ID ${bookingId} tidak ditemukan`);
    }

    const now = this.timeClient.getSyncedTime();
    const confirmTime = new Date(now).toISOString();

    booking.status = "CONFIRMED";
    booking.confirmedAt = confirmTime;
    booking.confirmedAtMs = now;
    booking.confirmedBy = adminId;
    booking.version++;

    console.log(`✓ Booking dikonfirmasi pada ${confirmTime}`);
    return booking;
  }

  /* Check-in guest */
  checkInGuest(bookingId, guestId) {
    const booking = this.bookings.find((b) => b.bookingId === bookingId);

    if (!booking) {
      throw new Error(`Booking dengan ID ${bookingId} tidak ditemukan`);
    }

    const now = this.timeClient.getSyncedTime();
    const checkInTime = new Date(now).toISOString();

    booking.status = "CHECKED_IN";
    booking.checkInTime = checkInTime;
    booking.checkInTimeMs = now;
    booking.checkedInBy = guestId;
    booking.version++;

    console.log(`✓ Guest ${guestId} check-in pada ${checkInTime}`);
    return booking;
  }

  /* Check-out guest */
  checkOutGuest(bookingId) {
    const booking = this.bookings.find((b) => b.bookingId === bookingId);

    if (!booking) {
      throw new Error(`Booking dengan ID ${bookingId} tidak ditemukan`);
    }

    const now = this.timeClient.getSyncedTime();
    const checkOutTime = new Date(now).toISOString();

    booking.status = "CHECKED_OUT";
    booking.checkOutTime = checkOutTime;
    booking.checkOutTimeMs = now;
    booking.version++;

    // Hitung durasi menginap
    const checkInMs = booking.checkInTimeMs;
    const durationMs = now - checkInMs;
    const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);

    console.log(
      `✓ Guest check-out pada ${checkOutTime} (durasi: ${durationHours} jam)`,
    );

    return {
      ...booking,
      stayDuration: {
        ms: durationMs,
        hours: parseFloat(durationHours),
      },
    };
  }

  /* Dapatkan info booking */
  getBooking(bookingId) {
    return this.bookings.find((b) => b.bookingId === bookingId);
  }

  /* Dapatkan semua bookings */
  getAllBookings() {
    return this.bookings;
  }

  /* Laporan sinkronisasi waktu */
  getSyncReport() {
    return {
      service: this.serviceName,
      isSynced: this.timeClient.isSynced,
      lastSyncTime: this.timeClient.lastSyncTime?.toISOString(),
      offset: this.timeClient.offset,
      syncValid: this.timeClient.isSyncValid(),
      syncHistory: this.timeClient.getSyncHistory(),
      currentSyncedTime: this.timeClient.getSyncedTimeISO(),
    };
  }
}

module.exports = BookingServiceWithTimeSync;
