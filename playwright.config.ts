import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
if (existsSync('.env.local')) for (const line of readFileSync('.env.local', 'utf8').split('\n')) { const split = line.indexOf('='); if (split > 0 && !line.startsWith('#')) process.env[line.slice(0, split)] ??= line.slice(split + 1); }
export default defineConfig({
  testDir: './tests/e2e', timeout: 90000, expect: { timeout: 15000 }, fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'off', screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }, { name: 'tablet', use: { ...devices['iPad Pro 11'], defaultBrowserType: 'chromium' } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: { command: 'npm run start', url: 'http://127.0.0.1:3000/api/health', reuseExistingServer: !process.env.CI, timeout: 120000 },
});
