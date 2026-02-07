import { Page, expect } from '@playwright/test';

/**
 * Test credentials for E2E tests
 * These should be configured via environment variables in CI
 */
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@salesos.org',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
  name: 'Test User',
};

const TEST_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@salesos.org',
  password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
  name: 'Test Admin',
};

/**
 * Login with test user credentials
 */
export async function login(
  page: Page,
  credentials: { email: string; password: string } = TEST_USER
): Promise<void> {
  await page.goto('/login');

  // Wait for the login form to be visible
  await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10000 });

  // Fill in credentials
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);

  // Click sign in
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation to dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

/**
 * Login with test user and wait for page to be ready
 */
export async function loginAsUser(page: Page): Promise<void> {
  await login(page, TEST_USER);
  // Wait for dashboard to be fully loaded
  await page.waitForLoadState('networkidle');
}

/**
 * Login with admin credentials
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await login(page, TEST_ADMIN);
  await page.waitForLoadState('networkidle');
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  // Try to find and click logout button/link
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  const logoutLink = page.getByRole('link', { name: /logout|sign out/i });

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  } else if (await logoutLink.isVisible()) {
    await logoutLink.click();
  } else {
    // Fallback: clear localStorage and navigate to login
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
    await page.goto('/login');
  }

  await expect(page).toHaveURL(/login/);
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  return token !== null;
}

/**
 * Get the auth token from localStorage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('token'));
}

/**
 * Set auth token directly (for API-based login)
 */
export async function setAuthToken(page: Page, token: string): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
  }, token);
}

/**
 * Clear all auth state
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.clear();
  });
}

export { TEST_USER, TEST_ADMIN };
