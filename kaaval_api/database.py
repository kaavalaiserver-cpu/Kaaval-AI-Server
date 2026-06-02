"""
SQLAlchemy async database engine and session dependency.
Connects to the shared PostgreSQL used by the NestJS backend.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings

engine_args = {
    "pool_pre_ping": True,
    "echo": False,
}

if not settings.database_url.startswith("sqlite"):
    engine_args["pool_size"] = 10
    engine_args["max_overflow"] = 5

engine = create_async_engine(
    settings.database_url,
    **engine_args
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency — yields an async DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
