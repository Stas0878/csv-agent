// Basic Playwright config for CI
// Run with: npx playwright test
/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
  reporter: [['list']]
};
module.exports = config;