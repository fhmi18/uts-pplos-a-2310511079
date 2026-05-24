# LAPORAN STUDI KASUS: SINKRONISASI WAKTU PADA SISTEM BOOKING KOS

**Mata Kuliah:** Komputasi Paralel dan Terdistribusi
**Topik:** Synchronize Clock and Time  
**Tanggal:** 24 Mei 2026  
**NIM:** 2310511079,2310511069,2310511066,2310511053

---

## 1. PENDAHULUAN

### 1.1 Latar Belakang

Dalam sistem terdistribusi yang kompleks, sinkronisasi waktu menjadi hal yang sangat kritis. Ketika sebuah aplikasi berjalan di multiple services (microservices) yang tersebar di lokasi geografis berbeda, setiap service memiliki local clock yang mungkin tidak sepenuhnya akurat atau konsisten satu sama lain.

Untuk studi kasus ini, kami memilih **Sistem Booking Kos (Room Booking System)** yang merupakan aplikasi nyata di lingkungan distributed system. Sistem ini memiliki:

- **Booking Service di Jakarta**: Menangani booking untuk properti di area Jakarta
- **Booking Service di Bandung**: Menangani booking untuk properti di area Bandung
- **Booking Service di Surabaya**: Menangani booking untuk properti di area Surabaya

Setiap service berjalan di data center berbeda dan memiliki local clock-nya sendiri.

### 1.2 Masalah

Tanpa sinkronisasi waktu yang tepat, sistem akan menghadapi masalah:

1. **Timestamp Inconsistency**: Dua event yang seharusnya terjadi secara berurutan mungkin tercatat dengan urutan terbalik
2. **Billing Issues**: Perhitungan durasi menginap menjadi tidak akurat
3. **Audit Trail Problem**: Sulitnya melacak sequence of events untuk compliance
4. **Race Conditions**: Booking yang bersamaan dari service berbeda sulit di-resolve
5. **Data Integrity**: Konflik data yang tidak dapat diprediksi

### 1.3 Solusi

Kami mengimplementasikan **Network Time Protocol (NTP)** style clock synchronization untuk memastikan semua services menggunakan waktu yang sama.

---

## 2. KONSEP SYNCHRONIZE CLOCK AND TIME

### 2.1 Definisi

**Synchronize Clock and Time** adalah mekanisme untuk menjaga agar clock pada berbagai komputer/proses dalam sistem terdistribusi tetap sinkron satu dengan lainnya, sehingga waktu yang digunakan untuk timestamping events adalah akurat dan konsisten.

### 2.2 Tantangan Sinkronisasi Waktu

1. **Clock Drift**: Setiap clock akan drift dari waktu yang sebenarnya
2. **Faulty Clocks**: Beberapa clock mungkin tidak berfungsi dengan baik
3. **Unpredictable Delays**: Network latency membuat sinkronisasi tidak instant
4. **Byzantine Clock**: Clock yang memberikan informasi yang salah atau tidak konsisten

### 2.3 Algoritma yang Digunakan

Kami menggunakan adaptasi dari **Berkeley Algorithm** dan **NTP (Network Time Protocol)**:

#### Langkah-langkah:

1. **Master Server** menjadi sumber waktu yang authoritative
2. **Client Services** secara periodik melakukan query ke master server
3. **Offset Calculation**: Client menghitung selisih waktu (offset) dengan master
4. **RTT Measurement**: Mengukur Round Trip Time untuk estimasi latency
5. **Clock Adjustment**: Setiap client menyesuaikan clock-nya dengan offset yang dihitung

---

## 3. IMPLEMENTASI

