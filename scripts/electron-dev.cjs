const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const path = require('node:path');
const process = require('node:process');

const rootDir = path.resolve(__dirname, '..');
const frontendHost = '127.0.0.1';
const frontendPort = '5173';
const apiPort = '3001';
const electronBin = process.platform === 'win32'
  ? path.join(rootDir, 'node_modules', '.bin', 'electron.cmd')
  : path.join(rootDir, 'node_modules', '.bin', 'electron');

function spawnLogged(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, ...options.env },
    shell: false,
  });
  return child;
}

async function waitFor(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`unexpected status ${response.status} from ${url}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError ?? new Error(`timed out waiting for ${url}`);
}

async function main() {
  const api = spawnLogged('npm', ['run', 'server'], {
    env: { PORT: apiPort },
  });
  const frontend = spawnLogged('npm', ['run', 'dev', '--', '--host', frontendHost, '--port', frontendPort]);
  let electron = null;

  const shutdown = () => {
    for (const child of [electron, frontend, api]) {
      if (child && !child.killed) {
        child.kill('SIGTERM');
      }
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', shutdown);

  await waitFor(`http://${frontendHost}:${frontendPort}`);
  await waitFor(`http://${frontendHost}:${apiPort}/api/health`);

  electron = spawnLogged(electronBin, ['electron/main.cjs'], {
    env: {
      GODNOTE_FRONTEND_URL: `http://${frontendHost}:${frontendPort}`,
      GODNOTE_API_URL: `http://${frontendHost}:${apiPort}`,
      GODNOTE_ELECTRON_DEV: '1',
    },
  });

  electron.on('exit', (code, signal) => {
    shutdown();
    process.exitCode = code ?? (signal ? 1 : 0);
  });

  frontend.on('exit', (code, signal) => {
    if (code !== 0 && !signal) {
      shutdown();
      process.exitCode = code ?? 1;
    }
  });

  api.on('exit', (code, signal) => {
    if (code !== 0 && !signal) {
      shutdown();
      process.exitCode = code ?? 1;
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
