const { test, expect } = require('@playwright/test');

const url = process.env.E2E_BASE_URL || 'http://localhost:3000';

// Helper to open Admin overlay
async function openAdmin(page) {
  const btn = page.getByRole('button', { name: /Админ|Admin/ });
  await btn.click();
  await expect(page.getByText(/Admin Settings/)).toBeVisible();
}

test.describe('ValidationEngine basics', () => {
  test('Tabs: cannot disable all tabs', async ({ page }) => {
    await page.goto(url);
    await openAdmin(page);
    // find all tab checkboxes and try disable all
    const checkboxes = page.locator('div:has-text("Tabs")').locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const cb = checkboxes.nth(i);
      const checked = await cb.isChecked();
      if (checked) await cb.click();
    }
    // Expect error banner
    const err = page.getByText(/At least one tab must be enabled|System tab missing|Tabs order has duplicates/);
    await expect(err).toBeVisible();
  });

  test('Panels: cannot drag left panel into topbar (critical zone) or outside screen', async ({ page }) => {
    await page.goto(url);
    await openAdmin(page);
    const left = page.locator('[data-testid="drag-left"]');
    await expect(left).toBeVisible();
    const topbar = page.locator('[data-testid="topbar"]');
    const tb = await topbar.boundingBox();
    const lb = await left.boundingBox();
    // Try drag left panel upward into topbar area
    await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
    await page.mouse.down();
    await page.mouse.move(lb.x + lb.width / 2, lb.y - (tb.height + 40));
    await page.mouse.up();
    // Should be blocked: left panel top should remain >= 0 and below topbar
    const lb2 = await left.boundingBox();
    expect(lb2.y).toBeGreaterThanOrEqual(tb.y + tb.height - 1);
  });

  test('Features: toggling off all feature flags does not break composer', async ({ page }) => {
    await page.goto(url);
    await openAdmin(page);
    const voice = page.getByText(/Voice input/).locator('..').locator('input');
    const dnd = page.getByText(/Drag & Drop/).locator('..').locator('input');
    const counter = page.getByText(/Counter/).locator('..').locator('input');
    // Switch all off
    if (await voice.isChecked()) await voice.click();
    if (await dnd.isChecked()) await dnd.click();
    if (await counter.isChecked()) await counter.click();
    // Close admin
    await page.getByRole('button', { name: /Close/ }).click();
    // Ensure composer still visible (Send/Отправить button)
    const sendBtn = page.getByRole('button', { name: /Отправить|Send|Сохранить|Save/ });
    await expect(sendBtn.first()).toBeVisible();
  });
});