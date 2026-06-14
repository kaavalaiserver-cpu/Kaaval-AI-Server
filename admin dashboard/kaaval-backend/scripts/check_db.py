import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://kaaval:kaaval%40123@localhost:5432/kaaval_ai')
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT COUNT(*) FROM violations"))
        print('Total:', res.scalar())
        res = await conn.execute(text("SELECT camera_id, COUNT(*) FROM violations GROUP BY camera_id"))
        print('By Camera:', res.fetchall())
        res = await conn.execute(text("SELECT metadata->>'subdivision' as sub, COUNT(*) FROM violations GROUP BY metadata->>'subdivision'"))
        print('By Subdivision:', res.fetchall())
    await engine.dispose()

asyncio.run(run())
