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
from models import Violation, Camera, Vehicle, ViolationType, Evidence, KnownVehicle, KnownVehicleHit
from schemas import IngestResult
from sqlalchemy import select
from config import settings
from local_storage import upload_image
from security import verify_api_key
import pipeline
import io

from PIL import Image

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
    
    logger.info(f"Incoming RDK Metadata: {meta_dict}")
    
    subdivision = meta_dict.get("subdivision", "Unknown")
    camera_id = meta_dict.get("camera_id", "UNKNOWN_CAM")
    vehicle_number = meta_dict.get("vehicle_number")
    raw_type = meta_dict.get("violation_type", "NO_HELMET").upper().strip()
    confidence = meta_dict.get("confidence", 0.0)
    
    # Robust substring matching for RDK strings
    if "TRIPLES_PILLION_NO_HELMET" in raw_type:
        violation_type = "TRIPLES_PILLION_NO_HELMET"
    elif "TRIPLES_NO_HELMET" in raw_type:
        violation_type = "TRIPLES_NO_HELMET"
    elif "PILLION_NO_HELMET" in raw_type or (("PIL" in raw_type or "PL_" in raw_type) and "HELMET" in raw_type):
        violation_type = "PL_NO_HELMET"
    elif "TRIPLE" in raw_type or "TRIPLPES" in raw_type:
        violation_type = "TRIPLES"
    elif "NO HELMET" in raw_type or "NO_HELMET" in raw_type:
        violation_type = "NO_HELMET"
    else:
        violation_type = raw_type

    base_key = f"Kaniyakumari/{subdivision}/{camera_id}/{year}-{month}-{day}"
    full_key = f"{base_key}/{violation_id}.jpg"
    cropped_key = f"{base_key}/{violation_id}_cropped.jpg" if cropped_bytes else None
    
    metadata_key = f"{base_key}/{violation_id}.json"

    # Upload Originals to Images Bucket
    if not upload_image(settings.s3_images_bucket, full_key, full_bytes, full_content_type):
        logger.error(f"[{violation_id}] Failed to upload full image to S3")
        return
    # (Previews and metadata are no longer saved to disk based on user request)
    # Save to PostgreSQL
    status = "PENDING"
        
    async with AsyncSessionLocal() as session:
        # Lookup Camera
        stmt = select(Camera).where(Camera.camera_code == camera_id)
        result = await session.execute(stmt)
        camera = result.scalars().first()
        camera_uuid = camera.id if camera else None
        
        # Lookup ViolationType
        stmt = select(ViolationType).where(ViolationType.violation_code == violation_type)
        result = await session.execute(stmt)
        vtype = result.scalars().first()
        
        # Fallback to NO_HELMET if unknown type is sent
        if not vtype:
            stmt = select(ViolationType).where(ViolationType.violation_code == "NO_HELMET")
            result = await session.execute(stmt)
            vtype = result.scalars().first()
            
        vtype_uuid = vtype.id if vtype else None

        # Lookup or Create Vehicle
        vehicle_uuid = None
        if vehicle_number:
            stmt = select(Vehicle).where(Vehicle.registration_number == vehicle_number)
            result = await session.execute(stmt)
            vehicle = result.scalars().first()
            if vehicle:
                vehicle_uuid = vehicle.id
            else:
                vehicle_uuid = str(uuid.uuid4())
                new_vehicle = Vehicle(id=vehicle_uuid, registration_number=vehicle_number)
                session.add(new_vehicle)

        new_violation = Violation(
            id=violation_id,
            camera_id=camera_uuid,
            vehicle_id=vehicle_uuid,
            violation_type_id=vtype_uuid,
            violation_timestamp=dt,
            status=status
        )
        session.add(new_violation)
        await session.flush()

        if full_key:
            session.add(Evidence(
                id=str(uuid.uuid4()),
                violation_id=violation_id,
                evidence_type="FULL_IMAGE",
                file_path=full_key,
                captured_at=dt
            ))

        try:
            await session.commit()
            logger.info(f"[{violation_id}] Ingestion complete")
        except Exception as e:
            await session.rollback()
            logger.error(f"[{violation_id}] DB Insert Failed: {e}")

