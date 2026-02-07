import { Page, expect } from '@playwright/test';

/**
 * Test data generators for E2E tests
 */

const randomString = (length = 8) =>
  Math.random().toString(36).substring(2, 2 + length);

const randomEmail = () => `test-${randomString()}@example.com`;

const randomPhone = () =>
  `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;

/**
 * Generate test lead data
 */
export function generateLeadData(overrides: Partial<LeadData> = {}): LeadData {
  return {
    firstName: `Test`,
    lastName: `Lead-${randomString(4)}`,
    email: randomEmail(),
    company: `Test Company ${randomString(4)}`,
    phone: randomPhone(),
    source: 'Web Form',
    status: 'New',
    ...overrides,
  };
}

interface LeadData {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  source?: string;
  status?: string;
}

/**
 * Generate test contact data
 */
export function generateContactData(
  overrides: Partial<ContactData> = {}
): ContactData {
  return {
    firstName: `Test`,
    lastName: `Contact-${randomString(4)}`,
    email: randomEmail(),
    phone: randomPhone(),
    title: 'Sales Manager',
    ...overrides,
  };
}

interface ContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  accountId?: string;
}

/**
 * Generate test company data
 */
export function generateCompanyData(
  overrides: Partial<CompanyData> = {}
): CompanyData {
  return {
    name: `Test Company ${randomString(4)}`,
    website: `https://test-${randomString(4)}.com`,
    industry: 'Technology',
    employees: '50-100',
    revenue: '$1M-$10M',
    ...overrides,
  };
}

interface CompanyData {
  name: string;
  website?: string;
  industry?: string;
  employees?: string;
  revenue?: string;
}

/**
 * Generate test deal/opportunity data
 */
export function generateDealData(overrides: Partial<DealData> = {}): DealData {
  return {
    name: `Test Deal ${randomString(4)}`,
    amount: Math.floor(Math.random() * 100000) + 10000,
    stage: 'Prospecting',
    closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    probability: 20,
    ...overrides,
  };
}

interface DealData {
  name: string;
  amount: number;
  stage: string;
  closeDate: string;
  probability?: number;
  accountId?: string;
  contactId?: string;
}

/**
 * Generate test quote data
 */
export function generateQuoteData(
  overrides: Partial<QuoteData> = {}
): QuoteData {
  return {
    name: `Test Quote ${randomString(4)}`,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    status: 'Draft',
    ...overrides,
  };
}

interface QuoteData {
  name: string;
  validUntil: string;
  status: string;
  opportunityId?: string;
  lineItems?: QuoteLineItem[];
}

interface QuoteLineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

/**
 * Create a lead via the UI
 */
export async function createLead(page: Page, data?: Partial<LeadData>): Promise<string> {
  const leadData = generateLeadData(data);

  await page.goto('/dashboard/leads');
  await page.waitForLoadState('networkidle');

  // Click create button
  const createButton = page.getByRole('button', { name: /create|new|add/i });
  await createButton.click();

  // Fill form fields
  await page.getByLabel(/first name/i).fill(leadData.firstName);
  await page.getByLabel(/last name/i).fill(leadData.lastName);
  await page.getByLabel(/email/i).fill(leadData.email);

  if (leadData.company) {
    const companyField = page.getByLabel(/company/i);
    if (await companyField.isVisible()) {
      await companyField.fill(leadData.company);
    }
  }

  if (leadData.phone) {
    const phoneField = page.getByLabel(/phone/i);
    if (await phoneField.isVisible()) {
      await phoneField.fill(leadData.phone);
    }
  }

  // Save
  await page.getByRole('button', { name: /save|create|submit/i }).click();

  // Wait for success or navigation
  await page.waitForLoadState('networkidle');

  // Return the lead ID from URL if available
  const url = page.url();
  const match = url.match(/leads\/([a-zA-Z0-9]+)/);
  return match ? match[1] : leadData.email;
}

/**
 * Create a deal via the UI
 */
export async function createDeal(page: Page, data?: Partial<DealData>): Promise<string> {
  const dealData = generateDealData(data);

  await page.goto('/dashboard/deals');
  await page.waitForLoadState('networkidle');

  // Click create button
  const createButton = page.getByRole('button', { name: /create|new|add/i });
  await createButton.click();

  // Fill form fields
  await page.getByLabel(/name|title/i).first().fill(dealData.name);
  await page.getByLabel(/amount|value/i).fill(dealData.amount.toString());

  // Select stage if dropdown exists
  const stageSelect = page.getByLabel(/stage/i);
  if (await stageSelect.isVisible()) {
    await stageSelect.selectOption({ label: dealData.stage });
  }

  // Set close date
  const dateField = page.getByLabel(/close date|expected close/i);
  if (await dateField.isVisible()) {
    await dateField.fill(dealData.closeDate);
  }

  // Save
  await page.getByRole('button', { name: /save|create|submit/i }).click();

  await page.waitForLoadState('networkidle');

  const url = page.url();
  const match = url.match(/deals\/([a-zA-Z0-9]+)/);
  return match ? match[1] : dealData.name;
}

/**
 * Create a contact via the UI
 */
export async function createContact(
  page: Page,
  data?: Partial<ContactData>
): Promise<string> {
  const contactData = generateContactData(data);

  await page.goto('/dashboard/contacts');
  await page.waitForLoadState('networkidle');

  const createButton = page.getByRole('button', { name: /create|new|add/i });
  await createButton.click();

  await page.getByLabel(/first name/i).fill(contactData.firstName);
  await page.getByLabel(/last name/i).fill(contactData.lastName);
  await page.getByLabel(/email/i).fill(contactData.email);

  if (contactData.phone) {
    const phoneField = page.getByLabel(/phone/i);
    if (await phoneField.isVisible()) {
      await phoneField.fill(contactData.phone);
    }
  }

  await page.getByRole('button', { name: /save|create|submit/i }).click();
  await page.waitForLoadState('networkidle');

  const url = page.url();
  const match = url.match(/contacts\/([a-zA-Z0-9]+)/);
  return match ? match[1] : contactData.email;
}

/**
 * Create a company via the UI
 */
export async function createCompany(
  page: Page,
  data?: Partial<CompanyData>
): Promise<string> {
  const companyData = generateCompanyData(data);

  await page.goto('/dashboard/companies');
  await page.waitForLoadState('networkidle');

  const createButton = page.getByRole('button', { name: /create|new|add/i });
  await createButton.click();

  await page.getByLabel(/name/i).first().fill(companyData.name);

  if (companyData.website) {
    const websiteField = page.getByLabel(/website/i);
    if (await websiteField.isVisible()) {
      await websiteField.fill(companyData.website);
    }
  }

  await page.getByRole('button', { name: /save|create|submit/i }).click();
  await page.waitForLoadState('networkidle');

  const url = page.url();
  const match = url.match(/companies\/([a-zA-Z0-9]+)/);
  return match ? match[1] : companyData.name;
}

export type {
  LeadData,
  ContactData,
  CompanyData,
  DealData,
  QuoteData,
  QuoteLineItem,
};
