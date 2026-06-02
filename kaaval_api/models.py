"""
SQLAlchemy ORM models.
Column names exactly match the TypeORM entity used by the NestJS backend.
Table: violations
"""
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, Float, Integer, Text, DateTime, func, Boolean, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from database import Base


class Violation(Base):
    """
    Mirrors the NestJS TypeORM Violation entity.
    DO NOT rename columns — NestJS writes to this same table.
    """
    __tablename__ = "violations"

    id:                  Mapped[str]            = mapped_column(String(36), primary_key=True)
    created_at:          Mapped[datetime]        = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at:          Mapped[datetime]        = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    image_url:           Mapped[Optional[str]]   = mapped_column(Text, nullable=True)
    proof_img_url:       Mapped[Optional[str]]   = mapped_column(Text, nullable=True)
    full_preview_url:    Mapped[Optional[str]]   = mapped_column(Text, nullable=True)
    cropped_preview_url: Mapped[Optional[str]]   = mapped_column(Text, nullable=True)
    detections:          Mapped[Optional[Any]]   = mapped_column(JSONB, nullable=True)

    vehicle_number:      Mapped[Optional[str]]   = mapped_column(String(50), nullable=True)
    violation_type:      Mapped[str]             = mapped_column(String(100), default="NO_HELMET")
    confidence_score:    Mapped[float]           = mapped_column(Float, default=0.0)

    challan_status:      Mapped[Optional[str]]   = mapped_column(String(50), nullable=True)
    challan_amount:      Mapped[Optional[int]]   = mapped_column(Integer, nullable=True)
    challan_issued_at:   Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    status:              Mapped[str]             = mapped_column(String(50), default="PENDING")

    location_lat:        Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_lng:        Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # 'metadata' is reserved in SQLAlchemy DeclarativeBase, so we name the attribute 'meta_data' but map it to 'metadata' column
    meta_data:           Mapped[Optional[Any]]   = mapped_column("metadata", JSONB, nullable=True)

    reviewed_by:         Mapped[Optional[str]]   = mapped_column(String(100), nullable=True)
    reviewed_at:         Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    review_notes:        Mapped[Optional[str]]   = mapped_column(Text, nullable=True)

    camera_id:           Mapped[Optional[str]]   = mapped_column(String(50), nullable=True)
    vehicle_detection_id:Mapped[Optional[str]]   = mapped_column(String(100), nullable=True)

    is_deleted:          Mapped[bool]            = mapped_column(server_default=text("FALSE"))
    deleted_at:          Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by:          Mapped[Optional[str]]   = mapped_column(String(100), nullable=True)


class AuditLog(Base):
    """
    Audit logs for tracking police interactions with evidence.
    """
    __tablename__ = "audit_logs"

    id:             Mapped[int]             = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:        Mapped[Optional[str]]   = mapped_column(String(100), nullable=True)
    action:         Mapped[str]             = mapped_column(String(100))
    violation_id:   Mapped[Optional[str]]   = mapped_column(String(100), nullable=True)
    timestamp:      Mapped[datetime]        = mapped_column(DateTime(timezone=True), server_default=func.now())
    ip_address:     Mapped[Optional[str]]   = mapped_column(String(50), nullable=True)
    details:        Mapped[Optional[Any]]   = mapped_column(JSONB, nullable=True)
