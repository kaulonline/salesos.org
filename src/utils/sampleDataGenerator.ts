/**
 * Sample Data Generator for New Accounts
 * Generates realistic demo data for onboarding
 */

// Random data helpers
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number, daysAhead: number = 0): string {
  const now = new Date();
  const days = randomInt(-daysAgo, daysAhead);
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Sample data pools
const FIRST_NAMES = [
  'James', 'Emma', 'Oliver', 'Sophia', 'William', 'Ava', 'Benjamin', 'Isabella',
  'Lucas', 'Mia', 'Henry', 'Charlotte', 'Alexander', 'Amelia', 'Sebastian',
  'Harper', 'Jack', 'Evelyn', 'Michael', 'Luna',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson',
  'Martin', 'Lee', 'Thompson', 'White', 'Harris',
];

const COMPANIES = [
  { name: 'Acme Corporation', industry: 'Technology', size: '500-1000' },
  { name: 'GlobalTech Solutions', industry: 'Technology', size: '100-500' },
  { name: 'Summit Healthcare', industry: 'Healthcare', size: '1000+' },
  { name: 'Velocity Dynamics', industry: 'Manufacturing', size: '100-500' },
  { name: 'Blue Ocean Ventures', industry: 'Finance', size: '50-100' },
  { name: 'Pinnacle Partners', industry: 'Consulting', size: '10-50' },
  { name: 'NextGen Labs', industry: 'Technology', size: '10-50' },
  { name: 'Horizon Media', industry: 'Media', size: '100-500' },
  { name: 'Sterling Industries', industry: 'Manufacturing', size: '500-1000' },
  { name: 'Quantum Analytics', industry: 'Technology', size: '50-100' },
];

const JOB_TITLES = [
  'CEO', 'CTO', 'CFO', 'VP of Sales', 'VP of Marketing',
  'Director of Operations', 'Product Manager', 'Sales Manager',
  'Marketing Director', 'IT Director', 'Procurement Manager',
  'Business Development Manager', 'Account Executive',
];

const DEAL_STAGES = [
  { name: 'Qualification', probability: 10 },
  { name: 'Discovery', probability: 25 },
  { name: 'Proposal', probability: 50 },
  { name: 'Negotiation', probability: 75 },
  { name: 'Closed Won', probability: 100 },
  { name: 'Closed Lost', probability: 0 },
];

const LEAD_SOURCES = [
  'Website', 'LinkedIn', 'Referral', 'Trade Show', 'Cold Outreach',
  'Webinar', 'Content Marketing', 'Partner', 'Advertisement',
];

const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Unqualified'];

const PRODUCT_NAMES = [
  'Enterprise Suite', 'Professional Plan', 'Starter Package',
  'Analytics Add-on', 'Integration Module', 'Premium Support',
];

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'task'];

// Type definitions
export interface SampleContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  companyId: string;
  companyName: string;
  createdAt: string;
}

export interface SampleCompany {
  id: string;
  name: string;
  industry: string;
  size: string;
  website: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface SampleLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  source: string;
  status: string;
  score: number;
  createdAt: string;
}

export interface SampleDeal {
  id: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  contactId: string;
  contactName: string;
  companyId: string;
  companyName: string;
  expectedCloseDate: string;
  createdAt: string;
}

export interface SampleActivity {
  id: string;
  type: string;
  subject: string;
  description: string;
  relatedTo: string;
  relatedId: string;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
}

export interface SampleTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  relatedTo?: string;
  relatedId?: string;
  createdAt: string;
}

export interface SampleData {
  contacts: SampleContact[];
  companies: SampleCompany[];
  leads: SampleLead[];
  deals: SampleDeal[];
  activities: SampleActivity[];
  tasks: SampleTask[];
}

/**
 * Generate a sample company
 */
