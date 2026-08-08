"""
Efficient async ingestion pipeline with a bounded queue and worker pool.

Design goals:
- Hardware gets an instant response (<50ms) — never waits for DB/disk I/O
- Burst handling: up to MAX_QUEUE_SIZE jobs buffered (e.g. 500 images after network cut)
- Controlled concurrency: MAX_WORKERS parallel DB+disk writes (avoids overloading)
- Back-pressure: if queue is full, return HTTP 503 with Retry-After header
- Dead-letter logging: failed jobs are logged with full context for retry analysis
"""
import asyncio
import logging
import uuid
import json
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

logger = logging.getLogger("kaaval_api.pipeline")

# ── Configuration ─────────────────────────────────────────────────────────────
MAX_WORKERS   = 4      # parallel DB+disk write workers
MAX_QUEUE_SIZE = 500   # max buffered jobs (burst buffer)
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class IngestionJob:
    violation_id: str
    meta_dict: dict
    full_bytes: bytes
    cropped_bytes: Optional[bytes]
    full_content_type: str
    cropped_content_type: str
    dt: datetime
    enqueued_at: float = field(default_factory=time.monotonic)


# Global queue and worker task references
_queue: asyncio.Queue = None
_workers: list = []


def get_queue() -> asyncio.Queue:
    return _queue


async def _worker(worker_id: int):
    """A single pipeline worker — pulls jobs from queue and processes them."""
    # Import here to avoid circular imports
    from routers.ingest import process_ingestion

    logger.info(f"[Pipeline] Worker-{worker_id} started")
    while True:
        job: IngestionJob = await _queue.get()
        wait_ms = (time.monotonic() - job.enqueued_at) * 1000
        try:
            logger.info(
                f"[Pipeline] Worker-{worker_id} processing violation "
                f"{job.violation_id} (waited {wait_ms:.0f}ms in queue)"
            )
            await process_ingestion(
                job.violation_id,
                job.meta_dict,
                job.full_bytes,
                job.cropped_bytes,
                job.full_content_type,
                job.cropped_content_type,
                job.dt,
            )
        except Exception as e:
            logger.error(
                f"[Pipeline] Worker-{worker_id} FAILED on violation "
                f"{job.violation_id}: {e}",
                exc_info=True,
            )
            # Dead-letter log — write failed job metadata to disk for later retry
            try:
                import os
                dl_dir = "/app/dead_letter"
                os.makedirs(dl_dir, exist_ok=True)
                dl_path = os.path.join(dl_dir, f"{job.violation_id}.json")
                with open(dl_path, "w") as f:
                    json.dump({
                        "violation_id": job.violation_id,
                        "meta_dict": job.meta_dict,
                        "error": str(e),
                        "failed_at": datetime.utcnow().isoformat(),
                    }, f, indent=2)
                logger.warning(f"[Pipeline] Dead-letter saved to {dl_path}")
            except Exception as dl_err:
                logger.error(f"[Pipeline] Could not write dead-letter: {dl_err}")
        finally:
            _queue.task_done()


async def start_pipeline():
    """Start the queue and spawn worker pool. Called on app startup."""
    global _queue, _workers
    _queue = asyncio.Queue(maxsize=MAX_QUEUE_SIZE)
    _workers = [
        asyncio.create_task(_worker(i), name=f"pipeline-worker-{i}")
        for i in range(MAX_WORKERS)
    ]
    logger.info(
        f"[Pipeline] Started — {MAX_WORKERS} workers, "
        f"queue capacity {MAX_QUEUE_SIZE}"
    )


async def stop_pipeline():
    """Graceful shutdown — wait for queue to drain then cancel workers."""
    global _queue, _workers
    if _queue:
        logger.info(
            f"[Pipeline] Shutting down — draining {_queue.qsize()} remaining jobs..."
        )
        await asyncio.wait_for(_queue.join(), timeout=30.0)

    for w in _workers:
        w.cancel()
    await asyncio.gather(*_workers, return_exceptions=True)
    logger.info("[Pipeline] All workers stopped cleanly")


async def enqueue_job(job: IngestionJob) -> bool:
    """
    Add a job to the queue. Returns True if queued, False if queue is full.
    Non-blocking — never waits for a slot.
    """
    try:
        _queue.put_nowait(job)
        logger.info(
            f"[Pipeline] Enqueued {job.violation_id} "
            f"(queue depth: {_queue.qsize()}/{MAX_QUEUE_SIZE})"
        )
        return True
    except asyncio.QueueFull:
        logger.warning(
            f"[Pipeline] Queue FULL ({MAX_QUEUE_SIZE}). "
            f"Dropping violation {job.violation_id}. Hardware should retry."
        )
        return False


def queue_stats() -> dict:
    """Return current queue statistics for the /health endpoint."""
    return {
        "queue_depth": _queue.qsize() if _queue else 0,
        "queue_capacity": MAX_QUEUE_SIZE,
        "active_workers": MAX_WORKERS,
        "queue_full": _queue.full() if _queue else False,
    }