@router.post("/ingest", response_model=IngestResult)
async def ingest_violation(
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

    camera_id = meta_dict.get("camera_id", "")
    camera_id = meta_dict.get("camera_id", "")
    
    raw_type = meta_dict.get("violation_type", "NO_HELMET").upper().strip()
    
    if "TRIPLES_PILLION_NO_HELMET" in raw_type:
        violation_type = "TRIPLES_PILLION_NO_HELMET"
    elif "TRIPLES_NO_HELMET" in raw_type:
        violation_type = "TRIPLES_NO_HELMET"
    elif "PILLION_NO_HELMET" in raw_type or (("PIL" in raw_type or "PL_" in raw_type) and "HELMET" in raw_type):
        violation_type = "PL_NO_HELMET"
    elif "TRIPLE" in raw_type or "TRIPLPES" in raw_type:
        violation_type = "TRIPLES"
    elif "NO HELMET" in raw_type or "NO_HELMET" in raw_type:
        violation_type = "NO_HELMET"
    else:
        violation_type = raw_type
        
    meta_dict["violation_type"] = violation_type

    violation_id = meta_dict.get("violation_id") or str(uuid.uuid4())
    vehicle_number = meta_dict.get("vehicle_number")

    # ── Validate camera_id, violation_type, and check Known Vehicles ───────
    # This ensures the hardware gets a real error immediately if IDs are wrong,
    # and we can suppress known vehicles efficiently.
    async with AsyncSessionLocal() as session:
        cam_stmt = select(Camera).where(Camera.camera_code == camera_id)
        cam_result = await session.execute(cam_stmt)
        camera = cam_result.scalars().first()
        if not camera:
            raise HTTPException(
                status_code=422,
                detail=f"Unknown camera_id '{camera_id}'. Valid IDs are KAI1–KAI11."
            )

        vtype_stmt = select(ViolationType).where(ViolationType.violation_code == violation_type)
        vtype_result = await session.execute(vtype_stmt)
        if not vtype_result.scalars().first():
            meta_dict["violation_type"] = "NO_HELMET"

        # Check if the vehicle is known (suppressed)
        if vehicle_number:
            normalized_plate = vehicle_number.strip().upper().replace(" ", "")
            kv_stmt = select(KnownVehicle).where(KnownVehicle.vehicle_number == normalized_plate)
            kv_result = await session.execute(kv_stmt)
            known_vehicle = kv_result.scalars().first()
            if known_vehicle:
                # Record a hit in history instead of processing the violation
                confidence = meta_dict.get("confidence")
                
                timestamp_str = meta_dict.get("timestamp")
                if timestamp_str:
                    try:
                        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                    except ValueError:
                        dt = datetime.now()
                else:
                    dt = datetime.now()
                    
                hit = KnownVehicleHit(
                    id=str(uuid.uuid4()),
                    known_vehicle_id=known_vehicle.id,
                    vehicle_number=normalized_plate,
                    violation_type=violation_type,
                    camera_id=camera.id,
                    camera_name=camera.camera_name,
                    location=None, # Location might not be in camera model, or we can leave it null
                    confidence=float(confidence) if confidence is not None else None,
                    hit_timestamp=dt
                )
                session.add(hit)
                await session.commit()
                logger.info(f"[{violation_id}] Suppressed known vehicle {normalized_plate}. Recorded in history.")
                return IngestResult(
                    status="queued", # Pretend it was queued successfully to satisfy RDK
                    violation_id=violation_id,
                    uploaded=True
                )
    # ─────────────────────────────────────────────────────────────────────────

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

    job = pipeline.IngestionJob(
        violation_id=violation_id,
        meta_dict=meta_dict,
        full_bytes=full_bytes,
        cropped_bytes=cropped_bytes,
        full_content_type=full_image.content_type,
        cropped_content_type=cropped_image.content_type if cropped_image else "",
        dt=dt
    )
    
    success = await pipeline.enqueue_job(job)
    if not success:
        # Return 503 Service Unavailable so the hardware knows to retry later
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"detail": "Server is currently overloaded. Please retry later."},
            headers={"Retry-After": "10"}
        )

    return IngestResult(
        status="queued",
        violation_id=violation_id,
        uploaded=True
    )
