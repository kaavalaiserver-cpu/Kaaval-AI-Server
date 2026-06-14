"""
Pydantic response schemas.
"""
from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, ConfigDict


class ViolationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vehicle_number: Optional[str]
    camera_id: Optional[str]
    violation_type: str
    confidence_score: float
    status: str
    location_lat: Optional[float]
    location_lng: Optional[float]
    created_at: datetime

    # Presigned URL fields — populated at query time, not stored
    full_image_url: Optional[str] = None     # presigned URL to original
    proof_image_url: Optional[str] = None    # presigned URL to cropped proof
    
    full_preview_url: Optional[str] = None   # presigned URL to WEBP preview
    cropped_preview_url: Optional[str] = None # presigned URL to WEBP preview

    # S3 keys — raw keys (only included in evidence endpoint)
    image_key: Optional[str] = None
    proof_key: Optional[str] = None

    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    review_notes: Optional[str]
    challan_amount: Optional[int]
    challan_issued_at: Optional[datetime]


class ViolationListOut(BaseModel):
    data: List[ViolationOut]
    total: int
    page: int
    limit: int


class EvidenceOut(BaseModel):
    """Returned by GET /evidence/{violation_id}"""
    violation_id: str
    vehicle_number: Optional[str]
    camera_id: Optional[str]
    violation_type: str
    created_at: datetime
    full_url: Optional[str] = None    # presigned original
    cropped_url: Optional[str] = None # presigned original
    full_preview_url: Optional[str] = None
    cropped_preview_url: Optional[str] = None
    review_status: str                # Added per user request
    expires_in: int = 300             # seconds


class IngestResult(BaseModel):
    """Returned by POST /ingest"""
    status: str
    violation_id: str
    uploaded: bool


# ── Analytics schemas ─────────────────────────────────────────────────────────

class DailyCount(BaseModel):
    date: str                     # "2026-04-22"
    count: int


class TopCamera(BaseModel):
    camera_id: str
    count: int


class TopVehicle(BaseModel):
    vehicle_number: str
    count: int


class ViolationTypeCount(BaseModel):
    violation_type: str
    count: int


class CameraHealth(BaseModel):
    camera_id: str
    status: str
    last_active: datetime
    violation_count: int
    ai_enabled: bool
    location_name: Optional[str] = None


class SubdivisionCount(BaseModel):
    subdivision: str
    violations: int


class AnalyticsSummary(BaseModel):
    total_violations: int
    violations_today: int
    pending_review: int
    challans_issued: int
    daily_last_30: List[DailyCount]
    fines_issued_last_30: List[DailyCount]
    top_cameras: List[TopCamera]
    top_vehicles: List[TopVehicle]
    by_type: List[ViolationTypeCount]
