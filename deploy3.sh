#!/bin/bash
set -e

# Setup NestJS .env
cd "/home/ec2-user/kaaval-ai/admin dashboard/kaaval-backend"
cat << 'EOF' > .env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=kaaval
DB_PASS=kaaval@123
DB_NAME=kaaval_ai
JWT_SECRET=super_secret_jwt_key_kaaval_ai_2026
PORT=8003
EOF

# Setup FastAPI .env
cd "/home/ec2-user/kaaval-ai/kaaval_api"
cat << 'EOF' > .env
DATABASE_URL=postgresql://kaaval:kaaval@123@localhost/kaaval_ai
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
EOF

# Start PM2
cd "/home/ec2-user/kaaval-ai/admin dashboard/kaaval-backend"
pm2 start dist/main.js --name kaaval-backend

cd "/home/ec2-user/kaaval-ai/kaaval_api"
source venv/bin/activate
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8001" --name kaaval-fastapi

pm2 save
pm2 startup | tail -n 1 > startup.sh
chmod +x startup.sh
sudo ./startup.sh
rm startup.sh
