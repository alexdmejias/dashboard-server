module.exports = {
  apps: [
    {
      name: "dashboard-server",
      script: "npm",
      args: "run start:prod",
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
