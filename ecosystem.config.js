module.exports = {
  apps: [{
    name: 'logguard-website',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 8000,
      HOST: '0.0.0.0',
      DOMAIN: 'localhost'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8000,
      HOST: '0.0.0.0',
      DOMAIN: 'yourdomain.com'
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 8000,
      HOST: '0.0.0.0',
      DOMAIN: 'staging.yourdomain.com'
    },
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000
  }]
}; 