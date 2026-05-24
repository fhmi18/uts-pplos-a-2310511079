const { TimeSyncServer, TimeSyncClient } = require("../utils/timeSync");
const BookingServiceWithTimeSync = require("../services/bookingServiceWithTimeSync");

class BookingSystemSimulation {
  constructor() {
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
    console.log("  SIMULASI: SINKRONISASI WAKTU PADA SISTEM BOOKING KOS");
    console.log(
      "═══════════════════════════════════════════════════════════════\n",
    );

    // Inisialisasi Master Time Server
    this.masterTimeServer = new TimeSyncServer("Master Time Server (NTP)");
    console.log("✓ Master Time Server diinisialisasi\n");

    // Inisialisasi 3 Booking Services
    this.bookingService1 = new BookingServiceWithTimeSync(
      "Booking Service - Jakarta",
      this.masterTimeServer,
    );
    this.bookingService2 = new BookingServiceWithTimeSync(
      "Booking Service - Bandung",
      this.masterTimeServer,
    );
    this.bookingService3 = new BookingServiceWithTimeSync(
      "Booking Service - Surabaya",
      this.masterTimeServer,
    );

    this.services = [
      this.bookingService1,
      this.bookingService2,
      this.bookingService3,
    ];
  }

  /**
   * Scenario 1: Sync semua services dengan master
   */
  async scenario1_SyncAllServices() {
    console.log(
      "\n┌─ SKENARIO 1: Sinkronisasi Semua Services ─────────────────┐",
    );
    console.log(
      "│ Semua services melakukan sinkronisasi dengan master server │",
    );
    console.log(
      "└──────────────────────────────────────────────────────────────┘\n",
    );

    for (const service of this.services) {
      await service.syncTime();
      // Simulasi delay antar service
      await this.sleep(100);
    }
  }

  /**
   * Scenario 2: Multiple bookings dari berbagai services
   */
  scenario2_MultipleBookingsFromDifferentServices() {
    console.log(
      "\n┌─ SKENARIO 2: Multiple Bookings dari Berbagai Services ─────┐",
    );
    console.log(
      "│ Menciptakan bookings dari 3 services berbeda secara bersamaan │",
    );
    console.log(
      "└──────────────────────────────────────────────────────────────────┘\n",
    );

    try {
      // Service 1 - Jakarta
      const booking1 = this.bookingService1.createBooking(
        "USER001",
        "ROOM-JKT-101",
        "2026-05-25",
        "2026-05-27",
      );

      // Service 2 - Bandung
      const booking2 = this.bookingService2.createBooking(
        "USER002",
        "ROOM-BDG-205",
        "2026-05-25",
        "2026-05-28",
      );

      // Service 3 - Surabaya
      const booking3 = this.bookingService3.createBooking(
        "USER003",
        "ROOM-SBY-310",
        "2026-05-26",
        "2026-05-29",
      );

      console.log(
        "\n✓ Semua bookings berhasil dicatat dengan waktu tersinkronisasi",
      );

      return [booking1, booking2, booking3];
    } catch (error) {
      console.error("✗ Error:", error.message);
      return [];
    }
  }

  /**
   * Scenario 3: Konfirmasi booking dan tracking timeline
   */
  scenario3_ConfirmBookingsAndTrackTimeline(bookings) {
    console.log(
      "\n┌─ SKENARIO 3: Konfirmasi & Timeline Tracking ─────────────────┐",
    );
    console.log("│ Melacak semua events dengan timestamp yang konsisten │");
    console.log(
      "└────────────────────────────────────────────────────────────┘\n",
    );

    const timeline = [];

    for (const booking of bookings) {
      const service = this.services.find((s) =>
        s.bookings.some((b) => b.bookingId === booking.bookingId),
      );

      if (service) {
        try {
          // Confirm booking
          const confirmed = service.confirmBooking(
            booking.bookingId,
            "ADMIN001",
          );
          timeline.push({
            time: confirmed.confirmedAt,
            event: "BOOKING_CONFIRMED",
            bookingId: booking.bookingId,
            service: service.serviceName,
          });

          // Simulasi check-in setelah beberapa saat
          this.sleep(50); // Delay
          const checkedIn = service.checkInGuest(
            booking.bookingId,
            booking.userId,
          );
          timeline.push({
            time: checkedIn.checkInTime,
            event: "CHECK_IN",
            bookingId: booking.bookingId,
            service: service.serviceName,
          });

          // Simulasi check-out
          this.sleep(50); // Delay
          const checkedOut = service.checkOutGuest(booking.bookingId);
          timeline.push({
            time: checkedOut.checkOutTime,
            event: "CHECK_OUT",
            bookingId: booking.bookingId,
            service: service.serviceName,
            duration: `${checkedOut.stayDuration.hours} jam`,
          });
        } catch (error) {
          console.error("✗ Error:", error.message);
        }
      }
    }

    // Tampilkan timeline
    console.log(
      "\n📊 MASTER TIMELINE (Diurutkan berdasarkan waktu tersinkronisasi):",
    );
    console.log(
      "─────────────────────────────────────────────────────────────────",
    );

    timeline.sort((a, b) => new Date(a.time) - new Date(b.time));

    timeline.forEach((entry, index) => {
      console.log(`${index + 1}. [${entry.time}]`);
      console.log(`   Event: ${entry.event}`);
      console.log(`   Booking ID: ${entry.bookingId}`);
      console.log(`   Service: ${entry.service}`);
      if (entry.duration) {
        console.log(`   Duration: ${entry.duration}`);
      }
      console.log("");
    });

    return timeline;
  }

