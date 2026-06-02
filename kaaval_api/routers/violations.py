"""
Router for violation retrieval endpoints.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from database import get_db
from models import Violation
from schemas import ViolationOut, ViolationListOut, EvidenceOut
from config import settings
from s3 import generate_presigned_url
from security import verify_jwt_token

router = APIRouter(tags=["violations"], dependencies=[Depends(verify_jwt_token)])


def populate_urls(v_out: ViolationOut) -> ViolationOut:
    """Helper to populate presigned URLs if keys exist."""
    # Assuming image_url stored in DB is actually the S3 key
    if v_out.image_key:
        v_out.full_image_url = generate_presigned_url(settings.s3_images_bucket, v_out.image_key)
    
    if v_out.proof_key:
        v_out.proof_image_url = generate_presigned_url(settings.s3_images_bucket, v_out.proof_key)
        
    return v_out


@router.get("/violation/{violation_id}", response_model=ViolationOut)
async def get_violation(violation_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single violation by ID, including short-lived presigned URLs."""
    result = await db.execute(select(Violation).where(Violation.id == violation_id, Violation.is_deleted == False))
    db_violation = result.scalars().first()
    
    if not db_violation:
        raise HTTPException(status_code=404, detail="Violation not found")
        
    # Map model to schema
    v_out = ViolationOut.model_validate(db_violation)
    v_out.image_key = db_violation.image_url
    v_out.proof_key = db_violation.proof_img_url
    
    return populate_urls(v_out)


@router.get("/evidence/{violation_id}", response_model=EvidenceOut)
async def get_evidence(violation_id: str, db: AsyncSession = Depends(get_db)):
    """Get just the presigned evidence URLs for a violation."""
    result = await db.execute(select(Violation).where(Violation.id == violation_id, Violation.is_deleted == False))
    v = result.scalars().first()
    
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")
        
    full_url = generate_presigned_url(settings.s3_images_bucket, v.image_url) if v.image_url else None
    cropped_url = generate_presigned_url(settings.s3_images_bucket, v.proof_img_url) if v.proof_img_url else None
    
    return EvidenceOut(
        violation_id=v.id,
        vehicle_number=v.vehicle_number,
        camera_id=v.camera_id,
        violation_type=v.violation_type,
        created_at=v.created_at,
        full_url=full_url,
        cropped_url=cropped_url,
        review_status=v.status,
        expires_in=settings.presign_ttl
    )


