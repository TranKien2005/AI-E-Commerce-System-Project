import { expect, test } from '@playwright/test';

test.describe('Aeris storefront public flow', () => {
  test('renders the public marketplace shell in English', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Aeris Market/i })).toBeVisible();
    await expect(page.getByLabel('Search', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cart/i })).toBeVisible();
  });

  test('opens products and search UI in English', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByPlaceholder(/Search products/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Search$/i }).last()).toBeVisible();
  });
});
