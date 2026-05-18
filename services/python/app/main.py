from fastapi import FastAPI, HTTPException
from datetime import datetime
import os
from app.schemas import PredictRequest, PredictResponse, HealthResponse
from app.model_loader import ml_loader

# Initialize FastAPI app
app = FastAPI(
    title="Kos Room Recommendation ML Service",
    description="ML Service untuk prediksi rekomendasi kamar kos berdasarkan fitur-fitur kamar dan preferensi user",
    version="1.0.0"
)


@app.on_event("startup")
async def startup_event():
    """Load model saat service startup"""
    print("=" * 50)
    print("Python ML Service Starting...")
    print("=" * 50)
    
    success = ml_loader.load_model()
    if success:
        print("✓ Model loaded successfully")
    else:
        print("✗ Failed to load model - service will return errors")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    
    Returns:
        HealthResponse: Status kesehatan service
    """
    return HealthResponse(
        status="ok",
        service="python-ml-service",
        model_loaded=ml_loader.is_loaded,
        model_version=ml_loader.model_version
    )


@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    Prediksi rekomendasi kamar kos
    
    Args:
        request: PredictRequest dengan features kamar
        
    Returns:
        PredictResponse: Hasil prediksi dengan probabilitas
        
    Raises:
        HTTPException: Jika model tidak loaded atau error prediksi
    """
    if not ml_loader.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model tidak berhasil di-load. Service sedang tidak siap."
        )

    try:
        # Prepare features dalam urutan yang benar
        features = [
            request.price,
            request.room_size_m2,
            request.distance_to_campus_km,
            request.has_wifi,
            request.has_ac,
            request.has_private_bathroom,
            request.facility_count,
            request.occupancy_rate,
            request.user_budget,
        ]

        # Get prediction
        prediction, label, confidence, probabilities = ml_loader.predict(features)

        # Return response
        return PredictResponse(
            prediction=prediction,
            label=label,
            confidence=confidence,
            probabilities=probabilities,
            service="python-ml-service",
            model_version=ml_loader.model_version,
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error saat prediksi: {str(e)}"
        )


@app.get("/")
async def root():
    """Root endpoint - API info"""
    return {
        "service": "Kos Room Recommendation ML Service",
        "version": "1.0.0",
        "status": "running",
        "model_loaded": ml_loader.is_loaded,
        "model_version": ml_loader.model_version,
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "docs": "/docs",
            "openapi": "/openapi.json"
        }
    }