@router.get("/vehicle/{vehicle_number}", response_model=ViolationListOut)
async def get_vehicle_violations(
    vehicle_number: str,
    page: int = Query(1, ge=1),
    limit: int = Query(settings.default_page_size, ge=1, le=settings.max_page_size),
    db: AsyncSession = Depends(get_db)
):
    """Get all violations for a specific vehicle number."""
    offset = (page - 1) * limit
    
    # Get total count
    count_query = select(func.count()).select_from(Violation).where(Violation.vehicle_number == vehicle_number, Violation.is_deleted == False)
    total = await db.scalar(count_query)
    
    # Get paginated data
    data_query = (
        select(Violation)
        .where(Violation.vehicle_number == vehicle_number, Violation.is_deleted == False)
        .order_by(desc(Violation.created_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(data_query)
    violations = result.scalars().all()
    
    mapped_data = []
    for v in violations:
        vout = ViolationOut.model_validate(v)
        vout.image_key = v.image_url
        vout.proof_key = v.proof_img_url
        mapped_data.append(populate_urls(vout))
        
    return ViolationListOut(data=mapped_data, total=total or 0, page=page, limit=limit)


@router.get("/camera/{camera_id}", response_model=ViolationListOut)
async def get_camera_violations(
    camera_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(settings.default_page_size, ge=1, le=settings.max_page_size),
    db: AsyncSession = Depends(get_db)
):
    """Get all violations for a specific camera."""
    offset = (page - 1) * limit
    
    count_query = select(func.count()).select_from(Violation).where(Violation.camera_id == camera_id, Violation.is_deleted == False)
    total = await db.scalar(count_query)
    
    data_query = (
        select(Violation)
        .where(Violation.camera_id == camera_id, Violation.is_deleted == False)
        .order_by(desc(Violation.created_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(data_query)
    violations = result.scalars().all()
    
    mapped_data = []
    for v in violations:
        vout = ViolationOut.model_validate(v)
        vout.image_key = v.image_url
        vout.proof_key = v.proof_img_url
        mapped_data.append(populate_urls(vout))
        
    return ViolationListOut(data=mapped_data, total=total or 0, page=page, limit=limit)


@router.get("/violations", response_model=ViolationListOut)
async def search_violations(
    date_from: Optional[datetime] = Query(None, description="Start date/time"),
    date_to: Optional[datetime] = Query(None, description="End date/time"),
    status: Optional[str] = Query(None, description="Filter by status (e.g., PENDING)"),
    page: int = Query(1, ge=1),
    limit: int = Query(settings.default_page_size, ge=1, le=settings.max_page_size),
    db: AsyncSession = Depends(get_db)
):
    """Search violations with optional date range and status filters."""
    offset = (page - 1) * limit
    
    base_query = select(Violation).where(Violation.is_deleted == False)
    count_base = select(func.count()).select_from(Violation).where(Violation.is_deleted == False)
    
    conditions = []
    if date_from:
        conditions.append(Violation.created_at >= date_from)
    if date_to:
        conditions.append(Violation.created_at <= date_to)
    if status:
        conditions.append(Violation.status == status)
        
    if conditions:
        for condition in conditions:
            base_query = base_query.where(condition)
            count_base = count_base.where(condition)
            
    total = await db.scalar(count_base)
    
    data_query = base_query.order_by(desc(Violation.created_at)).offset(offset).limit(limit)
    result = await db.execute(data_query)
    violations = result.scalars().all()
    
    mapped_data = []
    for v in violations:
        vout = ViolationOut.model_validate(v)
        vout.image_key = v.image_url
        vout.proof_key = v.proof_img_url
        mapped_data.append(populate_urls(vout))
        
    return ViolationListOut(data=mapped_data, total=total or 0, page=page, limit=limit)


@router.get("/search", response_model=ViolationListOut)
async def search(
    q: str = Query(..., min_length=1, description="Search query (vehicle number or camera ID)"),
    page: int = Query(1, ge=1),
    limit: int = Query(settings.default_page_size, ge=1, le=settings.max_page_size),
    db: AsyncSession = Depends(get_db)
):
    """Unified search endpoint for police users. Searches vehicle numbers and camera IDs."""
    offset = (page - 1) * limit
    
    search_term = f"%{q}%"
    
    # We must explicitly cast to string if ilike isn't working on your dialect, 
    # but for postgres String() it works directly.
    base_query = select(Violation).where(
        Violation.is_deleted == False,
        ((Violation.vehicle_number.ilike(search_term)) | 
        (Violation.camera_id.ilike(search_term)))
    )
    
    count_query = select(func.count()).select_from(Violation).where(
        Violation.is_deleted == False,
        ((Violation.vehicle_number.ilike(search_term)) | 
        (Violation.camera_id.ilike(search_term)))
    )
    
    total = await db.scalar(count_query)
    
    data_query = base_query.order_by(desc(Violation.created_at)).offset(offset).limit(limit)
    result = await db.execute(data_query)
    violations = result.scalars().all()
    
    mapped_data = []
    for v in violations:
        vout = ViolationOut.model_validate(v)
        vout.image_key = v.image_url
        vout.proof_key = v.proof_img_url
        mapped_data.append(populate_urls(vout))
        
    return ViolationListOut(data=mapped_data, total=total or 0, page=page, limit=limit)