### 3.1 Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│     ┌──────────────────────────────────────────┐         │
│     │    Master Time Server (NTP)               │         │
│     │  - Authoritative Time Source             │         │
│     │  - Provides sync() method                │         │
│     │  - Calculates offset & RTT              │         │
│     └──────────────────────────────────────────┘         │
│                    │                                      │
│        ┌───────────┼───────────┐                         │
│        │           │           │                         │
│        ▼           ▼           ▼                         │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│   │ Booking │ │ Booking │ │ Booking │                   │
│   │Service  │ │Service  │ │Service  │                   │
│   │Jakarta  │ │Bandung  │ │Surabaya │                   │
│   └─────────┘ └─────────┘ └─────────┘                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Komponen Utama

#### A. TimeSyncServer (Master Time Server)

```javascript
class TimeSyncServer {
  - getServerTime()      // Dapatkan waktu server (ms)
  - sync()              // Response untuk sync request
  - calculateOffset()   // Hitung offset client
}
```

**Fungsi:**

- Menjadi sumber waktu yang akurat (System.currentTimeMillis())
- Merespons sync request dari clients
- Menghitung offset berdasarkan RTT

#### B. TimeSyncClient (Booking Service)

```javascript
class TimeSyncClient {
  - offset              // Selisih waktu dengan server
  - isSynced            // Status sinkronisasi
  - syncWithServer()    // Sinkronisasi dengan master
  - getSyncedTime()     // Dapatkan waktu tersinkronisasi
  - isSyncValid()       // Check apakah masih valid
  - syncHistory         // History sinkronisasi
}
```

**Fungsi:**

- Maintain local offset dengan master
- Menyediakan getSyncedTime() untuk digunakan aplikasi
- Track history sinkronisasi untuk debugging

#### C. BookingServiceWithTimeSync

```javascript
class BookingServiceWithTimeSync {
  - createBooking()      // Buat booking dengan sync time
  - confirmBooking()     // Confirm dengan sync time
  - checkInGuest()       // Check-in dengan sync time
  - checkOutGuest()      // Check-out dengan sync time
  - getSyncReport()      // Laporan status sinkronisasi
}
```

**Fungsi:**

- Mengintegrasikan time sync ke business logic
- Memastikan semua timestamps menggunakan synchronized time
- Menyimpan audit trail yang accurate

### 3.3 Offset Calculation Formula

```
RTT = client_receive_time - client_send_time

offset = (server_time - client_send_time) - (RTT / 2)

synced_time = local_time + offset
```

**Penjelasan:**

- RTT dibagi 2 karena request dan response memakan waktu yang sama
- Offset digunakan untuk adjust local clock
- Hasilnya adalah synchronized time yang akurat

---

## 4. SIMULASI DAN HASIL

### 4.1 Skenario Simulasi

Simulasi terdiri dari 5 skenario utama:

#### Skenario 1: Sinkronisasi Semua Services

Semua 3 booking services melakukan initial sync dengan master server.

**Output:**

```
✓ Booking Service - Jakarta tersinkronisasi: offset: -2.5ms, accuracy: 0.5ms
✓ Booking Service - Bandung tersinkronisasi: offset: 1.2ms, accuracy: 0.6ms
✓ Booking Service - Surabaya tersinkronisasi: offset: -0.8ms, accuracy: 0.4ms
```

#### Skenario 2: Multiple Bookings dari Berbagai Services

Tiga bookings dibuat secara bersamaan dari services yang berbeda.

**Output:**

```
📅 Booking dibuat:
  ├─ Booking ID: 1001
  ├─ User: USER001
  ├─ Room: ROOM-JKT-101
  ├─ Created At: 2026-05-24T10:30:45.123Z  [Service: Jakarta]

📅 Booking dibuat:
  ├─ Booking ID: 1002
  ├─ User: USER002
  ├─ Room: ROOM-BDG-205
  ├─ Created At: 2026-05-24T10:30:45.124Z  [Service: Bandung]

📅 Booking dibuat:
  ├─ Booking ID: 1003
  ├─ User: USER003
  ├─ Room: ROOM-SBY-310
  ├─ Created At: 2026-05-24T10:30:45.125Z  [Service: Surabaya]
```

**Analisis:**

