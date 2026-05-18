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

## 🤖 Python ML Service - Room Recommendation

Starting from Pertemuan 11, sistem ini juga dilengkapi dengan **Python ML Service** untuk memberikan rekomendasi kamar berbasis Machine Learning:

### Deskripsi

Service ini menggunakan Random Forest Classifier dengan scikit-learn untuk memprediksi apakah sebuah kamar kos layak direkomendasikan kepada calon penyewa berdasarkan:

- Harga kamar vs budget user
- Ukuran kamar, jarak ke kampus
- Ketersediaan fasilitas (WiFi, AC, kamar mandi pribadi)
- Tingkat okupansi kamar

### Prediksi Output

- **highly_recommended (2)**: Kamar sangat sesuai dengan budget dan kebutuhan user
- **recommended (1)**: Kamar cukup sesuai dengan preferensi user
- **not_recommended (0)**: Kamar tidak sesuai atau tidak direkomendasikan

### Model Performance

- **Test Accuracy**: ~92.5%
- **Inference Time**: ~5-10ms per request
- **Concurrent Requests**: Supported (async)

### Teknologi

- Framework: **FastAPI** (modern async Python web framework)
- Model: **Random Forest Classifier**
- Preprocessing: **StandardScaler**
- Model Serialization: **joblib**
- Data Processing: **pandas, numpy**
- Documentation: **Swagger/OpenAPI** (auto-generated)

### Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│          API Gateway (Express.js) - Port 3004            │
└─────────────────────────────────────────────────────────┘
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
┌───▼────────┐      ┌──────▼──────┐        ┌──────▼──────┐
│Auth Service│      │Property Svc │        │ Booking Svc  │
│Port 3001   │      │ Port 3002    │        │ Port 3003    │
└────────────┘      └──────────────┘        └──────┬──────┘
                                                    │
                                            ┌───────▼────────┐
                                            │ Python ML Svc  │
                                            │   Port 8000    │
                                            │ (FastAPI)      │
                                            └────────────────┘
```

### Room Recommendation Feature

Express.js Booking Service diperluas dengan fitur room recommendation:

- **Endpoint**: `POST /api/ml/recommend-room`
- **Circuit Breaker**: Implemented untuk graceful degradation jika Python ML Service tidak tersedia
- **Features**: Mendukung batch prediction dengan multiple rooms

---

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

### 5. Menjalankan Python ML Service (Port 8000)

Buka terminal baru, lalu jalankan:

```bash
cd services/python

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate  # Windows
# atau: source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Train model (jika belum ada)
python train_model.py

# Run FastAPI service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**API Docs**: Buka `http://localhost:8000/docs` untuk Swagger UI interaktif

### 6. Menjalankan API Gateway (Port 3004)

Buka terminal baru, lalu jalankan:

```bash
cd gateway
npm install
npm start
```

## 🗺️ Peta Endpoint (Routing Map)

Semua lalu lintas (klien/Postman) **WAJIB** mengakses melalui API Gateway (`http://localhost:3004`). Gateway akan merutekan _request_ ke _service_ yang tepat di belakangnya.

| Path di Gateway       | HTTP Method | Service Tujuan   | URL Service Tujuan      | Keterangan                                   |
| :-------------------- | :---------- | :--------------- | :---------------------- | :------------------------------------------- |
| `/api/auth/*`         | ALL         | Auth Service     | `http://localhost:3001` | Autentikasi, JWT, OAuth, Profil User         |
| `/api/property/*`     | ALL         | Property Service | `http://localhost:3002` | Manajemen Properti, Kamar, Fasilitas         |
| `/api/booking/*`      | ALL         | Booking Service  | `http://localhost:3003` | Pemesanan & Cek Ketersediaan Kamar           |
| `/api/payment/*`      | ALL         | Booking Service  | `http://localhost:3003` | Pembuatan & Update Status Pembayaran         |
| `/api/ml/*`           | ALL         | Booking Service  | `http://localhost:3003` | ML Room Recommendation (express.js → python) |
| `/api/gateway/health` | GET         | API Gateway      | `(Internal Gateway)`    | Pengecekan status Gateway                    |

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
- **Machine Learning Integration:** Python ML Service untuk rekomendasi kamar berbasis Random Forest Classifier dengan circuit breaker pattern untuk reliability.

