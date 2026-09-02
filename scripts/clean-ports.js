const { execSync } = require('child_process');

const ports = [5000, 5001, 3000];
const myPid = process.pid;

if (process.platform === 'win32') {
  try {
    const netstat = execSync('netstat -ano', { encoding: 'utf8' });
    const lines = netstat.split('\n');
    const pidsToKill = new Set();

    for (const line of lines) {
      if (line.includes('LISTENING')) {
        for (const port of ports) {
          // match :5000 or :5001 or :3000 in address column
          if (new RegExp(`[:.]${port}\\s+`).test(line)) {
            const parts = line.trim().split(/\s+/);
            const pid = parseInt(parts[parts.length - 1], 10);
            if (pid && pid !== myPid && pid !== process.ppid) {
              pidsToKill.add(pid);
            }
          }
        }
      }
    }

    for (const pid of pidsToKill) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`[clean-ports] Freed port by terminating lingering process (PID ${pid})`);
      } catch (_) {}
    }
  } catch (_) {}
} else {
  for (const port of ports) {
    try {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    } catch (_) {}
  }
}
