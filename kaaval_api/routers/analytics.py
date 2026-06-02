"""
Router for dashboard analytics.
"""
from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, desc

from config import settings
from database import get_db
from models import Violation
from schemas import (
    AnalyticsSummary, 
    DailyCount, 
    TopCamera, 
    TopVehicle,
    ViolationTypeCount,
    SubdivisionCount
)
from security import verify_jwt_token

router = APIRouter(prefix="/analytics", tags=["analytics"], dependencies=[Depends(verify_jwt_token)])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(db: AsyncSession = Depends(get_db)):
    """Get high-level summary KPIs for the dashboard."""
    
    # 1. Total violations
    total = await db.scalar(select(func.count()).select_from(Violation))
    
    # 2. Violations today
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = await db.scalar(
        select(func.count()).select_from(Violation).where(Violation.created_at >= today_start)
    )
    
    # 3. Pending review
    pending = await db.scalar(
        select(func.count()).select_from(Violation).where(Violation.status.in_(["PENDING", "READY", "MANUAL_REVIEW"]))
    )
    
    # 4. Challans issued
    challans = await db.scalar(
        select(func.count()).select_from(Violation).where(Violation.status.in_(["CHALLAN_ISSUED", "VERIFIED"]))
    )
    
    # 5. Daily last 30 days
    if settings.database_url.startswith("sqlite"):
        daily_query = text("""
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM violations 
            WHERE created_at >= date('now', '-30 days') AND is_deleted = false
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
        """)
    else:
        daily_query = text("""
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM violations 
            WHERE created_at >= current_date - interval '30 days' AND is_deleted = false
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
        """)
    daily_result = await db.execute(daily_query)
    daily_counts = [DailyCount(date=str(row[0]), count=row[1]) for row in daily_result.fetchall()]
    
    # 6. Top cameras
    cam_query = text("""
        SELECT camera_id, COUNT(*) as count
        FROM violations
        WHERE camera_id IS NOT NULL AND is_deleted = false
        GROUP BY camera_id
        ORDER BY count DESC
        LIMIT 5
    """)
    cam_result = await db.execute(cam_query)
    top_cameras = [TopCamera(camera_id=row[0], count=row[1]) for row in cam_result.fetchall()]
    
    # 7. Top vehicles (offenders)
    veh_query = text("""
        SELECT vehicle_number, COUNT(*) as count
        FROM violations
        WHERE vehicle_number IS NOT NULL AND vehicle_number != 'UNREAD' AND vehicle_number != 'NIL' AND is_deleted = false
        GROUP BY vehicle_number
        ORDER BY count DESC
        LIMIT 5
    """)
    veh_result = await db.execute(veh_query)
    top_vehicles = [TopVehicle(vehicle_number=row[0], count=row[1]) for row in veh_result.fetchall()]
    
    # 8. By type
    type_query = text("""
        SELECT violation_type, COUNT(*) as count
        FROM violations
        WHERE is_deleted = false
        GROUP BY violation_type
        ORDER BY count DESC
    """)
    type_result = await db.execute(type_query)
    by_type = [ViolationTypeCount(violation_type=row[0], count=row[1]) for row in type_result.fetchall()]
    
    return AnalyticsSummary(
        total_violations=total or 0,
        violations_today=today_count or 0,
        pending_review=pending or 0,
        challans_issued=challans or 0,
        daily_last_30=daily_counts,
        top_cameras=top_cameras,
        top_vehicles=top_vehicles,
        by_type=by_type
    )


@router.get("/daily", response_model=List[DailyCount])
async def get_daily(db: AsyncSession = Depends(get_db)):
    """Get daily violation counts."""
    query = text("""
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM violations 
        WHERE is_deleted = false
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) DESC
        LIMIT 30
    """)
    result = await db.execute(query)
    return [DailyCount(date=str(row[0]), count=row[1]) for row in result.fetchall()]