## 🤖 ML Room Recommendation Endpoints

### Via API Gateway (Port 3004)

```
POST http://localhost:3004/api/ml/recommend-room
GET  http://localhost:3004/api/ml/health
GET  http://localhost:3004/api/ml/circuit-status
```

### Direct Python ML Service (Port 8000)

```
GET  http://localhost:8000/health
POST http://localhost:8000/predict
GET  http://localhost:8000/docs (Swagger UI)
```

### Direct Express.js Booking Service (Port 3003)

```
POST http://localhost:3003/api/ml/recommend-room
GET  http://localhost:3003/api/ml/health
GET  http://localhost:3003/api/ml/circuit-status
```

### Request Example: Room Recommendation

**Via API Gateway :: Port 3004**

```bash
curl -X POST http://localhost:3004/api/ml/recommend-room \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-001",
    "room_id": "room-001",
    "features": {
      "price": 1200000,
      "room_size_m2": 12,
      "distance_to_campus_km": 1.5,
      "has_wifi": 1,
      "has_ac": 1,
      "has_private_bathroom": 1,
      "facility_count": 6,
      "occupancy_rate": 0.65,
      "user_budget": 1500000
    }
  }'
```

**Or directly via Express.js Booking Service:**

```bash
curl -X POST http://localhost:3003/api/ml/recommend-room \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### Response Example

```json
{
  "success": true,
  "message": "Room recommendation prediction success",
  "data": {
    "user_id": "user-001",
    "room_id": "room-001",
    "ml_prediction": {
      "prediction": 2,
      "label": "highly_recommended",
      "confidence": 0.92,
      "probabilities": {
        "not_recommended": 0.03,
        "recommended": 0.05,
        "highly_recommended": 0.92
      },
      "service": "python-ml-service",
      "model_version": "1.0.0",
      "timestamp": "2026-05-18T10:00:00"
    },
    "source": {
      "express_service": "javascript-service",
      "python_service": "python-ml-service"
    },
    "timestamp": "2026-05-18T10:00:00"
  }
}
```

### Error Handling: Circuit Breaker

Jika Python ML Service tidak tersedia, Express.js akan return error 503 dengan status circuit breaker:

```json
{
  "success": false,
  "message": "Python ML Service is temporarily unavailable",
  "error": "Circuit breaker open or ML service unreachable",
  "circuit_breaker": {
    "state": "OPEN",
    "failureCount": 3
  }
}
```

## 📄 Pengujian (Testing)

### Main API Testing

File Postman Collection telah disertakan di dalam folder `postman/collection.json`. Anda dapat mengimpor file tersebut ke aplikasi Postman untuk langsung menguji fungsionalitas seluruh sistem secara terintegrasi.

### Python ML Service Testing

Untuk testing Python ML Service secara spesifik, gunakan Postman Collection di `services/python/postman/python-ml-service.postman_collection.json` yang mencakup:

**1. Direct Python ML Service Testing** (Port 8000)

- `GET /health` - Check service health
- `POST /predict` - Get room recommendations (3 test cases: highly_recommended, recommended, not_recommended)

**2. Express.js Integration Testing** (Port 3003)

- `POST /api/ml/recommend-room` - Room recommendation via Express.js
- `GET /api/ml/health` - Health check via Express.js
- `GET /api/ml/circuit-status` - Check circuit breaker status

**3. Interactive API Testing**
Buka `http://localhost:8000/docs` untuk Swagger UI interaktif dari Python ML Service dan test endpoint secara langsung di browser.
