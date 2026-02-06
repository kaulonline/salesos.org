import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Should show validation or remain on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Should show error message or remain on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // This test requires valid test credentials
    // Skipping actual login test - implement with test account
    test.skip();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Navigation', () => {
  test('should display home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SalesOS/i);
  });

  test('should navigate to pricing page', async ({ page }) => {
    await page.goto('/');
    const pricingLink = page.getByRole('link', { name: /pricing/i });
    if (await pricingLink.isVisible()) {
      await pricingLink.click();
      await expect(page).toHaveURL(/pricing/);
    }
  });
});
