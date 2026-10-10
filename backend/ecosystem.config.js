/**
 * ecosystem.config.js
 * Konfigurasi PM2 untuk production deployment (Fase 11).
 *
 * Referensi: SDD §9.1–9.5
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 reload ecosystem.config.js
 *   pm2 stop kendis-market-api
 *   pm2 logs kendis-market-api
 */

module.exports = {
  apps: [
    {
      name: 'kendis-market-api',
      script: './dist/server.js',
      instances: 'max', // Gunakan semua CPU cores (atau set ke angka spesifik, mis. 2)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      // Graceful shutdown: tunggu max 10 detik sebelum force kill
      kill_timeout: 10000,
      // Auto-restart jika crash
      autorestart: true,
      // Max memory threshold sebelum restart
      max_memory_restart: '500M',
      // Log configuration
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Restart delay
      restart_delay: 4000,
      // Watch & reload on file change (disable di production)
      watch: false,
      // Min uptime sebelum dianggap "stable"
      min_uptime: '10s',
      // Max restart dalam window waktu
      max_restarts: 10,
      // Environment variables override (optional, prioritaskan .env)
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
