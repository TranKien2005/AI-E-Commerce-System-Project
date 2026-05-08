import { test, expect } from '@playwright/test';

test.describe('Aeris E-Commerce Full Flow', () => {
  test('should complete a full purchase flow', async ({ page }) => {
    // 1. Home Page
    await page.goto('/');
    await expect(page.locator('h1')).toContainText(/Purity/i);
    
    // 2. Navigate to Products
    await page.click('text=Khám phá tất cả');
    await expect(page).toHaveURL(/\/products/);
    
    // 3. Select a product
    await page.click('text=Aeris A9');
    await expect(page).toHaveURL(/\/products\/\d+/);
    
    // 4. Add to cart
    const addToCartBtn = page.getByRole('button', { name: /Thêm vào giỏ hàng/i });
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();
    
    // Wait for success state (simulated in UI with 1.2s delay)
    await expect(page.getByText('Đã thêm thành công')).toBeVisible({ timeout: 10000 });
    
    // 5. Go to Cart
    await page.getByLabel('Cart').click();
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.locator('h1')).toContainText(/Giỏ hàng/i);
    
    // 6. Proceed to Checkout
    await page.click('text=Thanh toán ngay');
    await expect(page).toHaveURL(/\/checkout/);
    
    // 7. Fill Shipping Info
    await page.getByPlaceholder('Nguyễn Văn A').fill('Nguyễn Văn B');
    await page.getByPlaceholder('090 123 4567').fill('0123456789');
    await page.getByPlaceholder('Số nhà, tên đường...').fill('123 Đường ABC');
    
    // Click "Tiếp tục" - wait for step 2 (Payment)
    await page.click('text=Tiếp theo');
    
    // 8. Payment Step
    await expect(page.getByText('Phương thức thanh toán')).toBeVisible();
    await page.click('text=Xác nhận đặt hàng');
    
    // 9. Success State
    await expect(page.getByText('Đặt hàng thành công!')).toBeVisible({ timeout: 15000 });
    
    // 10. Back to Home (via Logo)
    await page.click('text=Aeris.');
    await expect(page).toHaveURL('/');
  });
  
  test('should search using AI search overlay', async ({ page }) => {
    await page.goto('/products');
    
    // Open search
    await page.getByLabel('Search').click();
    // Using longer timeout for animation
    await expect(page.getByText('Bạn muốn tìm gì?')).toBeVisible({ timeout: 10000 });
    
    // Type something
    const searchInput = page.getByPlaceholder('Hỏi Aeris về bất cứ điều gì...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Máy lọc không khí tốt nhất');
    
    // Check suggestions
    await expect(page.getByText('Gợi ý cho bạn')).toBeVisible({ timeout: 10000 });
    
    // Close search
    await page.keyboard.press('Escape');
    await expect(page.getByText('Bạn muốn tìm gì?')).not.toBeVisible();
  });
});
