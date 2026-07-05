#!/usr/bin/env python3
import psycopg2
import os

DB_URL = 'postgresql://kaaval:kaaval%40123@localhost:5432/kaaval_ai'

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    cur.execute("SELECT count(*) FROM violations;")
    total = cur.fetchone()[0]
    
    cur.execute("SELECT count(*) FROM violations WHERE image_url IS NOT NULL;")
    with_img = cur.fetchone()[0]
    
    cur.execute("SELECT count(*) FROM violations WHERE status = 'REJECTED';")
    rejected = cur.fetchone()[0]
    
    cur.execute("SELECT count(*) FROM violations WHERE status = 'VERIFIED';")
    verified = cur.fetchone()[0]
    
    cur.execute("SELECT count(*) FROM violations WHERE status = 'PENDING';")
    pending = cur.fetchone()[0]

    print(f"Total Violations: {total}")
    print(f"Violations with image_url: {with_img}")
    print(f"Rejected: {rejected}")
    print(f"Verified: {verified}")
    print(f"Pending: {pending}")

    conn.close()

if __name__ == '__main__':
    main()
