const { test, expect } = require('@playwright/test');

// Basic responsive checks without relying on backend
// Verifies: sidebars auto-collapse on small widths, overlays appear, InputComposer visible,
// and terminal header stays sticky while scrolling content

test.describe('Responsive layout', () => {
  const url = process.env.E2E_BASE_URL || 'http://localhost:3000';

  test('Desktop layout shows inline sidebars', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.goto(url);
    // Left expand button should be hidden on desktop when sidebar is open
    const leftInline = page.locator('aside[aria-label="Left sidebar"]');
    await expect(leftInline).toBeVisible();
    const rightExpandBtn = page.locator('button[aria-label="Open right sidebar"]');
    await expect(rightExpandBtn).toBeVisible();
  });

  test('Mobile overlays and composer pinned', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(url);

    // Floating buttons should appear
    const leftOpenBtn = page.locator('button[aria-label="Open left sidebar"]');
    await expect(leftOpenBtn).toBeVisible();

    // Open left overlay
    await leftOpenBtn.click();
    const leftOverlay = page.locator('[aria-label="Left sidebar overlay"]');
    await expect(leftOverlay).toBeVisible();
    // Close via backdrop
    await page.locator('[aria-label="Close left sidebar backdrop"]').click();
    await expect(leftOverlay).toBeHidden();

    // Ensure InputComposer is visible at bottom
    const sendButton = page.getByRole('button', { name: 'Отправить' });
    await expect(sendButton).toBeVisible();

    // Scroll terminal content and check header remains visible
    const terminalHeader = page.getByText('Терминал');
    await page.mouse.wheel(0, 600);
    await expect(terminalHeader).toBeVisible();
  });
});