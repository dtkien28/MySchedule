import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../testing/frontend_test',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120 * 1000,
    env: {
      VITE_API_URL: 'http://localhost:5173/api'
    }
  },
});
