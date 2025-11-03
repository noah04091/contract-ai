// 🎭 playwright.config.ts - Playwright E2E test configuration

import { defineConfig, devices } from '@playwright/test';

// Read environment variables
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const E2E_SIGN_URL = process.env.E2E_SIGN_URL || '';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  // Run tests in parallel (default)
  fullyParallel: true,

  // Fail build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter
  reporter: process.env.CI
    ? [['github'], ['html']]
    : [['list'], ['html']],

  // Shared settings for all projects
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Test projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server before starting tests (optional)
  // Uncomment if you want Playwright to start the dev server automatically
  // webServer: {
  //   command: 'npm run dev',
  //   url: BASE_URL,
  //   reuseExistingServer: !process.env.CI,
  // },
});
