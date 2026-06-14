import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def run():
    engine = create_async_engine('postgresql+asyncpg://kaaval:kaaval%40123@localhost:5432/kaaval_ai')
    async with engine.begin() as conn:
        await conn.execute(text("UPDATE users SET subdivision = 'Nagercoil' WHERE role = 'nagercoil_admin'"))
        await conn.execute(text("UPDATE users SET subdivision = 'Thuckalay' WHERE role = 'thuckalay_admin'"))
        await conn.execute(text("UPDATE users SET subdivision = 'Colachel' WHERE role = 'colachel_admin'"))
        await conn.execute(text("UPDATE users SET subdivision = 'Kanyakumari' WHERE role = 'kanyakumari_admin'"))
        await conn.execute(text("UPDATE users SET subdivision = 'Marthandam' WHERE role = 'marthandam_admin'"))
        print('Users table updated!')
    await engine.dispose()

asyncio.run(run())
