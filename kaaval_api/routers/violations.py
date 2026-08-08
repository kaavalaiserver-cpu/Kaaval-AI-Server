"""
Router for violation retrieval endpoints.
NOTE: These routes are backed by the new relational schema.
      The NestJS backend (port 8003) is the primary API for the dashboard.
      These routes are used for direct evidence URL generation by the FastAPI layer.
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from database import get_db
from models import Violation, Camera, Vehicle, ViolationType, Evidence
from local_storage import generate_presigned_url
from config import settings
from security import verify_jwt_token

router = APIRouter(tags=["violations"], dependencies=[Depends(verify_jwt_token)])


def _format_violation(v: Violation, evidence_list: list) -> dict:
    """Serialize a relational Violation to a flat dict the frontend expects."""
    full_img = next((e.file_path for e in evidence_list if e.evidence_type == 'FULL_IMAGE'), None)
    cropped_img = next((e.file_path for e in evidence_list if e.evidence_type == 'CROPPED_IMAGE'), None)
    return {
        "id": str(v.id),
        "status": v.status,
        "violation_timestamp": v.violation_timestamp.isoformat() if v.violation_timestamp else None,
        "created_at": v.created_at.isoformat() if v.created_at else None,
        "full_image_url": generate_presigned_url(settings.s3_images_bucket, full_img) if full_img else None,
        "cropped_image_url": generate_presigned_url(settings.s3_images_bucket, cropped_img) if cropped_img else None,
    }


@router.get("/violation/{violation_id}")
async def get_violation(violation_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single violation by ID with presigned image URLs."""
    result = await db.execute(
        select(Violation).where(Violation.id == violation_id)
    )
    v = result.scalars().first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")

    ev_result = await db.execute(select(Evidence).where(Evidence.violation_id == violation_id))
    evidence_list = ev_result.scalars().all()

    return _format_violation(v, evidence_list)


@router.get("/evidence/{violation_id}")
async def get_evidence(violation_id: str, db: AsyncSession = Depends(get_db)):
    """Get presigned evidence URLs for a violation."""
    result = await db.execute(select(Violation).where(Violation.id == violation_id))
    v = result.scalars().first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")

    ev_result = await db.execute(select(Evidence).where(Evidence.violation_id == violation_id))
    evidence_list = ev_result.scalars().all()

    full_img = next((e.file_path for e in evidence_list if e.evidence_type == 'FULL_IMAGE'), None)
    cropped_img = next((e.file_path for e in evidence_list if e.evidence_type == 'CROPPED_IMAGE'), None)

    return {
        "violation_id": str(v.id),
        "status": v.status,
        "full_url": generate_presigned_url(settings.s3_images_bucket, full_img) if full_img else None,
        "cropped_url": generate_presigned_url(settings.s3_images_bucket, cropped_img) if cropped_img else None,
        "expires_in": settings.presign_ttl,
    }


@router.get("/vehicle/{vehicle_number}")
async def get_vehicle_violations(
    vehicle_number: str,
    page: int = Query(1, ge=1),
    limit: int = Query(settings.default_page_size, ge=1, le=settings.max_page_size),
    db: AsyncSession = Depends(get_db)
):
    """Get all violations for a specific vehicle number."""
    offset = (page - 1) * limit

    v_result = await db.execute(select(Vehicle).where(Vehicle.registration_number == vehicle_number))
    vehicle = v_result.scalars().first()
    if not vehicle:
        return {"data": [], "total": 0, "page": page, "limit": limit}

    count_query = select(func.count()).select_from(Violation).where(Violation.vehicle_id == vehicle.id)
    total = await db.scalar(count_query)

    data_query = select(Violation).where(
        Violation.vehicle_id == vehicle.id
    ).order_by(desc(Violation.violation_timestamp)).offset(offset).limit(limit)
    result = await db.execute(data_query)
    violations = result.scalars().all()

    return {
        "data": [_format_violation(v, []) for v in violations],
        "total": total or 0, "page": page, "limit": limit
    }


@router.get("/camera/{camera_code}")
async def get_camera_violations(
    camera_code: str,
    page: int = Query(1, ge=1),
    limit: int = Query(settings.default_page_size, ge=1, le=settings.max_page_size),
    db: AsyncSession = Depends(get_db)
):
    """Get all violations for a specific camera by its code (e.g. KAI1)."""
    offset = (page - 1) * limit

    cam_result = await db.execute(select(Camera).where(Camera.camera_code == camera_code))
    camera = cam_result.scalars().first()
    if not camera:
        return {"data": [], "total": 0, "page": page, "limit": limit}

    count_query = select(func.count()).select_from(Violation).where(Violation.camera_id == camera.id)
    total = await db.scalar(count_query)

    data_query = select(Violation).where(
        Violation.camera_id == camera.id
    ).order_by(desc(Violation.violation_timestamp)).offset(offset).limit(limit)
    result = await db.execute(data_query)
    violations = result.scalars().all()

    return {
        "data": [_format_violation(v, []) for v in violations],
        "total": total or 0, "page": page, "limit": limit
    }


@router.get("/violations")
async def search_violations(
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(settings.default_page_size, ge=1, le=settings.max_page_size),
    db: AsyncSession = Depends(get_db)
):
    """Search violations with optional date range and status filters."""
    offset = (page - 1) * limit
    base_query = select(Violation)
    count_base = select(func.count()).select_from(Violation)

    conditions = []
    if date_from:
        conditions.append(Violation.violation_timestamp >= date_from)
    if date_to:
        conditions.append(Violation.violation_timestamp <= date_to)
    if status:
        conditions.append(Violation.status == status)

    if conditions:
        for condition in conditions:
            base_query = base_query.where(condition)
            count_base = count_base.where(condition)

    total = await db.scalar(count_base)
    data_query = base_query.order_by(desc(Violation.violation_timestamp)).offset(offset).limit(limit)
    result = await db.execute(data_query)
    violations = result.scalars().all()

    return {
        "data": [_format_violation(v, []) for v in violations],
        "total": total or 0, "page": page, "limit": limit
    }
