import { expect, test } from '@playwright/test';

test.describe('Admin console', () => {
  test('renders admin login in English', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Admin sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Admin email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
  });

  const pages = [
    ['/', /Operations dashboard|Sign in as an admin/i],
    ['/users', /Users & roles|Sign in as an admin/i],
    ['/seller-requests', /Seller requests|Sign in as an admin/i],
    ['/reports', /Reports & moderation|Sign in as an admin/i],
    ['/metrics', /Metrics|Sign in as an admin/i],
    ['/logs', /System logs|Sign in as an admin/i],
    ['/audit-logs', /Audit logs|Sign in as an admin/i],
  ] as const;

  for (const [path, heading] of pages) {
    test(`renders ${path} in English`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(heading).first()).toBeVisible();
      await expect(page.getByText(/Đăng|Quản|Người|Yêu|Báo|Thống|Nhật|Không thể/)).toHaveCount(0);
    });
  }
});
