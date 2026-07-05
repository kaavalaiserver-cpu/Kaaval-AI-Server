#!/usr/bin/env python3
import sys
import os

print("1. Importing psycopg2...")
import psycopg2
print("2. Importing boto3...")
import boto3
print("3. Connecting to database...")
conn = psycopg2.connect('postgresql://kaaval:kaaval%40123@localhost:5432/kaaval_ai')
print("4. Database connected! Querying...")
cur = conn.cursor()
cur.execute("SELECT count(*) FROM violations;")
print(f"5. Count: {cur.fetchone()[0]}")
conn.close()

print("6. Creating S3 client...")
s3 = boto3.client('s3', region_name='ap-south-1')
print("7. S3 client created! Listing buckets...")
try:
    s3.list_buckets()
    print("8. Buckets listed successfully!")
except Exception as e:
    print(f"8. Error listing buckets: {e}")
