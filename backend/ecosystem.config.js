// PM2 Ecosystem configuration for Propszy Backend on AWS (EC2 / VPS)
// Documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: 'propszy-backend',
      script: 'src/server.js',
      cwd: __dirname,
      instances: 'max', // Use all CPU cores in cluster mode, or set to 1
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5050,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5050,
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