  /**
   * Scenario 4: Konsistensi data antar services
   */
  scenario4_DataConsistencyCheck() {
    console.log(
      "\n┌─ SKENARIO 4: Validasi Konsistensi Data ──────────────────────┐",
    );
    console.log("│ Memastikan semua services memiliki state konsisten │");
    console.log(
      "└───────────────────────────────────────────────────────────────┘\n",
    );

    console.log("📋 Status Sinkronisasi Setiap Service:\n");

    for (const service of this.services) {
      const report = service.getSyncReport();
      console.log(`Service: ${report.service}`);
      console.log(`  ├─ Is Synced: ${report.isSynced ? "✓ Yes" : "✗ No"}`);
      console.log(`  ├─ Time Offset: ${report.offset.toFixed(2)} ms`);
      console.log(`  ├─ Sync Valid: ${report.syncValid ? "✓ Yes" : "✗ No"}`);
      console.log(`  ├─ Current Synced Time: ${report.currentSyncedTime}`);
      console.log(`  └─ Total Bookings: ${service.getAllBookings().length}`);
      console.log("");
    }

    console.log(
      "✓ Semua services konsisten karena menggunakan master time server\n",
    );
  }

  /**
   * Scenario 5: Clock Skew Recovery
   */
  async scenario5_ClockSkewRecovery() {
    console.log(
      "\n┌─ SKENARIO 5: Pemulihan Clock Skew ────────────────────────────┐",
    );
    console.log("│ Simulasi ketika ada service yang clock-nya drift │");
    console.log(
      "└───────────────────────────────────────────────────────────────┘\n",
    );

    console.log(
      "Simulasi: Service Bandung mengalami clock drift (-500 ms)...\n",
    );

    // Simulasi clock drift dengan mengurangi offset
    this.bookingService2.timeClient.offset -= 500;
    console.log(
      `Clock Bandung sekarang: offset ${this.bookingService2.timeClient.offset.toFixed(2)} ms\n`,
    );

    console.log("Re-syncing Bandung Service...\n");
    await this.bookingService2.syncTime();

    console.log(
      "✓ Service Bandung berhasil di-recover ke state tersinkronisasi",
    );
  }

  /**
   * Helper: Sleep function
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate Summary Report
   */
  generateReport() {
    console.log(
      "\n╔═══════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║               LAPORAN RINGKAS SIMULASI                         ║",
    );
    console.log(
      "╚═══════════════════════════════════════════════════════════════╝\n",
    );

    console.log("📌 Konsep Utama:");
    console.log(
      "─────────────────────────────────────────────────────────────",
    );
    console.log("• Master Time Server: Sumber waktu otoritatif (NTP)");
    console.log("• Booking Services: Client yang sinkron dengan master");
    console.log("• Time Offset: Selisih waktu lokal dengan server");
    console.log("• RTT (Round Trip Time): Waktu request-response untuk sync");
    console.log("• Accuracy: Tingkat keakuratan sinkronisasi\n");

    console.log("✓ Manfaat Sinkronisasi Waktu:");
    console.log(
      "─────────────────────────────────────────────────────────────",
    );
    console.log("1. Konsistensi timestamp di seluruh sistem");
    console.log("2. Audit trail yang reliable untuk compliance");
    console.log("3. Conflict resolution yang deterministic");
    console.log("4. Mencegah race conditions dalam booking");
    console.log("5. Accurate billing dan duration calculation\n");

    console.log("📊 Total Bookings per Service:");
    console.log(
      "─────────────────────────────────────────────────────────────",
    );
    this.services.forEach((service) => {
      console.log(
        `• ${service.serviceName}: ${service.getAllBookings().length} bookings`,
      );
    });

    console.log("\n✓ Simulasi selesai!\n");
  }

  /**
   * Run semua scenarios
   */
  async runAllScenarios() {
    try {
      await this.scenario1_SyncAllServices();
      await this.sleep(500);

      const bookings = this.scenario2_MultipleBookingsFromDifferentServices();
      await this.sleep(500);

      this.scenario3_ConfirmBookingsAndTrackTimeline(bookings);
      await this.sleep(500);

      this.scenario4_DataConsistencyCheck();
      await this.sleep(500);

      await this.scenario5_ClockSkewRecovery();
      await this.sleep(500);

      this.generateReport();
    } catch (error) {
      console.error("Simulasi error:", error);
    }
  }
}

// Run simulasi
if (require.main === module) {
  const simulation = new BookingSystemSimulation();
  simulation.runAllScenarios();
}

module.exports = BookingSystemSimulation;
