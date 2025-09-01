const { test, expect } = require('@playwright/test');

// Basic checks for embedded preview overlay and actions

test.describe('Embedded preview overlay', () => {
  const url = process.env.E2E_BASE_URL || 'http://localhost:3000';

  test('Open overlay and see iframe with actions', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.goto(url);

    const previewBtn = page.getByRole('button', { name: 'Предпросмотр' }).or(page.getByRole('button', { name: 'Preview' }));
    await previewBtn.click();

    // Overlay should appear with iframe
    const iframe = page.locator('iframe[title="Live Preview"]');
    await expect(iframe).toBeVisible();

    // Action buttons should be visible
    await expect(page.getByRole('button', { name: 'Open in new tab' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh preview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share link' })).toBeVisible();

    // Close overlay
    await page.getByRole('button', { name: 'Close preview' }).click();
    await expect(iframe).toBeHidden();
  });
});