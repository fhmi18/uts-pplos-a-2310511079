from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime


class PredictRequest(BaseModel):
    """Request schema untuk prediksi room recommendation"""
    price: float
    room_size_m2: float
    distance_to_campus_km: float
    has_wifi: int
    has_ac: int
    has_private_bathroom: int
    facility_count: int
    occupancy_rate: float
    user_budget: float
    user_id: Optional[str] = None
    room_id: Optional[str] = None


class PredictResponse(BaseModel):
    """Response schema untuk prediksi room recommendation"""
    prediction: int
    label: str
    confidence: float
    probabilities: Dict[str, float]
    service: str
    model_version: str
    timestamp: str


class HealthResponse(BaseModel):
    """Response schema untuk health check"""
    status: str
    service: str
    model_loaded: bool
    model_version: str
