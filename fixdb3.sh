#!/bin/bash
# Temporarily allow postgres user to login without password via socket
sudo sed -i '1i local   all             postgres                                trust' /var/lib/pgsql/data/pg_hba.conf
sudo systemctl restart postgresql
sleep 2

# Now set passwords for both postgres and kaaval
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres@123';"
psql -U postgres -c "ALTER USER kaaval WITH PASSWORD 'kaaval@123';"

# Revert postgres back to md5 now that it has a password
sudo sed -i '1d' /var/lib/pgsql/data/pg_hba.conf
sudo systemctl restart postgresql
sleep 2

# Test final connection
PGPASSWORD='kaaval@123' psql -U kaaval -h 127.0.0.1 -d kaaval_ai -c "SELECT 'CONNECTION_OK' as status;"
