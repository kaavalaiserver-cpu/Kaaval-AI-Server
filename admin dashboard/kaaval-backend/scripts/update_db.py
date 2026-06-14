import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://kaaval:kaaval%40123@localhost:5432/kaaval_ai')
    async with engine.begin() as conn:
        res = await conn.execute(text("UPDATE violations SET metadata = jsonb_set(metadata::jsonb, '{subdivision}', '\"Nagercoil\"') WHERE camera_id = 'CAM_RDK_X5_01'"))
        print('Updated rows:', res.rowcount)
        
        # Verify
        res = await conn.execute(text("SELECT metadata::jsonb->>'subdivision' as sub, COUNT(*) FROM violations GROUP BY metadata::jsonb->>'subdivision'"))
        print('By Subdivision:', res.fetchall())
    await engine.dispose()

asyncio.run(run())
