const { TimeSyncClient } = require("./timeSync");

// Inisialisasi client sinkronisasi waktu secara global
const globalTimeClient = new TimeSyncClient("Express Booking Service Client");

// Catatan: Anda perlu memanggil fungsi async `globalTimeClient.syncWithServer(masterServer)`
// pada saat inisialisasi aplikasi (misal di app.js / index.js) agar waktu sinkron saat server menyala.

module.exports = globalTimeClient;
