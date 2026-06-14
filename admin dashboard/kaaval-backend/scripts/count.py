import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine('postgresql+asyncpg://kaaval_user:kaaval_password@localhost/kaaval_db')
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM violations"))
        print('TOTAL:', res.scalar())
        res = await conn.execute(text("SELECT count(*) FROM violations WHERE created_at >= '2026-06-13 00:00:00' AND created_at <= '2026-06-13 23:59:59'"))
        print('13-06:', res.scalar())

asyncio.run(main())
