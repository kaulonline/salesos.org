import { test, expect } from '@playwright/test';
import {
  loginAsUser,
  createDeal,
  generateQuoteData,
  testDataRegistry,
} from './helpers';

test.describe('Quotes Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test.afterEach(async ({ page }) => {
    await testDataRegistry.cleanup(page);
  });

  test('should display quotes list page', async ({ page }) => {
    await page.goto('/dashboard/quotes');
    await expect(page).toHaveURL(/quotes/);

    const heading = page.getByRole('heading', { name: /quotes/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should open create quote modal', async ({ page }) => {
    await page.goto('/dashboard/quotes');

    const createButton = page.getByRole('button', { name: /create|new|add/i }).first();
    await createButton.click();

    // Should show quote creation form
    const nameField = page.getByLabel(/name|title/i);
    await expect(nameField).toBeVisible();
  });

  test('should create a new quote', async ({ page }) => {
    await page.goto('/dashboard/quotes');

    const quoteData = generateQuoteData();

    // Open create modal
    const createButton = page.getByRole('button', { name: /create|new|add/i }).first();
    await createButton.click();

    // Fill basic info
    const nameField = page.getByLabel(/name|title/i).first();
    await nameField.fill(quoteData.name);

    // Set valid until date if field exists
    const dateField = page.getByLabel(/valid|expir/i);
    if (await dateField.isVisible()) {
      await dateField.fill(quoteData.validUntil);
    }

    // Save as draft or create
    await page.getByRole('button', { name: /save|create|draft/i }).click();
    await page.waitForLoadState('networkidle');

    // Verify quote was created
    const quoteName = page.getByText(quoteData.name);
    await expect(quoteName).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to quote detail', async ({ page }) => {
    await page.goto('/dashboard/quotes');
    await page.waitForLoadState('networkidle');

    // Click on a quote row/card
    const quoteRow = page.locator('tr, [data-testid="quote-card"]').first();
    if (await quoteRow.isVisible()) {
      await quoteRow.click();
      await page.waitForLoadState('networkidle');

      // Should show quote detail
      const detailPage = page.locator('[data-testid="quote-detail"], .quote-detail, main');
      await expect(detailPage).toBeVisible();
    }
  });

  test('should add line item to quote', async ({ page }) => {
    // First create a quote
    await page.goto('/dashboard/quotes');

    const createButton = page.getByRole('button', { name: /create|new|add/i }).first();
    await createButton.click();

    await page.getByLabel(/name|title/i).first().fill('Test Quote with Line Items');
    await page.getByRole('button', { name: /save|create|draft/i }).click();
    await page.waitForLoadState('networkidle');

    // Find add line item button
    const addLineItemBtn = page.getByRole('button', { name: /add.*item|add.*product|add.*line/i });
    if (await addLineItemBtn.isVisible()) {
      await addLineItemBtn.click();

      // Fill line item details
      const productField = page.getByLabel(/product|item/i);
      if (await productField.isVisible()) {
        await productField.fill('Test Product');
      }

      const quantityField = page.getByLabel(/quantity|qty/i);
      if (await quantityField.isVisible()) {
        await quantityField.fill('2');
      }

      const priceField = page.getByLabel(/price|rate/i);
      if (await priceField.isVisible()) {
        await priceField.fill('1000');
      }

      // Save line item
      await page.getByRole('button', { name: /add|save/i }).last().click();
      await page.waitForLoadState('networkidle');

      // Verify line item was added
      const lineItem = page.getByText('Test Product');
      await expect(lineItem).toBeVisible();
    }
  });

  test('should show quote totals', async ({ page }) => {
    await page.goto('/dashboard/quotes');
    await page.waitForLoadState('networkidle');

    // Navigate to a quote detail
    const quoteRow = page.locator('tr, [data-testid="quote-card"]').first();
    if (await quoteRow.isVisible()) {
      await quoteRow.click();
      await page.waitForLoadState('networkidle');

      // Should show subtotal/total sections
      const totals = page.locator('[data-testid="quote-totals"], .quote-totals, .totals');
      const totalText = page.getByText(/total|subtotal|grand total/i);

      const hasTotals = await totals.isVisible().catch(() => false);
      const hasTotalText = await totalText.isVisible().catch(() => false);

      expect(hasTotals || hasTotalText).toBe(true);
    }
  });

  test.skip('should send quote for review', async ({ page }) => {
    await page.goto('/dashboard/quotes');
    await page.waitForLoadState('networkidle');

    // Navigate to a draft quote
    const quoteRow = page.locator('tr, [data-testid="quote-card"]').first();
    if (await quoteRow.isVisible()) {
      await quoteRow.click();
      await page.waitForLoadState('networkidle');

      // Find send/submit for review button
      const sendButton = page.getByRole('button', { name: /send|submit|review/i });
      if (await sendButton.isVisible()) {
        await sendButton.click();

        // Fill recipient email if asked
        const emailField = page.getByLabel(/email|recipient/i);
        if (await emailField.isVisible()) {
          await emailField.fill('customer@example.com');
        }

        // Confirm send
        await page.getByRole('button', { name: /send|confirm/i }).click();
        await page.waitForLoadState('networkidle');

        // Verify status changed
        const sentStatus = page.getByText(/sent|pending|review/i);
        await expect(sentStatus).toBeVisible();
      }
    }
  });

  test.skip('should generate PDF preview', async ({ page }) => {
    await page.goto('/dashboard/quotes');
    await page.waitForLoadState('networkidle');

    // Navigate to a quote
    const quoteRow = page.locator('tr, [data-testid="quote-card"]').first();
    if (await quoteRow.isVisible()) {
      await quoteRow.click();
      await page.waitForLoadState('networkidle');

      // Find PDF/preview button
      const pdfButton = page.getByRole('button', { name: /pdf|preview|download/i });
      if (await pdfButton.isVisible()) {
        // Set up download handler
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          pdfButton.click(),
        ]);

        // Verify download started
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      }
    }
  });
});
