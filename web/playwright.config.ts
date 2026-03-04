import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.e2e.local if it exists, otherwise .env.e2e
const envFile = path.resolve(__dirname, '.env.e2e.local');
const fallbackEnvFile = path.resolve(__dirname, '.env.e2e');
try {
  dotenv.config({ path: envFile });
} catch {
  dotenv.config({ path: fallbackEnvFile });
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential execution for crawlers
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Sequential crawling - one page at a time
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.E2E_VIDEO === 'on' ? 'on' : 'off',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: process.env.E2E_HEADED !== 'true',
      },
    },
  ],
  webServer: process.env.E2E_SKIP_SERVER ? undefined : {
    command: 'npm run dev',
    url: process.env.E2E_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  globalTimeout: 3600000, // 1 hour
});
