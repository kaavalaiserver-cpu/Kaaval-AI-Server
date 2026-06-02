#!/bin/bash
set -e
cd "/home/ec2-user/kaaval-ai/admin dashboard/kaaval_dashboard"
echo "VITE_API_BASE=/api" > .env
npm run build
sudo rm -rf /usr/share/nginx/html/*
sudo cp -r dist/* /usr/share/nginx/html/
sudo systemctl restart nginx
