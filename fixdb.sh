#!/bin/bash
sudo -u postgres psql -c "ALTER USER kaaval WITH PASSWORD 'kaaval@123';"
sudo -u postgres psql -c "\du"
PGPASSWORD='kaaval@123' psql -U kaaval -h localhost -d kaaval_ai -c "SELECT 1;" && echo "DB CONNECTION OK"
