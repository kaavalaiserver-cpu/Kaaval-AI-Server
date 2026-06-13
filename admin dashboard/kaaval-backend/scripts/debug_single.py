import psycopg2
import json

try:
    conn = psycopg2.connect("dbname=kaaval_ai user=kaaval password=kaaval@123 host=localhost")
    cur = conn.cursor()
    cur.execute("SELECT id, created_at, camera_id, status, location_lat, location_lng, metadata, vehicle_number, is_deleted FROM violations WHERE id = '3c8d6b2c-c9f3-4519-a99e-a51547c54a26';")
    row = cur.fetchone()
    if not row:
        print("Not found in DB!")
    else:
        print("ROW:", row)
        metadata_raw = row[6]
        print("metadata_raw type:", type(metadata_raw))
        print("metadata_raw value:", repr(metadata_raw))
        if isinstance(metadata_raw, str):
            try:
                metadata = json.loads(metadata_raw)
                print("parsed metadata:", metadata)
                print("subdivision in parsed metadata:", metadata.get('subdivision'))
            except Exception as e:
                print("JSON parsing error:", e)
except Exception as e:
    print("DB ERROR:", e)
