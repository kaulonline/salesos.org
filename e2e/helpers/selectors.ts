/**
 * Common test selectors for E2E tests
 * Using data-testid attributes where available, fallback to roles/labels
 */

export const selectors = {
  // Navigation
  sidebar: '[data-testid="sidebar"]',
  navLeads: '[data-testid="nav-leads"]',
  navContacts: '[data-testid="nav-contacts"]',
  navCompanies: '[data-testid="nav-companies"]',
  navDeals: '[data-testid="nav-deals"]',
  navQuotes: '[data-testid="nav-quotes"]',
  navOrders: '[data-testid="nav-orders"]',
  navAdmin: '[data-testid="nav-admin"]',

  // Common actions
  createButton: '[data-testid="create-btn"]',
  saveButton: '[data-testid="save-btn"]',
  cancelButton: '[data-testid="cancel-btn"]',
  deleteButton: '[data-testid="delete-btn"]',
  editButton: '[data-testid="edit-btn"]',

  // Lists
  searchInput: '[data-testid="search-input"]',
  filterButton: '[data-testid="filter-btn"]',
  table: '[data-testid="data-table"]',
  tableRow: '[data-testid="table-row"]',
  emptyState: '[data-testid="empty-state"]',
  loadingSpinner: '[data-testid="loading"]',

  // Forms
  formModal: '[data-testid="form-modal"]',
  formField: (name: string) => `[data-testid="field-${name}"]`,

  // Leads
  leadsList: '[data-testid="leads-list"]',
  leadCard: '[data-testid="lead-card"]',
  leadDetail: '[data-testid="lead-detail"]',
  convertLeadBtn: '[data-testid="convert-lead-btn"]',

  // Contacts
  contactsList: '[data-testid="contacts-list"]',
  contactCard: '[data-testid="contact-card"]',
  contactDetail: '[data-testid="contact-detail"]',

  // Companies
  companiesList: '[data-testid="companies-list"]',
  companyCard: '[data-testid="company-card"]',
  companyDetail: '[data-testid="company-detail"]',

  // Deals
  dealsList: '[data-testid="deals-list"]',
  dealCard: '[data-testid="deal-card"]',
  dealDetail: '[data-testid="deal-detail"]',
  pipelineView: '[data-testid="pipeline-view"]',
  stageColumn: (stage: string) => `[data-testid="stage-${stage.toLowerCase().replace(/\s+/g, '-')}"]`,

  // Quotes
  quotesList: '[data-testid="quotes-list"]',
  quoteDetail: '[data-testid="quote-detail"]',
  quoteLineItems: '[data-testid="quote-line-items"]',
  addLineItem: '[data-testid="add-line-item"]',
  sendQuoteBtn: '[data-testid="send-quote-btn"]',

  // Orders
  ordersList: '[data-testid="orders-list"]',
  orderDetail: '[data-testid="order-detail"]',

  // Global
  globalSearch: '[data-testid="global-search"]',
  userMenu: '[data-testid="user-menu"]',
  notifications: '[data-testid="notifications"]',
  toast: '[data-testid="toast"]',
  confirmModal: '[data-testid="confirm-modal"]',
  confirmButton: '[data-testid="confirm-btn"]',
} as const;

/**
 * Get a selector for a specific entity detail page
 */
export function getDetailSelector(entity: string): string {
  return `[data-testid="${entity}-detail"]`;
}

/**
 * Get a selector for a table row containing specific text
 */
export function getRowWithText(text: string): string {
  return `tr:has-text("${text}")`;
}

/**
 * Get a selector for a button with specific text
 */
export function getButtonWithText(text: string): string {
  return `button:has-text("${text}")`;
}
