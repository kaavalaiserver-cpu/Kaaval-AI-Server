"""
AWS S3 integration using boto3.
Assumes IAM role is attached to the EC2 instance, so no hardcoded credentials are used.
"""
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
import logging
import os
import urllib.parse
from config import settings

logger = logging.getLogger(__name__)

LOCAL_UPLOAD_DIR = os.environ.get("LOCAL_UPLOAD_DIR", os.path.abspath(os.path.join(os.getcwd(), "..", "uploads")))

def generate_presigned_url(bucket_name: str, object_name: str, expiration: int = settings.presign_ttl) -> str | None:
    """
    Returns the secure local URL for the image instead of an S3 presigned URL.
    """
    if not object_name:
        return None
        
    API_BASE = os.environ.get('API_BASE_URL', 'http://localhost:8003')
    return f"{API_BASE}/api/violations/image/by-key?key={urllib.parse.quote(object_name)}"


def upload_image(bucket_name: str, object_name: str, file_bytes: bytes, content_type: str = "image/jpeg") -> bool:
    """
    Save an image file to local disk.
    """
    try:
        full_path = os.path.join(LOCAL_UPLOAD_DIR, object_name)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(file_bytes)
        return True
    except Exception as e:
        logger.error(f"Failed to save image locally to {object_name}: {e}")
        return False
