const { test, expect } = require('@playwright/test');

// E2E tests for Preview Overlay (iframe)
// Validates:
// - iframe src uses origin+pathname with ?embed=1 and _={nonce}
// - iframe renders actual app content
// - "Open in new tab" opens popup with ?embed=1 and renders
// - "Refresh" regenerates nonce and reloads iframe

test.describe('Preview Overlay - iframe behavior', () => {
  const base = process.env.E2E_BASE_URL || 'http://localhost:3000';

  test('Loads iframe with correct URL and renders content; refresh & open-in-new-tab work', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await page.goto(base);

    // Open preview overlay
    const previewBtn = page.getByRole('button', { name: /Предпросмотр|Preview/ });
    await previewBtn.click();

    // Wait for animation + iframe presence
    const iframeEl = page.locator('iframe[title="Live Preview"]');
    await expect(iframeEl).toBeVisible();

    // Check iframe src
    const pageUrl = new URL(await page.url());
    const expectedBase = pageUrl.origin + pageUrl.pathname;
    const src1 = await iframeEl.getAttribute('src');
    expect(src1).toBeTruthy();
    expect(src1.startsWith(expectedBase)).toBeTruthy();
    expect(src1.includes('embed=1')).toBeTruthy();
    expect(src1.includes('_=')).toBeTruthy();

    // Ensure content rendered inside iframe (RU or EN)
    const frame = await iframeEl.elementHandle();
    const iframe = await frame.contentFrame();
    await expect(iframe.getByText(/Терминал|Terminal/)).toBeVisible();

    // Refresh preview -> src (nonce) should change and content should still be visible
    const prevSrc = src1;
    const refreshBtn = page.getByRole('button', { name: /Обновить|Refresh preview/ });
    await refreshBtn.click();
    await expect.poll(async () => await iframeEl.getAttribute('src')).not.toBe(prevSrc);

    // Wait content after reload
    const iframe2 = await (await iframeEl.elementHandle()).contentFrame();
    await expect(iframe2.getByText(/Терминал|Terminal/)).toBeVisible();

    // Open in new tab -> popup should open with ?embed=1 and render
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /Открыть в новой вкладке|Open in new tab/ }).click(),
    ]);

    await popup.waitForLoadState('domcontentloaded');
    const popupUrl = new URL(popup.url());
    expect(popupUrl.searchParams.get('embed')).toBe('1');
    await expect(popup.getByText(/Терминал|Terminal/)).toBeVisible();
  });
});