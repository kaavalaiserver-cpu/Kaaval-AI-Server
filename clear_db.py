import sqlite3

db_path = 'admin dashboard/kaaval-backend/kaaval_local.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("Tables:", tables)

for (table_name,) in tables:
    if table_name != 'sqlite_sequence':
        cursor.execute(f"DELETE FROM {table_name};")
        print(f"Cleared table: {table_name}")

conn.commit()
conn.close()
