import psycopg2
import json

# Polygon definition for Nagercoil
nagercoil_polygon = [
    [77.328, 8.132],
    [77.366, 8.116],
    [77.41, 8.122],
    [77.454, 8.148],
    [77.478, 8.188],
    [77.472, 8.238],
    [77.428, 8.274],
    [77.372, 8.282],
    [77.326, 8.246],
    [77.31, 8.19]
]

def point_in_polygon(point, polygon):
    x, y = point
    inside = False
    n = len(polygon)
    p1x, p1y = polygon[0]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def normalize_text(text):
    if not text:
        return ""
    import re
    return re.sub(r'[^a-z0-9]+', ' ', text.lower()).strip()

keywords = ['nagercoil', 'ramanputhoor', 'ramanputhur']
expected = "nagercoil"

try:
    conn = psycopg2.connect("dbname=kaaval_ai user=kaaval password=kaaval@123 host=localhost")
    cur = conn.cursor()
    cur.execute("SELECT id, created_at, camera_id, status, location_lat, location_lng, metadata, vehicle_number FROM violations WHERE is_deleted = false;")
    
    all_violations = cur.fetchall()
    print("TOTAL ACTIVE VIOLATIONS IN DB:", len(all_violations))
    
    accessible = []
    for row in all_violations:
        v_id, created_at, camera_id, status, lat, lng, metadata_raw, vehicle_number = row
        
        metadata = {}
        if metadata_raw:
            if isinstance(metadata_raw, str):
                try:
                    metadata = json.loads(metadata_raw)
                except Exception:
                    metadata = {}
            elif isinstance(metadata_raw, dict):
                metadata = metadata_raw
        
        # getViolationSubdivisionText
        subdivision_text = metadata.get('subdivision') or metadata.get('division') or metadata.get('region') or ""
        explicit_subdivision = normalize_text(subdivision_text)
        
        has_access = False
        if explicit_subdivision:
            if explicit_subdivision == expected:
                has_access = True
            else:
                has_access = any(k in explicit_subdivision for k in keywords)
        elif lat is not None and lng is not None:
            has_access = point_in_polygon([lng, lat], nagercoil_polygon)
        else:
            # getViolationLocationText
            location_text = metadata.get('location') or metadata.get('location_name') or camera_id or ""
            text = normalize_text(location_text)
            if text:
                has_access = any(k in text for k in keywords)
                
        if has_access:
            accessible.append(row)
            
    print("TOTAL ACCESSIBLE BY NAGERCOIL_ADMIN:", len(accessible))
    
    # Sort by created_at DESC
    accessible.sort(key=lambda x: x[1], reverse=True)
    
    print("\nTOP 15 ACCESSIBLE VIOLATIONS:")
    for row in accessible[:15]:
        print(f"ID: {row[0]} | TS: {row[1]} | CAM: {row[2]} | STATUS: {row[3]} | VEHICLE: {row[7]} | METADATA: {json.dumps(row[6]) if isinstance(row[6], dict) else row[6]}")
        
except Exception as e:
    print("ERROR:", e)
