sudo -u postgres psql -c "CREATE USER kaaval WITH PASSWORD 'kaaval@123';"
sudo -u postgres psql -c "CREATE DATABASE kaaval_ai OWNER kaaval;"
sudo -u postgres psql -c "ALTER USER kaaval CREATEDB;"
sudo sed -i 's/ident/md5/g' /var/lib/pgsql/data/pg_hba.conf
sudo systemctl restart postgresql
