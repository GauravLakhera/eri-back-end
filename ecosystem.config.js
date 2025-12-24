module.exports = {
  apps: [
    {
      name: 'eri-backend',
      script: './dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
    },
  ],
};