const net = require('net');
const { execSync } = require('child_process');

function checkPort(port, host, callback) {
  const socket = new net.Socket();
  socket.setTimeout(1000);
  socket.on('connect', () => {
    socket.destroy();
    callback(true);
  });
  socket.on('error', () => {
    socket.destroy();
    callback(false);
  });
  socket.on('timeout', () => {
    socket.destroy();
    callback(false);
  });
  socket.connect(port, host);
}

checkPort(27017, '127.0.0.1', (isRunning) => {
  if (isRunning) {
    console.log('[mongo] MongoDB is already running on 127.0.0.1:27017.');
  } else {
    try {
      console.log('[mongo] Starting MongoDB via docker compose...');
      execSync('docker compose -f docker-compose.dev.yml up -d mongo --wait', { stdio: 'inherit' });
    } catch (err) {
      console.warn('[mongo] Warning: Could not start MongoDB via Docker. Ensure MongoDB is running on port 27017.');
    }
  }
});
