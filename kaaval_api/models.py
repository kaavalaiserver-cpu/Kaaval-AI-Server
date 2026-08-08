"""
SQLAlchemy ORM models matching NestJS TypeORM Schema.
"""
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, Float, Integer, Text, DateTime, func, Boolean, text, Uuid, BigInteger, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class Camera(Base):
    __tablename__ = "cameras"
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True)
    junction_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), nullable=False)
    camera_name: Mapped[str] = mapped_column(String(200), nullable=False)
    camera_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="OFFLINE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Vehicle(Base):
    __tablename__ = "vehicles"
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True)
    registration_number: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    is_watchlisted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ViolationType(Base):
    __tablename__ = "violation_types"
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True)
    violation_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    violation_name: Mapped[str] = mapped_column(String(150), nullable=False)
    default_fine: Mapped[float] = mapped_column(Numeric(10, 2), default=500.0)
    severity: Mapped[str] = mapped_column(String(50), default="MODERATE")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Violation(Base):
    __tablename__ = "violations"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True)
    camera_id: Mapped[Optional[str]] = mapped_column(Uuid(as_uuid=False), ForeignKey("cameras.id"), nullable=True)
    vehicle_id: Mapped[Optional[str]] = mapped_column(Uuid(as_uuid=False), ForeignKey("vehicles.id"), nullable=True)
    violation_type_id: Mapped[Optional[str]] = mapped_column(Uuid(as_uuid=False), ForeignKey("violation_types.id"), nullable=True)
    
    violation_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    
    reviewed_by: Mapped[Optional[str]] = mapped_column(Uuid(as_uuid=False), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approval_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejected_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    challan_status: Mapped[str] = mapped_column(String(50), default="NOT_GENERATED")
    challan_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True)
    violation_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("violations.id"), nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "FULL_IMAGE", "CROPPED_IMAGE"
    file_path: Mapped[str] = mapped_column(Text, nullable=False) # The S3 URL or path
    checksum: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    captured_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