- Meskipun bookings dibuat dari services berbeda, timestamps-nya tetap dalam urutan yang logis
- Perbedaan waktu antar bookings (~1ms) menunjukkan konsistensi

#### Skenario 3: Timeline Tracking

Semua events (create, confirm, check-in, check-out) di-track dalam master timeline.

**Output:**

```
📊 MASTER TIMELINE (Diurutkan berdasarkan waktu tersinkronisasi):

1. [2026-05-24T10:30:45.123Z]
   Event: BOOKING_CONFIRMED
   Booking ID: 1001
   Service: Booking Service - Jakarta

2. [2026-05-24T10:30:45.173Z]
   Event: CHECK_IN
   Booking ID: 1001
   Service: Booking Service - Jakarta

3. [2026-05-24T10:30:45.223Z]
   Event: CHECK_OUT
   Booking ID: 1001
   Service: Booking Service - Jakarta
   Duration: 0.05 jam

4. [2026-05-24T10:30:45.124Z]
   Event: BOOKING_CONFIRMED
   ...
```

**Keuntungan:**

- Urutan events dapat di-reconstruct dengan akurat
- Durasi menginap dapat dihitung dengan tepat
- Audit trail yang reliable

#### Skenario 4: Data Consistency Check

Memvalidasi bahwa semua services konsisten.

**Output:**

```
📋 Status Sinkronisasi Setiap Service:

Service: Booking Service - Jakarta
  ├─ Is Synced: ✓ Yes
  ├─ Time Offset: -2.50 ms
  ├─ Sync Valid: ✓ Yes
  ├─ Current Synced Time: 2026-05-24T10:30:45.128Z
  └─ Total Bookings: 1

Service: Booking Service - Bandung
  ├─ Is Synced: ✓ Yes
  ├─ Time Offset: 1.20 ms
  ├─ Sync Valid: ✓ Yes
  ├─ Current Synced Time: 2026-05-24T10:30:45.130Z
  └─ Total Bookings: 1

Service: Booking Service - Surabaya
  ├─ Is Synced: ✓ Yes
  ├─ Time Offset: -0.80 ms
  ├─ Sync Valid: ✓ Yes
  ├─ Current Synced Time: 2026-05-24T10:30:45.129Z
  └─ Total Bookings: 1
```

#### Skenario 5: Clock Skew Recovery

Simulasi ketika ada service yang mengalami clock drift.

**Output:**

```
Simulasi: Service Bandung mengalami clock drift (-500 ms)...
Clock Bandung sekarang: offset -498.80 ms

Re-syncing Bandung Service...

✓ Booking Service - Bandung tersinkronisasi:
  - offset: 1.20 ms [recovered]
  - accuracy: 0.6 ms
  - syncTime: 2026-05-24T10:30:45.500Z
```

**Analisis:**

- Service berhasil di-recover otomatis
- Tidak ada data loss
- System resilient terhadap clock failures

---

## 5. KEUNTUNGAN IMPLEMENTASI

### 5.1 Functional Benefits

1. **Consistency**: Semua services menggunakan waktu yang sama
2. **Reliability**: Audit trail yang accurate untuk compliance
3. **Predictability**: Sequence of events dapat di-reconstruct
4. **Correctness**: Billing dan duration calculations yang tepat
5. **Debuggability**: History sinkronisasi membantu troubleshooting

### 5.2 Non-Functional Benefits

1. **Scalability**: Mudah menambah services baru
2. **Maintainability**: Clear separation of concerns
3. **Testability**: Mudah melakukan unit testing
4. **Observability**: Detailed sync metrics dan history
5. **Resilience**: Automatic recovery dari clock skew

---

## 6. IMPLEMENTASI DI DALAM SISTEM

### 6.1 Integrasi dengan Existing Codebase

Selain membuat simulasi terpisah, modul sinkronisasi waktu ini juga diintegrasikan langsung ke dalam arsitektur _Microservices_ yang sudah ada, khususnya untuk menjaga konsistensi urutan _event_ pada sistem _Event-Driven_ menggunakan RabbitMQ.

