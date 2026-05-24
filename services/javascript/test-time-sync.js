const BookingSystemSimulation = require("./src/simulation/bookingTimeSync.simulation");

console.log("\n");
console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║  TEST: SINKRONISASI WAKTU PADA SISTEM BOOKING KOS          ║");
console.log("║  Case Study Implementation: Synchronize Clock and Time    ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

// Inisialisasi dan jalankan simulasi
async function main() {
  const simulation = new BookingSystemSimulation();
  await simulation.runAllScenarios();
}

main().catch((err) => {
  console.error("Error during simulation:", err);
  process.exit(1);
});
