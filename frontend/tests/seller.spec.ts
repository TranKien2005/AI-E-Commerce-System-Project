import { expect, test } from '@playwright/test';

const sellerPages = [
  ['/', /Seller Center/i],
  ['/products', /Shop products|Seller sign in required/i],
  ['/products/new', /Create product|Sign in/i],
  ['/orders', /Seller orders|Seller sign in required/i],
  ['/shop', /Shop settings|Sign in/i],
  ['/stats', /Shop performance|Sign in/i],
  ['/chatbot', /Shop chatbot|Sign in/i],
] as const;

test.describe('Seller workspace', () => {
  for (const [path, heading] of sellerPages) {
    test(`renders ${path} with English seller UI`, async ({ page }) => {
      await page.goto(`/seller${path === '/' ? '' : path}`);
      await expect(page.getByText(/Overview/i).first()).toBeVisible();
      await expect(page.getByText(heading).first()).toBeVisible();
      await expect(page.getByText(/Sản|Đơn|Cửa|Thống|Đăng nhập|Lưu/)).toHaveCount(0);
    });
  }
});