function generateCompany(): SampleCompany {
  const company = randomItem(COMPANIES);
  return {
    id: generateId(),
    name: company.name,
    industry: company.industry,
    size: company.size,
    website: `https://www.${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
    phone: `+1 (${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
    address: `${randomInt(100, 9999)} ${randomItem(['Main', 'Oak', 'Pine', 'Maple', 'Business'])} Street, ${randomItem(['New York', 'San Francisco', 'Austin', 'Boston', 'Seattle'])}, USA`,
    createdAt: randomDate(90),
  };
}

/**
 * Generate a sample contact
 */
function generateContact(company: SampleCompany): SampleContact {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const domain = company.website.replace('https://www.', '').replace('.com', '');

  return {
    id: generateId(),
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}.com`,
    phone: `+1 (${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
    title: randomItem(JOB_TITLES),
    companyId: company.id,
    companyName: company.name,
    createdAt: randomDate(60),
  };
}

/**
 * Generate a sample lead
 */
function generateLead(): SampleLead {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const company = randomItem(COMPANIES);

  return {
    id: generateId(),
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
    phone: `+1 (${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
    company: company.name,
    title: randomItem(JOB_TITLES),
    source: randomItem(LEAD_SOURCES),
    status: randomItem(LEAD_STATUSES),
    score: randomInt(1, 100),
    createdAt: randomDate(30),
  };
}

/**
 * Generate a sample deal
 */
function generateDeal(contact: SampleContact, company: SampleCompany): SampleDeal {
  const stage = randomItem(DEAL_STAGES);
  const productName = randomItem(PRODUCT_NAMES);

  return {
    id: generateId(),
    name: `${company.name} - ${productName}`,
    value: randomInt(5, 100) * 1000,
    stage: stage.name,
    probability: stage.probability,
    contactId: contact.id,
    contactName: `${contact.firstName} ${contact.lastName}`,
    companyId: company.id,
    companyName: company.name,
    expectedCloseDate: randomDate(0, 90),
    createdAt: randomDate(45),
  };
}

/**
 * Generate a sample activity
 */
function generateActivity(contact: SampleContact): SampleActivity {
  const type = randomItem(ACTIVITY_TYPES);
  const subjects: Record<string, string[]> = {
    call: ['Discovery call', 'Follow-up call', 'Product demo call', 'Check-in call'],
    email: ['Introduction email', 'Proposal sent', 'Follow-up email', 'Thank you email'],
    meeting: ['Initial meeting', 'Product demo', 'Negotiation meeting', 'Contract review'],
    note: ['Meeting notes', 'Call summary', 'Important update', 'Client feedback'],
    task: ['Send proposal', 'Schedule demo', 'Follow up', 'Review contract'],
  };

  return {
    id: generateId(),
    type,
    subject: randomItem(subjects[type] || subjects.note),
    description: `Activity with ${contact.firstName} ${contact.lastName} from ${contact.companyName}`,
    relatedTo: 'contact',
    relatedId: contact.id,
    dueDate: type === 'task' ? randomDate(0, 14) : undefined,
    completed: Math.random() > 0.3,
    createdAt: randomDate(14),
  };
}

/**
 * Generate a sample task
 */
function generateTask(contact?: SampleContact): SampleTask {
  const taskTemplates = [
    { title: 'Send proposal', description: 'Prepare and send the pricing proposal', priority: 'high' as const },
    { title: 'Schedule demo', description: 'Set up a product demonstration call', priority: 'medium' as const },
    { title: 'Follow up on quote', description: 'Check if they reviewed the quote', priority: 'high' as const },
    { title: 'Update CRM notes', description: 'Add meeting notes to the contact record', priority: 'low' as const },
    { title: 'Research company', description: 'Gather more information about the prospect', priority: 'medium' as const },
    { title: 'Send contract', description: 'Prepare and send the final contract', priority: 'high' as const },
    { title: 'Weekly review', description: 'Review pipeline and update forecasts', priority: 'medium' as const },
  ];

  const template = randomItem(taskTemplates);
  const statuses: SampleTask['status'][] = ['pending', 'in_progress', 'completed'];

  return {
    id: generateId(),
    title: template.title,
    description: template.description,
    dueDate: randomDate(-3, 14),
    priority: template.priority,
    status: randomItem(statuses),
    relatedTo: contact ? 'contact' : undefined,
    relatedId: contact?.id,
    createdAt: randomDate(7),
  };
}

/**
 * Generate a complete sample dataset
 */
export function generateSampleData(options?: {
  companies?: number;
  contactsPerCompany?: number;
  leads?: number;
  dealsPerContact?: number;
  activitiesPerContact?: number;
  tasks?: number;
}): SampleData {
  const {
    companies: numCompanies = 5,
    contactsPerCompany = 2,
    leads: numLeads = 10,
    dealsPerContact = 1,
    activitiesPerContact = 3,
    tasks: numTasks = 8,
  } = options || {};

  const companies: SampleCompany[] = [];
  const contacts: SampleContact[] = [];
  const deals: SampleDeal[] = [];
  const activities: SampleActivity[] = [];

  // Generate companies and contacts
  for (let i = 0; i < numCompanies; i++) {
    const company = generateCompany();
    companies.push(company);

    for (let j = 0; j < contactsPerCompany; j++) {
      const contact = generateContact(company);
      contacts.push(contact);

      // Generate deals for contact
      for (let k = 0; k < dealsPerContact; k++) {
        if (Math.random() > 0.3) { // 70% chance of having a deal
          deals.push(generateDeal(contact, company));
        }
      }

      // Generate activities for contact
      for (let k = 0; k < activitiesPerContact; k++) {
        activities.push(generateActivity(contact));
      }
    }
  }

  // Generate leads
  const leads: SampleLead[] = [];
  for (let i = 0; i < numLeads; i++) {
    leads.push(generateLead());
  }

  // Generate tasks
  const tasks: SampleTask[] = [];
  for (let i = 0; i < numTasks; i++) {
    const relatedContact = Math.random() > 0.3 ? randomItem(contacts) : undefined;
    tasks.push(generateTask(relatedContact));
  }

  return {
    companies,
    contacts,
    leads,
    deals,
    activities,
    tasks,
  };
}

/**
 * Store sample data in localStorage for demo purposes
 */
export function storeSampleData(data: SampleData): void {
  localStorage.setItem('salesos_sample_companies', JSON.stringify(data.companies));
  localStorage.setItem('salesos_sample_contacts', JSON.stringify(data.contacts));
  localStorage.setItem('salesos_sample_leads', JSON.stringify(data.leads));
  localStorage.setItem('salesos_sample_deals', JSON.stringify(data.deals));
  localStorage.setItem('salesos_sample_activities', JSON.stringify(data.activities));
  localStorage.setItem('salesos_sample_tasks', JSON.stringify(data.tasks));
  localStorage.setItem('salesos_sample_data_loaded', 'true');
}

/**
 * Check if sample data has been loaded
 */
export function isSampleDataLoaded(): boolean {
  return localStorage.getItem('salesos_sample_data_loaded') === 'true';
}

/**
 * Clear sample data from localStorage
 */
export function clearSampleData(): void {
  localStorage.removeItem('salesos_sample_companies');
  localStorage.removeItem('salesos_sample_contacts');
  localStorage.removeItem('salesos_sample_leads');
  localStorage.removeItem('salesos_sample_deals');
  localStorage.removeItem('salesos_sample_activities');
  localStorage.removeItem('salesos_sample_tasks');
  localStorage.removeItem('salesos_sample_data_loaded');
}

/**
 * Load sample data and send to backend API
 * This would be used in production to actually create the records
 */
export async function loadSampleDataToBackend(
  createFunctions: {
    createCompany?: (data: Omit<SampleCompany, 'id' | 'createdAt'>) => Promise<unknown>;
    createContact?: (data: Omit<SampleContact, 'id' | 'createdAt'>) => Promise<unknown>;
    createLead?: (data: Omit<SampleLead, 'id' | 'createdAt'>) => Promise<unknown>;
    createDeal?: (data: Omit<SampleDeal, 'id' | 'createdAt'>) => Promise<unknown>;
    createTask?: (data: Omit<SampleTask, 'id' | 'createdAt'>) => Promise<unknown>;
  }
): Promise<SampleData> {
  const data = generateSampleData();

  // In a real implementation, we would call the create functions
  // For now, just store locally
  storeSampleData(data);

  return data;
}

export default {
  generateSampleData,
  storeSampleData,
  isSampleDataLoaded,
  clearSampleData,
  loadSampleDataToBackend,
};
