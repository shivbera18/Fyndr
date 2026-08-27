const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const flaskDir = path.join(rootDir, 'flask-server-2');
const venvDir = path.join(flaskDir, 'venv');

function run(cmd, args, opts = {}) {
  console.log(`[setup] > ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: rootDir, ...opts });
  if (res.status !== 0) {
    console.error(`[setup] Command failed: ${cmd} ${args.join(' ')}`);
    process.exit(res.status || 1);
  }
}

console.log('[setup] 1/3 Installing node-server-1 dependencies...');
run('npm', ['install', '--prefix', 'node-server-1']);

console.log('[setup] 2/3 Installing front-end dependencies...');
run('npm', ['install', '--prefix', 'front-end']);

console.log('[setup] 3/3 Setting up Python venv for flask-server-2...');
const pythonCmd = spawnSync('python', ['--version'], { shell: true }).status === 0 ? 'python' : 'python3';

if (!fs.existsSync(venvDir)) {
  run(pythonCmd, ['-m', 'venv', path.join('flask-server-2', 'venv')]);
} else {
  console.log('[setup] venv already exists at flask-server-2/venv');
}

const winPip = path.join(venvDir, 'Scripts', 'pip.exe');
const unixPip = path.join(venvDir, 'bin', 'pip');
const pipCmd = fs.existsSync(winPip) ? winPip : (fs.existsSync(unixPip) ? unixPip : 'pip');

const reqFile = path.join('flask-server-2', 'requirements.txt');
if (fs.existsSync(path.join(rootDir, reqFile))) {
  run(pipCmd, ['install', '-r', reqFile]);
}

console.log('✅ [setup] Fyndr setup completed successfully!');
