import { Page } from '@playwright/test';
import { getAuthToken } from './auth';

const API_URL = process.env.VITE_API_URL || '';

/**
 * Delete a test entity via API
 */
async function deleteEntity(
  page: Page,
  endpoint: string,
  id: string
): Promise<boolean> {
  const token = await getAuthToken(page);
  if (!token) return false;

  try {
    const response = await page.request.delete(`${API_URL}/api/${endpoint}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok();
  } catch {
    return false;
  }
}

/**
 * Delete a test lead
 */
export async function deleteLead(page: Page, leadId: string): Promise<boolean> {
  return deleteEntity(page, 'leads', leadId);
}

/**
 * Delete a test contact
 */
export async function deleteContact(page: Page, contactId: string): Promise<boolean> {
  return deleteEntity(page, 'contacts', contactId);
}

/**
 * Delete a test company
 */
export async function deleteCompany(page: Page, companyId: string): Promise<boolean> {
  return deleteEntity(page, 'accounts', companyId);
}

/**
 * Delete a test deal/opportunity
 */
export async function deleteDeal(page: Page, dealId: string): Promise<boolean> {
  return deleteEntity(page, 'opportunities', dealId);
}

/**
 * Delete a test quote
 */
export async function deleteQuote(page: Page, quoteId: string): Promise<boolean> {
  return deleteEntity(page, 'quotes', quoteId);
}

/**
 * Delete a test order
 */
export async function deleteOrder(page: Page, orderId: string): Promise<boolean> {
  return deleteEntity(page, 'orders', orderId);
}

/**
 * Cleanup multiple entities
 */
export async function cleanupTestData(
  page: Page,
  data: {
    leads?: string[];
    contacts?: string[];
    companies?: string[];
    deals?: string[];
    quotes?: string[];
    orders?: string[];
  }
): Promise<void> {
  const tasks: Promise<boolean>[] = [];

  if (data.leads) {
    tasks.push(...data.leads.map((id) => deleteLead(page, id)));
  }
  if (data.contacts) {
    tasks.push(...data.contacts.map((id) => deleteContact(page, id)));
  }
  if (data.companies) {
    tasks.push(...data.companies.map((id) => deleteCompany(page, id)));
  }
  if (data.deals) {
    tasks.push(...data.deals.map((id) => deleteDeal(page, id)));
  }
  if (data.quotes) {
    tasks.push(...data.quotes.map((id) => deleteQuote(page, id)));
  }
  if (data.orders) {
    tasks.push(...data.orders.map((id) => deleteOrder(page, id)));
  }

  await Promise.allSettled(tasks);
}

/**
 * Test data registry for tracking created entities
 */
class TestDataRegistry {
  private data: {
    leads: string[];
    contacts: string[];
    companies: string[];
    deals: string[];
    quotes: string[];
    orders: string[];
  } = {
    leads: [],
    contacts: [],
    companies: [],
    deals: [],
    quotes: [],
    orders: [],
  };

  addLead(id: string): void {
    this.data.leads.push(id);
  }

  addContact(id: string): void {
    this.data.contacts.push(id);
  }

  addCompany(id: string): void {
    this.data.companies.push(id);
  }

  addDeal(id: string): void {
    this.data.deals.push(id);
  }

  addQuote(id: string): void {
    this.data.quotes.push(id);
  }

  addOrder(id: string): void {
    this.data.orders.push(id);
  }

  async cleanup(page: Page): Promise<void> {
    await cleanupTestData(page, this.data);
    this.reset();
  }

  reset(): void {
    this.data = {
      leads: [],
      contacts: [],
      companies: [],
      deals: [],
      quotes: [],
      orders: [],
    };
  }
}

export const testDataRegistry = new TestDataRegistry();
