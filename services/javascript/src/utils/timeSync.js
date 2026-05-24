class TimeSyncServer {
  constructor(serverName = "Master Time Server") {
    this.serverName = serverName;
    this.baseTime = new Date();
    this.startTime = Date.now();
  }

  /**
   * Mendapatkan waktu server yang akurat (dalam ms sejak epoch)
   */
  getServerTime() {
    return Date.now();
  }

  /**
   * Memberikan waktu kepada client untuk sinkronisasi
   * Returns: { serverTime, timestamp }
   */
  sync() {
    return {
      serverTime: this.getServerTime(),
      timestamp: new Date().toISOString(),
      server: this.serverName,
    };
  }

  /**
   * Kalkulasi time offset (selisih waktu antara server dan client)
   */
  calculateOffset(clientTime, serverTime, clientReceiveTime) {
    // RTT (Round Trip Time) = waktu yang dibutuhkan untuk request-response
    const rtt = clientReceiveTime - clientTime;
    // Offset = (serverTime - clientTime) - (RTT / 2)
    const offset = serverTime - clientTime - rtt / 2;
    return {
      offset,
      rtt,
      accuracy: rtt / 2, // Akurasi dalam ms
    };
  }
}

class TimeSyncClient {
  constructor(clientName = "Service Client", syncInterval = 60000) {
    this.clientName = clientName;
    this.offset = 0; // Selisih waktu dengan server (ms)
    this.isSynced = false;
    this.lastSyncTime = null;
    this.syncInterval = syncInterval; // Sinkronisasi setiap 60 detik
    this.syncHistory = [];
  }

  /**
   * Sinkronisasi dengan time server
   */
  async syncWithServer(timeServer) {
    const clientSendTime = Date.now();

    // Simulasi request ke server
    const serverResponse = timeServer.sync();
    const clientReceiveTime = Date.now();

    // Hitung offset
    const syncResult = timeServer.calculateOffset(
      clientSendTime,
      serverResponse.serverTime,
      clientReceiveTime,
    );

    this.offset = syncResult.offset;
    this.isSynced = true;
    this.lastSyncTime = new Date();

    // Simpan history sinkronisasi
    this.syncHistory.push({
      timestamp: this.lastSyncTime.toISOString(),
      offset: this.offset,
      rtt: syncResult.rtt,
      accuracy: syncResult.accuracy,
    });

    return {
      client: this.clientName,
      synced: true,
      offset: this.offset,
      accuracy: syncResult.accuracy,
      syncTime: this.lastSyncTime.toISOString(),
    };
  }

  /**
   * Mendapatkan waktu yang sudah tersinkronisasi
   */
  getSyncedTime() {
    if (!this.isSynced) {
      console.warn(
        `[${this.clientName}] Warning: Client belum tersinkronisasi, menggunakan local time`,
      );
    }
    return Date.now() + this.offset;
  }

  /**
   * Mendapatkan waktu tersinkronisasi dalam format ISO
   */
  getSyncedTimeISO() {
    return new Date(this.getSyncedTime()).toISOString();
  }

  /**
   * Check apakah sinkronisasi masih valid (belum melampaui interval)
   */
  isSyncValid() {
    if (!this.isSynced || !this.lastSyncTime) return false;
    const timeSinceSync = Date.now() - this.lastSyncTime.getTime();
    return timeSinceSync < this.syncInterval;
  }

  /**
   * Ambil history sinkronisasi
   */
  getSyncHistory() {
    return this.syncHistory;
  }
}

module.exports = {
  TimeSyncServer,
  TimeSyncClient,
};
