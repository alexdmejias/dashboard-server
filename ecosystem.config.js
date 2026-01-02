module.exports = {
  apps: [
    {
      name: "dashboard-server",
      script: "./dist/index.js",
      cwd: process.env.GITHUB_WORKSPACE || "/home/pi/projects/dashboard-server",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
    },
  ],
};
