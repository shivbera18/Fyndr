module.exports = {
  apps: [
    {
      name: 'fyndr-api',
      cwd: './node-server-1',
      script: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      restart_delay: 3000,
      max_memory_restart: '1G',
    },
    {
      name: 'fyndr-ml',
      cwd: './flask-server-2',
      script: 'app.py',
      interpreter: './venv/bin/python',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      restart_delay: 3000,
      max_memory_restart: '3G',
    },
  ],
};
