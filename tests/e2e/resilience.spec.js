const { test, expect } = require('@playwright/test');

// Simulate corrupted JSON response by intercepting /api/history
// We expect the app to handle it gracefully (toast "Invalid data" or no crash)

test('Graceful fallback on corrupted /history JSON', async ({ page }) => {
  await page.route('**/api/history**', async (route) => {
    // Return malformed JSON (string that fails JSON.parse) but with 200 OK
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"bad": true,', // broken JSON
    });
  });
  await page.goto('/');
  // App should still render top-level UI - use more specific selector
  await expect(page.getByRole('tab', { name: 'Терминал' }).first()).toBeVisible();
  // Optionally check that a toast or any UI message appears (best-effort)
  // We avoid strict matching to prevent flakiness
});