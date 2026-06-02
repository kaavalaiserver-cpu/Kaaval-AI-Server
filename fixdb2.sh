#!/bin/bash
echo "ALTER USER kaaval WITH PASSWORD 'kaaval@123';" | sudo -u postgres psql
PGPASSWORD='kaaval@123' psql -U kaaval -h 127.0.0.1 -d kaaval_ai -c "SELECT 1;" && echo "DB_CONNECTION_OK"
