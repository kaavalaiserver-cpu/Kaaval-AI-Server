"""
AWS S3 integration using boto3.
Assumes IAM role is attached to the EC2 instance, so no hardcoded credentials are used.
"""
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
import logging
from config import settings

logger = logging.getLogger(__name__)

# Configure boto3 to use signature version 4 and the specified region
boto_config = Config(
    region_name=settings.aws_region,
    signature_version="s3v4",
    retries={"max_attempts": 3, "mode": "standard"}
)

# Use default session (picks up IAM role or ~/.aws/credentials)
s3_client = boto3.client("s3", config=boto_config)


def generate_presigned_url(bucket_name: str, object_name: str, expiration: int = settings.presign_ttl) -> str | None:
    """
    Generate a presigned URL to share an S3 object securely.
    """
    if not object_name:
        return None
        
    try:
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": object_name},
            ExpiresIn=expiration
        )
        return url
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL for {bucket_name}/{object_name}: {e}")
        return None


def upload_image(bucket_name: str, object_name: str, file_bytes: bytes, content_type: str = "image/jpeg") -> bool:
    """
    Upload an image file to S3.
    """
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=object_name,
            Body=file_bytes,
            ContentType=content_type,
            # No ACLs needed; we use presigned URLs for access
        )
        return True
    except Exception as e:
        logger.error(f"Failed to upload image {object_name} to {bucket_name}: {e}")
        if settings.database_url.startswith("sqlite"):
            logger.warning("Bypassing S3 upload error for local SQLite development.")
            # Optionally write to a local temp folder or mock
            return True
        return False
