"""
Kaaval AI — FastAPI Evidence & Analytics Server
Port: 8001
Role: Evidence retrieval (presigned S3 URLs), metadata ingestion, analytics
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import logging

from config import settings
from routers import violations, analytics, ingest

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("kaaval_api")

# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Kaaval AI Evidence API",
    description="Evidence retrieval, analytics, and metadata ingestion for Kaaval AI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    # In production, disable docs:
    # docs_url=None, redoc_url=None,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "x-api-key"],
)

# ── Request timing middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_request_timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
    return response

# ── Global exception handler (no stack traces to clients) ─────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error [{request.method} {request.url}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(violations.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "kaaval-evidence-api", "version": "1.0.0"}
