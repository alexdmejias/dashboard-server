module.exports = {
  apps: [
    {
      name: "dashboard-server",
      script: "./dist/index.js",
      // cwd is omitted - PM2 will use the directory from which it's started
      // This makes the config portable and works with GitHub Actions
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        LOG_LEVEL: "debug",
      },
      time: true,
    },
  ],
};
