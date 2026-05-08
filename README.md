# UTS PPLOS - Sistem Booking Kos (Microservices Architecture)

Repositori ini berisi implementasi tugas Ujian Tengah Semester (UTS) mata kuliah Pembangunan Perangkat Lunak berbasis arsitektur _Microservices_.

## 👨‍💻 Identitas Mahasiswa

- **Nama:** Muhammad Fahmi Idrus
- **NIM:** 2310511079
- **Kelas:** PPLOS - A
- **Repository:** `uts-pplos-a-2310511079`
- **Link Repository: https://github.com/fhmi18/uts-pplos-a-2310511079**
- **Link Youtube: https://youtu.be/_WtI4UGb0oo**

## 🏗️ Struktur Arsitektur

Sistem ini terdiri dari 1 API Gateway, 3 Microservices independen, dan 1 Message Broker:

1. **API Gateway (Node.js)** - Single entry point, JWT Middleware, Rate Limiting, Request Logging (Port `3004`).
2. **Auth Service (Node.js)** - Menangani registrasi, login lokal, login OAuth (GitHub, Google, Facebook), dan manajemen data profil/token (Port `3001`).
3. **Property Service (PHP / CodeIgniter 4)** - Menangani manajemen data properti, kamar, dan fasilitas secara dinamis (Port `3002`).
4. **Booking & Payment Service (Node.js)** - Menangani pemesanan, pengecekan ketersediaan kamar, serta transaksi pembayaran antar _tenant_ dan _owner_ (Port `3003`).
5. **Message Broker (RabbitMQ)** - Menangani komunikasi asinkron (Event-Driven Architecture) antar layanan seperti notifikasi pengiriman, update status tersinkronisasi, dan toleransi kesalahan (_fault tolerance_) (Port `5672`).

_Catatan: Masing-masing service memiliki database yang terisolasi secara independen (db_auth, db_property, db_booking) dan saling berkomunikasi menggunakan REST API melalui Axios._
_Catatan: Masing-masing service memiliki database yang terisolasi secara independen (db_auth, db_property, db_booking). Komunikasi synchronous menggunakan REST API (Axios), sedangkan asynchronous menggunakan Message Broker._

## 🚀 Cara Menjalankan Aplikasi

### Prasyarat (Prerequisites)

Pastikan Anda telah menginstal:

- Node.js & npm
- PHP (versi 8.1 atau lebih baru)
- Composer
- MySQL / MariaDB (XAMPP/MAMP)
- RabbitMQ (Erlang) berjalan di localhost port 5672

### 1. Persiapan Database

1. Buat 3 database terpisah di MySQL Anda:
   - `db_auth`
   - `db_property`
   - `db_booking`
2. Lakukan migrasi/import struktur tabel untuk masing-masing database (sesuai spesifikasi layanan).

### 2. Menjalankan Auth Service (Port 3001)

Buka terminal baru, lalu jalankan:

```bash
cd services/auth
npm install
npm start
```

### 3. Menjalankan Property Service (Port 3002)

Buka terminal baru, lalu jalankan:

```bash
cd services/php
composer install
php spark serve --port 3002
```

### 4. Menjalankan Booking Service (Port 3003)

Buka terminal baru, lalu jalankan:

```bash
cd services/javascript
npm install
npm start
```

### 5. Menjalankan API Gateway (Port 3004)

Buka terminal baru, lalu jalankan:

```bash
cd gateway
npm install
npm start
```

## 🗺️ Peta Endpoint (Routing Map)

Semua lalu lintas (klien/Postman) **WAJIB** mengakses melalui API Gateway (`http://localhost:3004`). Gateway akan merutekan _request_ ke _service_ yang tepat di belakangnya.

| Path di Gateway       | HTTP Method | Service Tujuan   | URL Service Tujuan      | Keterangan                           |
| :-------------------- | :---------- | :--------------- | :---------------------- | :----------------------------------- |
| `/api/auth/*`         | ALL         | Auth Service     | `http://localhost:3001` | Autentikasi, JWT, OAuth, Profil User |
| `/api/property/*`     | ALL         | Property Service | `http://localhost:3002` | Manajemen Properti, Kamar, Fasilitas |
| `/api/booking/*`      | ALL         | Booking Service  | `http://localhost:3003` | Pemesanan & Cek Ketersediaan Kamar   |
| `/api/payment/*`      | ALL         | Booking Service  | `http://localhost:3003` | Pembuatan & Update Status Pembayaran |
| `/api/gateway/health` | GET         | API Gateway      | `(Internal Gateway)`    | Pengecekan status Gateway            |

## 🛡️ Fitur Keamanan

- **JWT Validation:** Diterapkan secara terpusat (Global Middleware) di API Gateway. Service backend membaca header `X-User-Data` yang disisipkan oleh Gateway.
- **Token Blacklisting:** Diterapkan di memori API Gateway saat pengguna melakukan `POST /api/auth/logout`.
- **Rate Limiting:**
  - Global: Maksimal 60 request / menit per IP.
  - Strict (Login/Refresh): Maksimal 10 request / 15 menit per IP (mencegah _Brute Force_).
- **Request Logging:** Mencatat setiap request yang masuk (HTTP method, URL, status code, response time) menggunakan `morgan` di API Gateway untuk keperluan _monitoring_ dan _debugging_.

## ✨ Fitur Unggulan Sistem

- **Paging & Filtering:** Diimplementasikan pada endpoint Properti (`GET /api/property`) dengan dukungan pencarian dinamis (`page`, `per_page`, `search`, `city`).
- **Role-Based Access Control (RBAC):** Pemisahan hak akses yang ketat antara `owner` (pengelola kos) dan `tenant` (penyewa) di seluruh layanan microservices.
- **Inter-Service Communication:** Komunikasi internal antar microservices menggunakan Axios, termasuk meneruskan _Bearer Token_ pengguna asli secara dinamis.
- **Graceful Degradation:** Penanganan _error_ yang elegan (menggunakan `Promise.allSettled` dan _try-catch_). Kegagalan sebagian di Auth Service (misal mengambil user yang sudah dihapus) tidak akan membuat Booking Service menjadi _crash_.

## 📄 Pengujian (Testing)

File Postman Collection telah disertakan di dalam folder `postman/collection.json`. Anda dapat mengimpor file tersebut ke aplikasi Postman untuk langsung menguji fungsionalitas seluruh sistem secara terintegrasi.
