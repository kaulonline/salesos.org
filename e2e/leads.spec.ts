import { test, expect } from '@playwright/test';
import {
  loginAsUser,
  logout,
  createLead,
  generateLeadData,
  testDataRegistry,
  selectors,
} from './helpers';

test.describe('Leads Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test.afterEach(async ({ page }) => {
    await testDataRegistry.cleanup(page);
  });

  test('should display leads list page', async ({ page }) => {
    await page.goto('/dashboard/leads');
    await expect(page).toHaveURL(/leads/);

    // Should show leads page title or header
    const heading = page.getByRole('heading', { name: /leads/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should open create lead modal', async ({ page }) => {
    await page.goto('/dashboard/leads');

    // Click create/add button
    const createButton = page.getByRole('button', { name: /create|new|add/i }).first();
    await createButton.click();

    // Should show create form/modal
    const nameField = page.getByLabel(/first name|name/i).first();
    await expect(nameField).toBeVisible();
  });

  test('should create a new lead', async ({ page }) => {
    await page.goto('/dashboard/leads');

    const leadData = generateLeadData();

    // Open create modal
    const createButton = page.getByRole('button', { name: /create|new|add/i }).first();
    await createButton.click();

    // Fill form
    await page.getByLabel(/first name/i).fill(leadData.firstName);
    await page.getByLabel(/last name/i).fill(leadData.lastName);
    await page.getByLabel(/email/i).fill(leadData.email);

    // Try to fill optional fields if visible
    const companyField = page.getByLabel(/company/i);
    if (await companyField.isVisible()) {
      await companyField.fill(leadData.company || '');
    }

    const phoneField = page.getByLabel(/phone/i);
    if (await phoneField.isVisible()) {
      await phoneField.fill(leadData.phone || '');
    }

    // Save
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // Should show success or navigate to detail
    await page.waitForLoadState('networkidle');

    // Verify lead was created (check for name in page or navigate to list)
    const leadName = `${leadData.firstName} ${leadData.lastName}`;
    const leadVisible = page.getByText(leadName);
    await expect(leadVisible).toBeVisible({ timeout: 10000 });
  });

  test('should search for leads', async ({ page }) => {
    // First create a lead
    const leadData = generateLeadData({ firstName: 'SearchTest' });

    await page.goto('/dashboard/leads');
    const createButton = page.getByRole('button', { name: /create|new|add/i }).first();
    await createButton.click();

    await page.getByLabel(/first name/i).fill(leadData.firstName);
    await page.getByLabel(/last name/i).fill(leadData.lastName);
    await page.getByLabel(/email/i).fill(leadData.email);
    await page.getByRole('button', { name: /save|create|submit/i }).click();
    await page.waitForLoadState('networkidle');

    // Go back to leads list
    await page.goto('/dashboard/leads');

    // Search for the lead
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('SearchTest');
      await page.waitForTimeout(500); // Wait for debounce

      // Should filter results
      const searchResult = page.getByText('SearchTest');
      await expect(searchResult).toBeVisible();
    }
  });

  test('should navigate to lead detail page', async ({ page }) => {
    // Create a lead first
    const leadId = await createLead(page);
    testDataRegistry.addLead(leadId);

    await page.goto('/dashboard/leads');

    // Click on a lead to view details
    const leadRow = page.locator('tr, [data-testid="lead-card"]').first();
    await leadRow.click();

    // Should navigate to detail page or show detail view
    await page.waitForLoadState('networkidle');
    const detailPage = page.locator('[data-testid="lead-detail"], .lead-detail, main');
    await expect(detailPage).toBeVisible();
  });

  test('should edit a lead', async ({ page }) => {
    // Create a lead first
    const leadId = await createLead(page);
    testDataRegistry.addLead(leadId);

    // Navigate to lead detail
    await page.goto(`/dashboard/leads/${leadId}`);
    await page.waitForLoadState('networkidle');

    // Click edit button
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Update a field
      const firstNameField = page.getByLabel(/first name/i);
      if (await firstNameField.isVisible()) {
        await firstNameField.clear();
        await firstNameField.fill('UpdatedName');
      }

      // Save changes
      await page.getByRole('button', { name: /save|update/i }).click();
      await page.waitForLoadState('networkidle');

      // Verify update
      const updatedName = page.getByText('UpdatedName');
      await expect(updatedName).toBeVisible();
    }
  });

  test.skip('should convert lead to opportunity', async ({ page }) => {
    // Create a lead first
    const leadId = await createLead(page);
    testDataRegistry.addLead(leadId);

    // Navigate to lead detail
    await page.goto(`/dashboard/leads/${leadId}`);
    await page.waitForLoadState('networkidle');

    // Click convert button
    const convertButton = page.getByRole('button', { name: /convert/i });
    if (await convertButton.isVisible()) {
      await convertButton.click();

      // Fill conversion form if shown
      const opportunityName = page.getByLabel(/opportunity name|deal name/i);
      if (await opportunityName.isVisible()) {
        await opportunityName.fill('Converted Deal');
      }

      // Confirm conversion
      await page.getByRole('button', { name: /convert|confirm/i }).click();
      await page.waitForLoadState('networkidle');

      // Should redirect to opportunity or show success
      await expect(page).toHaveURL(/deals|opportunities/);
    }
  });
});