@router.get("/cameras", response_model=List[TopCamera])
async def get_top_cameras(db: AsyncSession = Depends(get_db)):
    """Get all cameras ordered by violation count."""
    query = text("""
        SELECT camera_id, COUNT(*) as count
        FROM violations
        WHERE camera_id IS NOT NULL AND is_deleted = false
        GROUP BY camera_id
        ORDER BY count DESC
    """)
    result = await db.execute(query)
    return [TopCamera(camera_id=row[0], count=row[1]) for row in result.fetchall()]


@router.get("/vehicles", response_model=List[TopVehicle])
async def get_top_vehicles(db: AsyncSession = Depends(get_db)):
    """Get top offending vehicles."""
    query = text("""
        SELECT vehicle_number, COUNT(*) as count
        FROM violations
        WHERE vehicle_number IS NOT NULL AND vehicle_number != 'UNREAD' AND vehicle_number != 'NIL' AND is_deleted = false
        GROUP BY vehicle_number
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT 50
    """)
    result = await db.execute(query)
    return [TopVehicle(vehicle_number=row[0], count=row[1]) for row in result.fetchall()]


@router.get("/camera-health")
async def get_camera_health(db: AsyncSession = Depends(get_db)):
    """Get health status of all cameras based on recent violations."""
    # Assuming cameras that submitted a violation in the last 24 hours are 'online'
    if settings.database_url.startswith("sqlite"):
        query = text("""
            SELECT 
                camera_id, 
                MAX(created_at) as last_active,
                COUNT(*) as violation_count,
                CASE WHEN MAX(created_at) > datetime('now', '-24 hours') THEN 'online' ELSE 'offline' END as status
            FROM violations
            WHERE camera_id IS NOT NULL
            GROUP BY camera_id
            ORDER BY last_active DESC
        """)
    else:
        query = text("""
            SELECT 
                camera_id, 
                MAX(created_at) as last_active,
                COUNT(*) as violation_count,
                CASE WHEN MAX(created_at) > current_timestamp - interval '24 hours' THEN 'online' ELSE 'offline' END as status
            FROM violations
            WHERE camera_id IS NOT NULL
            GROUP BY camera_id
            ORDER BY last_active DESC
        """)
    result = await db.execute(query)
    
    cameras = []
    for row in result.fetchall():
        cameras.append({
            "camera_id": row[0],
            "last_active": row[1],
            "violation_count": row[2],
            "status": row[3],
            "ai_enabled": True, # Hardcoded for now
            "location_name": f"Camera {row[0]}" # Fallback
        })
        
    # Summarize
    online = sum(1 for c in cameras if c['status'] == 'online')
    offline = len(cameras) - online
    
    return {
        "total": len(cameras),
        "online": online,
        "offline": offline,
        "cameras": cameras
    }


@router.get("/subdivisions", response_model=List[SubdivisionCount])
async def get_subdivisions(db: AsyncSession = Depends(get_db)):
    """Get violation counts grouped by subdivision."""
    # The JSON extraction syntax varies slightly by dialect. For PostgreSQL:
    # metadata->>'subdivision' OR jsonb_extract_path_text(metadata, 'subdivision')
    if settings.database_url.startswith("sqlite"):
        query = text("""
            SELECT 
                COALESCE(json_extract(metadata, '$.subdivision'), json_extract(metadata, '$.division'), json_extract(metadata, '$.region'), 'Unknown') as subdivision,
                COUNT(*) as count
            FROM violations
            WHERE is_deleted = false
            GROUP BY COALESCE(json_extract(metadata, '$.subdivision'), json_extract(metadata, '$.division'), json_extract(metadata, '$.region'), 'Unknown')
            ORDER BY count DESC
        """)
    else:
        query = text("""
            SELECT 
                COALESCE(metadata->>'subdivision', metadata->>'division', metadata->>'region', 'Unknown') as subdivision,
                COUNT(*) as count
            FROM violations
            WHERE is_deleted = false
            GROUP BY COALESCE(metadata->>'subdivision', metadata->>'division', metadata->>'region', 'Unknown')
            ORDER BY count DESC
        """)
    result = await db.execute(query)
    return [SubdivisionCount(subdivision=row[0], violations=row[1]) for row in result.fetchall()]