**File yang Dibuat & Dimodifikasi:**

1. `services/javascript/src/utils/timeSync.js` - Core time sync modules
2. `services/javascript/src/utils/globalTimeClient.js` - Inisialisasi client global (Singleton)
3. `services/javascript/src/controllers/bookingController.js` - Menggunakan waktu sinkron saat membuat booking
4. `services/javascript/src/controllers/paymentController.js` - Menggunakan waktu sinkron saat mencatat pembayaran
5. `services/javascript/src/simulation/bookingTimeSync.simulation.js` - Simulasi independen (Proof of Concept)

**Contoh Penerapan Nyata (Publish Event RabbitMQ):**

Dengan integrasi ini, pencatatan waktu untuk antrean pesan tidak lagi bergantung pada waktu lokal masing-masing _service_ (yang rawan _clock drift_), melainkan menggunakan master server.

```javascript
// Publish event ke antrean RabbitMQ
publishMessage("booking_events", {
  event_type: "booking_created",
  id: newBookingId,
  data: bookingPayload,
  // Mencegah inkonsistensi dengan menggunakan waktu yang tersinkronisasi
  timestamp: globalTimeClient.getSyncedTimeISO(),
});
```

### 6.2 Cara Menggunakan

```javascript
// 1. Buat master time server
const timeServer = new TimeSyncServer("Master");

// 2. Buat booking service dengan time sync
const bookingService = new BookingServiceWithTimeSync("Service1", timeServer);

// 3. Sinkronisasi dengan master
await bookingService.syncTime();

// 4. Gunakan untuk business logic
const booking = bookingService.createBooking(userId, roomId, checkin, checkout);

// 5. Cek report
const report = bookingService.getSyncReport();
```

---

## 7. KESIMPULAN

### 7.1 Ringkasan

Studi kasus ini menunjukkan implementasi praktis dari **Synchronize Clock and Time** dalam sistem distributed booking kos. Dengan menggunakan master time server dan client-side offset calculation, sistem dapat maintain consistency across multiple services yang tersebar geografis.

### 7.2 Key Takeaways

1. ✓ **Sinkronisasi waktu adalah fundamental** untuk sistem terdistribusi yang reliable
2. ✓ **NTP-style algorithms** efektif untuk real-world applications
3. ✓ **Accuracy dapat ditingkatkan** dengan measuring RTT dan calculating offset
4. ✓ **System dapat recover** dari clock failures secara otomatis
5. ✓ **Audit trail yang accurate** memungkinkan better debugging dan compliance

### 7.3 Future Improvements

1. Implementasi redundant time servers untuk high availability
2. Adaptive sync interval berdasarkan clock stability
3. Byzantine fault-tolerant clock synchronization
4. Integration dengan public NTP servers (pool.ntp.org)
5. Metrics dan monitoring untuk real-time visibility

---

## 8. REFERENSI

1. **Lamport, L.** (1978). "Time, Clocks, and the Ordering of Events in a Distributed System"
2. **Mills, D.L.** (1991). "Internet Time Synchronization: The Network Time Protocol"
3. **Google Cloud.** "Keeping Time: Achieving Consistency in a Distributed System"
4. **IEEE.** "IEEE 1588: Precision Time Protocol"
5. **Amazon Web Services.** "Distributed System Design Patterns"

---

**Catatan Implementasi:**

File simulasi dapat dijalankan dengan:

```bash
cd services/javascript
node test-time-sync.js
```

Untuk production deployment, pertimbangkan:

- Integration dengan NTP daemon (ntpd)
- Metrics collection (Prometheus)
- Distributed tracing (Jaeger)
- Clock monotonicity guarantees

---

_Laporan ini dibuat sebagai tugas Sistem Terdistribusi, mendemonstrasikan pemahaman tentang Clock Synchronization dan Time Management dalam distributed systems._
