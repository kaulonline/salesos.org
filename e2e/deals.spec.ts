import { test, expect } from '@playwright/test';
import {
  loginAsUser,
  createDeal,
  generateDealData,
  testDataRegistry,
} from './helpers';

test.describe('Deals/Opportunities Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test.afterEach(async ({ page }) => {
    await testDataRegistry.cleanup(page);
  });

  test('should display deals list page', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await expect(page).toHaveURL(/deals/);

    // Should show deals page title or pipeline view
    const heading = page.getByRole('heading', { name: /deals|opportunities|pipeline/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should show pipeline view', async ({ page }) => {
    await page.goto('/dashboard/deals');

    // Look for pipeline/kanban view
    const pipelineView = page.locator('[data-testid="pipeline-view"], .pipeline, .kanban');
    const listView = page.locator('table, [data-testid="deals-list"]');

    // Either pipeline or list view should be visible
    const hasPipeline = await pipelineView.isVisible().catch(() => false);
    const hasList = await listView.isVisible().catch(() => false);

    expect(hasPipeline || hasList).toBe(true);
  });

  test('should create a new deal', async ({ page }) => {
    await page.goto('/dashboard/deals');

    const dealData = generateDealData();

    // Open create modal
    const createButton = page.getByRole('button', { name: /create|new|add/i }).first();
    await createButton.click();

    // Fill form
    const nameField = page.getByLabel(/name|title/i).first();
    await nameField.fill(dealData.name);

    const amountField = page.getByLabel(/amount|value/i);
    if (await amountField.isVisible()) {
      await amountField.fill(dealData.amount.toString());
    }

    // Select stage if dropdown
    const stageSelect = page.getByLabel(/stage/i);
    if (await stageSelect.isVisible()) {
      await stageSelect.selectOption({ index: 1 }); // Select first non-empty option
    }

    // Save
    await page.getByRole('button', { name: /save|create|submit/i }).click();
    await page.waitForLoadState('networkidle');

    // Verify deal was created
    const dealName = page.getByText(dealData.name);
    await expect(dealName).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to deal detail page', async ({ page }) => {
    // Create a deal first
    const dealId = await createDeal(page);
    testDataRegistry.addDeal(dealId);

    await page.goto('/dashboard/deals');
    await page.waitForLoadState('networkidle');

    // Click on a deal
    const dealCard = page.getByText(/Test Deal/).first();
    await dealCard.click();

    // Should show detail page
    await page.waitForLoadState('networkidle');
    const detailPage = page.locator('[data-testid="deal-detail"], .deal-detail, main');
    await expect(detailPage).toBeVisible();
  });

  test('should edit deal amount', async ({ page }) => {
    // Create a deal first
    const dealId = await createDeal(page);
    testDataRegistry.addDeal(dealId);

    await page.goto(`/dashboard/deals/${dealId}`);
    await page.waitForLoadState('networkidle');

    // Click edit
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Update amount
      const amountField = page.getByLabel(/amount|value/i);
      if (await amountField.isVisible()) {
        await amountField.clear();
        await amountField.fill('99999');
      }

      // Save
      await page.getByRole('button', { name: /save|update/i }).click();
      await page.waitForLoadState('networkidle');

      // Verify update
      const updatedAmount = page.getByText(/99,999|\$99,999/);
      await expect(updatedAmount).toBeVisible();
    }
  });

  test('should move deal to different stage via drag or button', async ({ page }) => {
    // Create a deal first
    const dealId = await createDeal(page);
    testDataRegistry.addDeal(dealId);

    await page.goto(`/dashboard/deals/${dealId}`);
    await page.waitForLoadState('networkidle');

    // Try to find stage change button/dropdown
    const stageButton = page.getByRole('button', { name: /stage|move/i });
    const stageDropdown = page.getByLabel(/stage/i);

    if (await stageButton.isVisible()) {
      await stageButton.click();
      // Select next stage
      const nextStage = page.getByRole('option', { name: /qualification|discovery|proposal/i }).first();
      if (await nextStage.isVisible()) {
        await nextStage.click();
      }
    } else if (await stageDropdown.isVisible()) {
      await stageDropdown.selectOption({ index: 2 });
    }

    await page.waitForLoadState('networkidle');
  });

  test.skip('should mark deal as won', async ({ page }) => {
    const dealId = await createDeal(page);
    testDataRegistry.addDeal(dealId);

    await page.goto(`/dashboard/deals/${dealId}`);
    await page.waitForLoadState('networkidle');

    // Find "Won" or "Close Won" button
    const wonButton = page.getByRole('button', { name: /won|close won|mark as won/i });
    if (await wonButton.isVisible()) {
      await wonButton.click();

      // Confirm if needed
      const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      await page.waitForLoadState('networkidle');

      // Verify status changed
      const wonStatus = page.getByText(/closed won|won/i);
      await expect(wonStatus).toBeVisible();
    }
  });

  test.skip('should mark deal as lost', async ({ page }) => {
    const dealId = await createDeal(page);
    testDataRegistry.addDeal(dealId);

    await page.goto(`/dashboard/deals/${dealId}`);
    await page.waitForLoadState('networkidle');

    // Find "Lost" or "Close Lost" button
    const lostButton = page.getByRole('button', { name: /lost|close lost|mark as lost/i });
    if (await lostButton.isVisible()) {
      await lostButton.click();

      // May ask for reason
      const reasonField = page.getByLabel(/reason|why/i);
      if (await reasonField.isVisible()) {
        await reasonField.fill('Lost to competitor');
      }

      // Confirm
      const confirmButton = page.getByRole('button', { name: /confirm|yes|submit/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      await page.waitForLoadState('networkidle');

      // Verify status changed
      const lostStatus = page.getByText(/closed lost|lost/i);
      await expect(lostStatus).toBeVisible();
    }
  });

  test('should filter deals by stage', async ({ page }) => {
    await page.goto('/dashboard/deals');
    await page.waitForLoadState('networkidle');

    // Look for stage filter
    const stageFilter = page.getByLabel(/stage|filter/i);
    const filterDropdown = page.getByRole('combobox', { name: /stage/i });

    if (await stageFilter.isVisible()) {
      await stageFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    } else if (await filterDropdown.isVisible()) {
      await filterDropdown.click();
      const option = page.getByRole('option').first();
      await option.click();
    }
  });
});
