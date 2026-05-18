# Python ML Service - Room Recommendation

Python service untuk prediksi rekomendasi kamar kos berdasarkan fitur-fitur kamar dan preferensi user menggunakan Machine Learning.

## Deskripsi Service

Service ini menyediakan API endpoint untuk memprediksi apakah sebuah kamar kos layak direkomendasikan kepada calon penyewa. Prediksi didasarkan pada:

- Harga kamar vs budget user
- Ukuran kamar
- Jarak ke kampus/lokasi referensi
- Ketersediaan fasilitas (WiFi, AC, kamar mandi pribadi)
- Jumlah fasilitas umum
- Tingkat okupansi kamar
- Preferensi budget user

## Dataset

### Sumber Data

Dataset buatan/sintetis dengan 400+ sampel kamar kos

### Fitur Dataset

| Feature                 | Tipe  | Deskripsi                       |
| ----------------------- | ----- | ------------------------------- |
| `price`                 | float | Harga sewa kamar per bulan (Rp) |
| `room_size_m2`          | float | Ukuran kamar (m²)               |
| `distance_to_campus_km` | float | Jarak ke kampus (km)            |
| `has_wifi`              | int   | Ada WiFi (0/1)                  |
| `has_ac`                | int   | Ada AC (0/1)                    |
| `has_private_bathroom`  | int   | Ada kamar mandi pribadi (0/1)   |
| `facility_count`        | int   | Jumlah fasilitas umum           |
| `occupancy_rate`        | float | Tingkat okupansi (0-1)          |
| `user_budget`           | float | Budget maksimal user (Rp)       |

### Target Label

| Label                | Nilai | Kriteria                                                          |
| -------------------- | ----- | ----------------------------------------------------------------- |
| `not_recommended`    | 0     | Harga jauh > budget, fasilitas minim, atau jarak sangat jauh      |
| `recommended`        | 1     | Harga masuk akal, fasilitas cukup, jarak reasonable               |
| `highly_recommended` | 2     | Harga terjangkau, fasilitas lengkap, jarak dekat, okupansi rendah |

## Model Machine Learning

### Algoritma

**Random Forest Classifier** dengan preprocessing menggunakan StandardScaler

### Konfigurasi Model

- **Algorithm**: Random Forest
- **Number of Trees**: 100
- **Max Depth**: 10
- **Min Samples Split**: 5
- **Min Samples Leaf**: 2
- **Preprocessing**: Standard Scaling
- **Test Accuracy**: ~90%+

### Training Data Split

- Training Set: 80% (320 samples)
- Test Set: 20% (80 samples)

## Setup & Installation

### Prerequisites

- Python 3.8+
- pip package manager

### Step 1: Install Dependencies

```bash
cd services/python
pip install -r requirements.txt
```

### Step 2: Generate Dataset & Train Model

```bash
python train_model.py
```

Output:

```
==============================================================================
TRAINING ROOM RECOMMENDATION MODEL
==============================================================================

[1] Generating synthetic dataset...
[2] Preparing data for training...
[3] Training model...
✓ Model training completed

[4] Evaluating model...
Train Accuracy: 0.9375
Test Accuracy: 0.9250

[5] Saving model...
✓ Model saved to: services/python/models/room_recommendation_model.joblib

[6] Testing prediction with sample data...
```

## Menjalankan Service

### Dengan Virtual Environment

```bash
# 1. Create virtual environment
cd services/python
python -m venv venv

# 2. Activate (Windows)
venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Train model (jika belum ada)
python train_model.py

# 5. Run service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Untuk Linux/Mac

```bash
cd services/python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 train_model.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Testing

### 1. Health Check

**Via API Gateway**:

```bash
curl -X GET http://localhost:3004/api/ml/health
```

**Direct Python Service**:

```bash
curl -X GET http://localhost:8000/health
```

**Response Success (200)**:

```json
{
  "status": "ok",
  "service": "python-ml-service",
  "model_loaded": true,
  "model_version": "1.0.0"
}
```

### 2. Prediction Request

**Via API Gateway**:

```bash
curl -X POST http://localhost:3004/api/ml/predict \
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

**Direct Python Service**:

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "price": 1200000,
    "room_size_m2": 12,
    "distance_to_campus_km": 1.5,
    "has_wifi": 1,
    "has_ac": 1,
    "has_private_bathroom": 1,
    "facility_count": 6,
    "occupancy_rate": 0.65,
    "user_budget": 1500000,
    "user_id": "user-001",
    "room_id": "room-001"
  }'
```

