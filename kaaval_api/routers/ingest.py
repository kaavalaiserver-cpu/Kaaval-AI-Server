"""
Router for metadata ingestion from edge cameras.
"""
import uuid
import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, AsyncSessionLocal
from models import Violation
from schemas import IngestResult
from config import settings
from local_storage import upload_image
from security import verify_api_key

from PIL import Image
import io

logger = logging.getLogger("kaaval_api.ingest")

router = APIRouter(tags=["ingest"])

def compress_to_webp(image_bytes: bytes, max_width: int = 1280, quality: int = 70) -> bytes:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        # Convert to RGB if necessary (e.g. RGBA or P)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # Resize if width > max_width
        if img.width > max_width:
            ratio = max_width / float(img.width)
            new_height = int((float(img.height) * float(ratio)))
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
        buffer = io.BytesIO()
        img.save(buffer, format="WEBP", quality=quality, method=4)
        return buffer.getvalue()
    except Exception as e:
        logger.error(f"Failed to compress image to WEBP: {e}")
        return None

async def process_ingestion(
    violation_id: str,
    meta_dict: dict,
    full_bytes: bytes,
    cropped_bytes: bytes,
    full_content_type: str,
    cropped_content_type: str,
    dt: datetime
):
    year, month, day = dt.strftime("%Y"), dt.strftime("%m"), dt.strftime("%d")
    subdivision = meta_dict.get("subdivision", "Unknown")
    camera_id = meta_dict.get("camera_id", "UNKNOWN_CAM")
    vehicle_number = meta_dict.get("vehicle_number")
    violation_type = meta_dict.get("violation_type", "NO_HELMET")
    confidence = meta_dict.get("confidence", 0.0)

    base_key = f"violations/{subdivision}/{camera_id}/{year}/{month}/{day}/{violation_id}"
    full_key = f"{base_key}/full.jpg"
    cropped_key = f"{base_key}/cropped.jpg" if cropped_bytes else None
    
    full_preview_key = f"{base_key}/full_preview.webp"
    cropped_preview_key = f"{base_key}/cropped_preview.webp" if cropped_bytes else None
    
    metadata_key = f"{base_key}/metadata.json"

    # Generate WEBP Previews
    full_preview_bytes = compress_to_webp(full_bytes)
    cropped_preview_bytes = compress_to_webp(cropped_bytes) if cropped_bytes else None

    # Upload Originals to Images Bucket
    if not upload_image(settings.s3_images_bucket, full_key, full_bytes, full_content_type):
        logger.error(f"[{violation_id}] Failed to upload full image to S3")
        return
        
    if cropped_bytes and not upload_image(settings.s3_images_bucket, cropped_key, cropped_bytes, cropped_content_type):
        logger.error(f"[{violation_id}] Failed to upload cropped image to S3")
        return
        
    # Upload Previews to Preview Bucket
    if full_preview_bytes and not upload_image(settings.s3_preview_bucket, full_preview_key, full_preview_bytes, "image/webp"):
        logger.error(f"[{violation_id}] Failed to upload full preview to S3")
        return
        
    if cropped_preview_bytes and not upload_image(settings.s3_preview_bucket, cropped_preview_key, cropped_preview_bytes, "image/webp"):
        logger.error(f"[{violation_id}] Failed to upload cropped preview to S3")
        return
        
    if not upload_image(settings.s3_images_bucket, metadata_key, json.dumps(meta_dict).encode('utf-8'), "application/json"):
        logger.error(f"[{violation_id}] Failed to upload metadata to S3")
        return
        
    # Save to PostgreSQL
    status = "PENDING"
    if vehicle_number and confidence >= 0.7:
        status = "READY"
    elif vehicle_number and confidence > 0:
        status = "MANUAL_REVIEW"
        
    async with AsyncSessionLocal() as session:
        new_violation = Violation(
            id=violation_id,
            vehicle_number=vehicle_number,
            camera_id=camera_id,
            violation_type=violation_type,
            confidence_score=confidence,
            image_url=full_key,
            proof_img_url=cropped_key,
            full_preview_url=full_preview_key,
            cropped_preview_url=cropped_preview_key,
            status=status,
            meta_data=meta_dict,
        )
        session.add(new_violation)
        try:
            await session.commit()
            logger.info(f"[{violation_id}] Ingestion complete")
        except Exception as e:
            await session.rollback()
            logger.error(f"[{violation_id}] DB Insert Failed: {e}")

@router.post("/ingest", response_model=IngestResult)
async def ingest_violation(
    background_tasks: BackgroundTasks,
    metadata: str = Form(...),
    full_image: UploadFile = File(...),
    cropped_image: UploadFile = File(None),
    api_key: str = Depends(verify_api_key)
):
    """
    Ingest a new violation from an edge camera.
    1. Reads bytes into memory
    2. Queues background task for S3 and DB
    3. Returns immediately (<100ms)
    """
    try:
        meta_dict = json.loads(metadata)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in metadata field")
        
    violation_id = meta_dict.get("violation_id") or str(uuid.uuid4())
    
    timestamp_str = meta_dict.get("timestamp")
    if timestamp_str:
        try:
            dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        except ValueError:
            dt = datetime.now()
    else:
        dt = datetime.now()

    full_bytes = await full_image.read()
    cropped_bytes = await cropped_image.read() if cropped_image else None
    
    background_tasks.add_task(
        process_ingestion,
        violation_id,
        meta_dict,
        full_bytes,
        cropped_bytes,
        full_image.content_type,
        cropped_image.content_type if cropped_image else "",
        dt
    )
        
    return IngestResult(
        status="queued",
        violation_id=violation_id,
        uploaded=True
    )
