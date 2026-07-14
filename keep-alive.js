const { spawn } = require('child_process');
const http = require('http');

const PORT = 3000;
let child = null;
let restarting = false;

function startServer() {
  if (restarting) return;
  restarting = true;
  
  if (child) {
    try { child.kill('SIGTERM'); } catch {}
  }
  
  setTimeout(() => {
    child = spawn('node', [
      '/home/z/my-project/node_modules/.bin/next',
      'start', '-p', String(PORT)
    ], {
      cwd: '/home/z/my-project',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
      detached: false,
    });

    child.stdout.on('data', () => {}); // drain
    child.stderr.on('data', () => {}); // drain

    child.on('exit', () => {
      restarting = false;
      setTimeout(startServer, 300);
    });

    child.on('error', () => {
      restarting = false;
      setTimeout(startServer, 300);
    });
  }, 200);
}

startServer();

// Keep this process and the child alive with periodic pings
setInterval(() => {
  const req = http.get(`http://127.0.0.1:${PORT}/api/admin/global-stats`, (res) => {
    res.on('data', () => {});
  });
  req.on('error', () => {
    // Server not responding, will be restarted by child exit handler
  });
  req.setTimeout(3000, () => { req.destroy(); });
}, 3000);

// Also keep the event loop busy
setInterval(() => {}, 10000);