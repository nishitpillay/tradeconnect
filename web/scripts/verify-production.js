const { spawn, spawnSync } = require('child_process');
const path = require('path');

const nextCli = require.resolve('next/dist/bin/next');
const env = {
  ...process.env,
  NEXT_DIST_DIR: '.next-verify',
  PORT: process.env.PORT || '3002',
};

function runSync(args) {
  const result = spawnSync(process.execPath, [nextCli, ...args], {
    stdio: 'inherit',
    env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function waitForHttp(url, timeoutMs) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const response = await fetch(url);
        if (response.status >= 200 && response.status < 500) {
          resolve(response.status);
          return;
        }
      } catch {}

      if (Date.now() - started >= timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }

      setTimeout(attempt, 2000);
    };

    attempt();
  });
}

async function main() {
  runSync(['build']);

  const server = spawn(process.execPath, [nextCli, 'start', '-p', env.PORT], {
    stdio: 'inherit',
    env,
  });

  try {
    await waitForHttp(`http://127.0.0.1:${env.PORT}/pricing`, 120000);
  } finally {
    if (!server.killed) {
      server.kill('SIGTERM');
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
