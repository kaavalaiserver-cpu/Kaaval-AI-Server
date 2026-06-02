"""
Security dependencies for FastAPI.
"""
import hmac
import secrets
import jwt
from fastapi import Security, HTTPException, status, Depends
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from config import settings

# Dependency to extract x-api-key from headers
api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)

# Dependency to extract Bearer token from Authorization header
jwt_bearer = HTTPBearer(auto_error=False)

def verify_api_key(api_key: str = Security(api_key_header)):
    """
    Validates the API key for protected endpoints like POST /ingest.
    Uses constant-time comparison to prevent timing attacks.
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key",
        )
        
    # Constant-time comparison
    if not hmac.compare_digest(api_key.encode(), settings.rdk_api_key.encode()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API Key",
        )
        
    return api_key

def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Security(jwt_bearer)):
    """
    Validates the JWT token for protected dashboard endpoints.
    Requires the exact same JWT_SECRET used by the NestJS backend.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header",
        )
        
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
