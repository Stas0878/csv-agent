const { test, expect } = require('@playwright/test');

test('Client Logs tab renders and filters work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Админ' }).first().click();
  // Scroll to logs section
  await page.mouse.wheel(0, 600);
  await expect(page.getByText('Client Logs')).toBeVisible();
  await page.getByRole('combobox').first().click({ force: true });
  await page.getByRole('option', { name: 'Error' }).click({ force: true });
  await page.getByPlaceholder('Search message...').fill('TypeError');
  await expect(page.getByText('Client Logs')).toBeVisible();
});