"""
Configuration — reads from environment / .env file.
IAM Role is used for AWS auth; no access keys needed on EC2.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── PostgreSQL (shared with NestJS) ───────────────────────────────────────
    # Format: postgresql+asyncpg://user:pass@host:port/dbname
    database_url: str

    # ── AWS S3 ────────────────────────────────────────────────────────────────
    # On EC2: uses IAM Role automatically — no keys needed.
    # Locally: set AWS_PROFILE or fall back to ~/.aws/credentials.
    aws_region: str = "ap-south-1"
    s3_images_bucket: str = "kaaval-ai-images"
    s3_preview_bucket: str = "kaaval-ai-preview"

    # Presigned URL TTL in seconds (5 minutes)
    presign_ttl: int = 300

    # ── API Security ──────────────────────────────────────────────────────────
    # RDK edge cameras send this in the x-api-key header to POST /ingest
    rdk_api_key: str
    
    # Dashboard uses JWT for analytics and evidence retrieval
    jwt_secret: str

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # ── Pagination defaults ───────────────────────────────────────────────────
    default_page_size: int = 50
    max_page_size: int = 200

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