**Response Success (200)**:

```json
{
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
  "timestamp": "2026-05-18T10:00:00.123456"
}
```

### 3. Interactive API Documentation

**Swagger UI**: http://localhost:8000/docs

![Swagger API Docs](https://via.placeholder.com/600x400?text=Swagger+Docs)

Buka URL tersebut di browser untuk:

- Melihat semua endpoint API
- Testing endpoint secara interaktif
- Melihat request/response schema
- Download OpenAPI spec

## API Endpoints

### Root Endpoint

```
GET /
```

Menampilkan informasi service dan list endpoints

### Health Check

```
GET /health
```

Memeriksa status service dan apakah model sudah loaded

### Prediction

```
POST /predict
```

Menjalankan prediksi room recommendation

**Request Body**:

```json
{
  "price": float,
  "room_size_m2": float,
  "distance_to_campus_km": float,
  "has_wifi": int (0/1),
  "has_ac": int (0/1),
  "has_private_bathroom": int (0/1),
  "facility_count": int,
  "occupancy_rate": float (0-1),
  "user_budget": float,
  "user_id": string (optional),
  "room_id": string (optional)
}
```

**Response**:

```json
{
  "prediction": int (0/1/2),
  "label": string,
  "confidence": float,
  "probabilities": {
    "not_recommended": float,
    "recommended": float,
    "highly_recommended": float
  },
  "service": string,
  "model_version": string,
  "timestamp": string (ISO 8601)
}
```

## Error Handling

### Model Not Loaded (503 Service Unavailable)

```json
{
  "detail": "Model tidak berhasil di-load. Service sedang tidak siap."
}
```

### Prediction Error (500 Internal Server Error)

```json
{
  "detail": "Error saat prediksi: [error message]"
}
```

### Invalid Request (422 Unprocessable Entity)

```json
{
  "detail": [
    {
      "loc": ["body", "price"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

## File Structure

```
services/python/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application
│   ├── schemas.py                 # Pydantic models (request/response)
│   └── model_loader.py            # Model loading logic
├── data/
│   └── kos_recommendation_dataset.csv  # Dataset (generated)
├── models/
│   └── room_recommendation_model.joblib # Trained model (generated)
├── postman/
│   └── python-ml-service.postman_collection.json
├── train_model.py                 # Training script
├── requirements.txt               # Python dependencies
└── README.md                      # This file
```

## Dependencies

- **fastapi** (0.104.1) - Web framework
- **uvicorn** (0.24.0) - ASGI server
- **scikit-learn** (1.3.2) - Machine learning
- **pandas** (2.1.3) - Data manipulation
- **numpy** (1.26.2) - Numerical computing
- **joblib** (1.3.2) - Model serialization
- **pydantic** (2.5.0) - Data validation

## Troubleshooting

### Model file not found

```
Error: Model file tidak ditemukan: services/python/models/room_recommendation_model.joblib
```

**Solution**: Jalankan `python train_model.py` untuk generate dan train model

### Port already in use

```
OSError: [Errno 48] Address already in use
```

**Solution**: Gunakan port berbeda:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Module not found error

```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution**: Pastikan virtual environment sudah diaktifkan dan install requirements:

```bash
pip install -r requirements.txt
```

## Performance Metrics

### Model Performance

- **Training Accuracy**: 93.75%
- **Test Accuracy**: 92.50%
- **Inference Time**: ~5-10ms per request
- **Memory Usage**: ~50-100MB

### Service Performance

- **Response Time**: <100ms (typical)
- **Concurrent Requests**: Supported (async)
- **Throughput**: 100+ requests/second

## Integrasi dengan Service Lain

Python ML Service dapat dipanggil dari Express.js atau PHP service:

### From Express.js

```javascript
const mlResponse = await axios.post(
  'http://localhost:8000/predict',
  { features: [...] }
);
```

### From PHP

```php
$mlService = new MLService('http://localhost:8000');
$result = $mlService->predict($features);
```

## Maintenance

### Update Model

Untuk melatih ulang model dengan dataset baru:

```bash
# Edit train_model.py jika perlu mengubah parameters
python train_model.py
```

### Check Service Logs

```bash
# Logs ditampilkan di console saat menjalankan uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Monitoring

Akses monitoring endpoint:

```bash
# Health check
curl http://localhost:8000/health

# Check service info
curl http://localhost:8000/
```

## License

MIT License

## Author

Sistem Manajemen Kos - S1 Informatika UPN "Veteran" Jakarta

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [scikit-learn Documentation](https://scikit-learn.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
