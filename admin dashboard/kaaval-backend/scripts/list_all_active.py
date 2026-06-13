import psycopg2
import json

try:
    conn = psycopg2.connect("dbname=kaaval_ai user=kaaval password=kaaval@123 host=localhost")
    cur = conn.cursor()
    cur.execute("""
        SELECT id, created_at, camera_id, status, is_deleted, vehicle_number 
        FROM violations 
        WHERE created_at >= '2026-06-12 00:00:00'
        ORDER BY created_at DESC;
    """)
    rows = cur.fetchall()
    print(f"TOTAL VIOLATIONS CREATED TODAY: {len(rows)}")
    
    active_rows = [r for r in rows if not r[4]]
    print(f"TOTAL ACTIVE (NOT DELETED) TODAY: {len(active_rows)}")
    
    print("\nALL ACTIVE VIOLATIONS TODAY:")
    for r in active_rows:
        print(f"ID: {r[0]} | TS: {r[1]} | CAM: {r[2]} | STATUS: {r[3]} | VEHICLE: {r[5]}")
        
    print("\nALL DELETED VIOLATIONS TODAY:")
    deleted_rows = [r for r in rows if r[4]]
    for r in deleted_rows:
        print(f"ID: {r[0]} | TS: {r[1]} | CAM: {r[2]} | STATUS: {r[3]} | VEHICLE: {r[5]}")
        
except Exception as e:
    print("DB ERROR:", e)
