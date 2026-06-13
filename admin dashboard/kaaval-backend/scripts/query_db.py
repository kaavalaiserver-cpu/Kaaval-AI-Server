import psycopg2
import json

try:
    conn = psycopg2.connect("dbname=kaaval_ai user=kaaval password=kaaval@123 host=localhost")
    cur = conn.cursor()
    cur.execute("""
        SELECT id, created_at, camera_id, status, deleted_by, deleted_at, vehicle_number 
        FROM violations 
        WHERE created_at >= '2026-06-12 00:00:00' AND is_deleted = true
        ORDER BY created_at DESC;
    """)
    rows = cur.fetchall()
    print(f"TOTAL DELETED TODAY: {len(rows)}")
    for r in rows:
        print(f"ID: {r[0]} | TS: {r[1]} | CAM: {r[2]} | STATUS: {r[3]} | DELETED BY: {r[4]} | DELETED AT: {r[5]} | VEHICLE: {r[6]}")
except Exception as e:
    print("DB ERROR:", e)
