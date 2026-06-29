// Luggik - PM2 Ecosystem Config
// Run with: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "luggik-api",
      script: "index.ts",
      interpreter: "tsx",
      cwd: "/var/www/luggik",
      watch: false,
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3008,
      },
      // Logs
      out_file: "/var/log/luggik/api-out.log",
      error_file: "/var/log/luggik/api-err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
