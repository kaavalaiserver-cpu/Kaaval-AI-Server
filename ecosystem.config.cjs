// PM2 Ecosystem Configuration for Kaaval AI
// Usage: pm2 start ecosystem.config.cjs
// On EC2: pm2 start ecosystem.config.cjs --env production

module.exports = {
  apps: [
    {
      name: 'kaaval-backend',
      cwd: '/home/ubuntu/kaaval/admin dashboard/kaaval-backend',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 8003,
        DB_TYPE: 'sqlite',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8003,
        DB_TYPE: 'postgres',
      },
      error_file: '/home/ubuntu/logs/kaaval-backend-error.log',
      out_file: '/home/ubuntu/logs/kaaval-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'kaaval-api',
      cwd: '/home/ubuntu/kaaval/kaaval_api',
      script: 'uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8000 --workers 2',
      interpreter: 'python3',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      error_file: '/home/ubuntu/logs/kaaval-api-error.log',
      out_file: '/home/ubuntu/logs/kaaval-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
