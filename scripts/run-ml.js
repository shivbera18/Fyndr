const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const flaskDir = path.join(rootDir, 'flask-server-2');

const winVenvPython = path.join(flaskDir, 'venv', 'Scripts', 'python.exe');
const unixVenvPython = path.join(flaskDir, 'venv', 'bin', 'python');

let pythonCmd = null;

if (fs.existsSync(winVenvPython)) {
  pythonCmd = winVenvPython;
} else if (fs.existsSync(unixVenvPython)) {
  pythonCmd = unixVenvPython;
} else {
  // Check system python / python3
  const hasPython = spawnSync('python', ['--version'], { shell: true }).status === 0;
  const hasPython3 = !hasPython && spawnSync('python3', ['--version'], { shell: true }).status === 0;

  if (hasPython) {
    pythonCmd = 'python';
    console.log('[ml] Notice: flask-server-2/venv not configured; using system python. Run "npm run setup" to create venv.');
  } else if (hasPython3) {
    pythonCmd = 'python3';
    console.log('[ml] Notice: flask-server-2/venv not configured; using system python3. Run "npm run setup" to create venv.');
  } else {
    console.error('[ml] Error: Python 3 not found. Please install Python 3.9+ and run "npm run setup".');
    process.exit(1);
  }
}

const child = spawn(pythonCmd, ['app.py'], {
  cwd: flaskDir,
  stdio: 'inherit',
  shell: process.platform === 'win32' && !pythonCmd.endsWith('.exe')
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code || 0);
  }
});
