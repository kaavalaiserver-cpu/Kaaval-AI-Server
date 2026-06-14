import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://kaaval:kaaval%40123@localhost:5432/kaaval_ai')
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM violations WHERE camera_id LIKE 'CAM-00%'"))
    print('Deleted mock violations!')
    await engine.dispose()

asyncio.run(run())
