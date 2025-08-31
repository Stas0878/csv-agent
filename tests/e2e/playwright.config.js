/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: __dirname,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  outputDir: __dirname + '/playwright-artifacts',
  reporter: [
    ['list'],
    ['json', { outputFile: __dirname + '/playwright-report/report.json' }],
    ['html', { outputFolder: __dirname + '/playwright-html', open: 'never' }],
  ],
};
module.exports = config;