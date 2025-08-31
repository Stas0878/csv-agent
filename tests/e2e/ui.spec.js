const { test, expect } = require('@playwright/test');

const SELECTORS = {
  tabs: {
    terminal: 'text=Терминал',
    admin: 'text=Админ',
    history: 'text=История',
  },
  glowSelect: 'button[role="combobox"]:has-text("Свечение логотипа")',
};

async function switchGlow(page, label) {
  await page.getByText('Свечение логотипа').locator('..').locator('button[role="combobox"]').click({ force: true });
  await page.getByRole('option', { name: label, exact: true }).click({ force: true });
}

test.describe('MegaMind_X UI smoke', () => {
  test('navigate tabs and history load', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Терминал', { exact: true }).click();
    await page.getByText('Админ', { exact: true }).click();
    await page.getByText('История', { exact: true }).click();
    // If history has items, try the first Load button
    const loadBtn = page.getByRole('button', { name: 'Load' }).first();
    if (await loadBtn.count()) {
      await loadBtn.click({ force: true });
    }
    await expect(page).toHaveTitle(/.*/);
  });

  test('logo glow levels soft/medium/strong', async ({ page }) => {
    await page.goto('/');
    await switchGlow(page, 'Мягкое');
    await switchGlow(page, 'Среднее');
    await switchGlow(page, 'Яркое');
  });
});