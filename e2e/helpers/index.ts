// Authentication helpers
export {
  login,
  loginAsUser,
  loginAsAdmin,
  logout,
  isLoggedIn,
  getAuthToken,
  setAuthToken,
  clearAuth,
  TEST_USER,
  TEST_ADMIN,
} from './auth';

// Test data fixtures
export {
  generateLeadData,
  generateContactData,
  generateCompanyData,
  generateDealData,
  generateQuoteData,
  createLead,
  createDeal,
  createContact,
  createCompany,
} from './fixtures';
export type {
  LeadData,
  ContactData,
  CompanyData,
  DealData,
  QuoteData,
  QuoteLineItem,
} from './fixtures';

// Cleanup utilities
export {
  deleteLead,
  deleteContact,
  deleteCompany,
  deleteDeal,
  deleteQuote,
  deleteOrder,
  cleanupTestData,
  testDataRegistry,
} from './cleanup';

// Common selectors
export { selectors, getDetailSelector, getRowWithText, getButtonWithText } from './selectors';
