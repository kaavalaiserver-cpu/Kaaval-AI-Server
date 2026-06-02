#!/bin/bash
set -e
sudo rm -rf /home/ec2-user/kaaval-ai
git clone https://github.com/SajivJess/Kaaval-AI.git /home/ec2-user/kaaval-ai

cd "/home/ec2-user/kaaval-ai/admin dashboard/kaaval-backend"
npm install
npm run build

cd "/home/ec2-user/kaaval-ai/kaaval_api"
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd "/home/ec2-user/kaaval-ai/admin dashboard/kaaval_dashboard"
npm install
npm run build
sudo rm -rf /usr/share/nginx/html/*
sudo cp -r dist/* /usr/share/nginx/html/
