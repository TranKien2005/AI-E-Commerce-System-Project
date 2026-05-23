import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'storefront',
      testMatch: /.*(?:flow|seller)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3000' },
    },
    {
      name: 'admin',
      testMatch: /.*admin\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3001' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:storefront',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev:admin',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
