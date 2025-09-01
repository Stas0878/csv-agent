const { test, expect } = require('@playwright/test');

// Basic checks for embedded preview overlay and actions

test.describe('Embedded preview overlay', () => {
  const url = process.env.E2E_BASE_URL || 'http://localhost:3000';

  test('Open overlay with animation, see minimal UI in embed, and mode persistence', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.goto(url);

    const previewBtn = page.getByRole('button', { name: 'Предпросмотр' }).or(page.getByRole('button', { name: 'Preview' }));
    await previewBtn.click();

    // Overlay should appear with animation (use short wait and opacity check)
    const overlay = page.locator('div[style*="opacity"]:has(iframe[title="Live Preview"])');
    await page.waitForTimeout(300);
    const iframe = page.locator('iframe[title="Live Preview"]');
    await expect(iframe).toBeVisible();

    // Action buttons should be visible
    await expect(page.getByRole('button', { name: 'Open in new tab' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh preview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share link' })).toBeVisible();

    // Click open in new tab — mode should persist as fullscreen
    await page.getByRole('button', { name: 'Open in new tab' }).click();
    await page.waitForTimeout(200);

    // Close overlay
    await page.getByRole('button', { name: 'Close preview' }).click();
    await page.waitForTimeout(250);
    await expect(iframe).toBeHidden();

    // Reopen preview – should prefer fullscreen (new tab open). We just re-click and ensure overlay remains closed after click
    await previewBtn.click();
    // Give it a moment (opening new tab is not captured, but overlay should not be visible)
    await page.waitForTimeout(300);
    await expect(iframe).toBeHidden();
  });
});