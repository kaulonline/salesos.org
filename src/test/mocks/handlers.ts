import { http, HttpResponse } from 'msw';

const API_BASE = '/api';

// Mock data factories
const createLead = (overrides = {}) => ({
  id: `lead-${Math.random().toString(36).substr(2, 9)}`,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  company: 'Acme Corp',
  status: 'NEW',
  source: 'WEBSITE',
  leadScore: 75,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createContact = (overrides = {}) => ({
  id: `contact-${Math.random().toString(36).substr(2, 9)}`,
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane.smith@example.com',
  phone: '+1-555-0123',
  company: 'Tech Inc',
  title: 'VP of Sales',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createDeal = (overrides = {}) => ({
  id: `deal-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Enterprise Deal',
  value: 50000,
  stage: 'DISCOVERY',
  probability: 25,
  expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createTask = (overrides = {}) => ({
  id: `task-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Follow up call',
  description: 'Call to discuss next steps',
  status: 'PENDING',
  priority: 'MEDIUM',
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMeeting = (overrides = {}) => ({
  id: `meeting-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Discovery Call',
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  status: 'SCHEDULED',
  type: 'CALL',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Generate mock data
const mockLeads = Array.from({ length: 25 }, (_, i) =>
  createLead({ firstName: `Lead${i + 1}`, email: `lead${i + 1}@example.com` })
);

const mockContacts = Array.from({ length: 20 }, (_, i) =>
  createContact({ firstName: `Contact${i + 1}`, email: `contact${i + 1}@example.com` })
);

const mockDeals = Array.from({ length: 15 }, (_, i) =>
  createDeal({ name: `Deal ${i + 1}`, value: (i + 1) * 10000 })
);

const mockTasks = Array.from({ length: 10 }, (_, i) =>
  createTask({ title: `Task ${i + 1}` })
);

const mockMeetings = Array.from({ length: 8 }, (_, i) =>
  createMeeting({ title: `Meeting ${i + 1}` })
);

export const handlers = [
  // Auth
  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'USER' },
      token: 'mock-jwt-token',
    });
  }),

  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
    });
  }),

  // Leads
  http.get(`${API_BASE}/leads`, () => {
    return HttpResponse.json(mockLeads);
  }),

  http.get(`${API_BASE}/leads/:id`, ({ params }) => {
    const lead = mockLeads.find((l) => l.id === params.id);
    if (!lead) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(lead);
  }),

  http.post(`${API_BASE}/leads`, async ({ request }) => {
    const data = await request.json();
    const newLead = createLead(data as object);
    return HttpResponse.json(newLead, { status: 201 });
  }),

  http.put(`${API_BASE}/leads/:id`, async ({ params, request }) => {
    const data = await request.json();
    const lead = mockLeads.find((l) => l.id === params.id);
    if (!lead) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ ...lead, ...(data as object) });
  }),

  http.delete(`${API_BASE}/leads/:id`, ({ params }) => {
    const index = mockLeads.findIndex((l) => l.id === params.id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_BASE}/leads/stats`, () => {
    return HttpResponse.json({
      total: mockLeads.length,
      byStatus: { NEW: 10, CONTACTED: 8, QUALIFIED: 5, CONVERTED: 2 },
      bySource: { WEBSITE: 12, REFERRAL: 8, OUTBOUND: 5 },
    });
  }),

  // Contacts
  http.get(`${API_BASE}/contacts`, () => {
    return HttpResponse.json(mockContacts);
  }),

  http.get(`${API_BASE}/contacts/:id`, ({ params }) => {
    const contact = mockContacts.find((c) => c.id === params.id);
    if (!contact) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(contact);
  }),

  http.post(`${API_BASE}/contacts`, async ({ request }) => {
    const data = await request.json();
    const newContact = createContact(data as object);
    return HttpResponse.json(newContact, { status: 201 });
  }),

  http.get(`${API_BASE}/contacts/stats`, () => {
    return HttpResponse.json({
      total: mockContacts.length,
      byRole: { CHAMPION: 5, DECISION_MAKER: 8, INFLUENCER: 7 },
    });
  }),

  // Deals/Opportunities
  http.get(`${API_BASE}/opportunities`, () => {
    return HttpResponse.json(mockDeals);
  }),

  http.get(`${API_BASE}/opportunities/:id`, ({ params }) => {
    const deal = mockDeals.find((d) => d.id === params.id);
    if (!deal) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(deal);
  }),

  http.post(`${API_BASE}/opportunities`, async ({ request }) => {
    const data = await request.json();
    const newDeal = createDeal(data as object);
    return HttpResponse.json(newDeal, { status: 201 });
  }),

  http.get(`${API_BASE}/opportunities/pipeline-stats`, () => {
    return HttpResponse.json({
      totalValue: 750000,
      dealCount: mockDeals.length,
      byStage: {
        DISCOVERY: { count: 5, value: 250000 },
        QUALIFICATION: { count: 4, value: 200000 },
        PROPOSAL: { count: 3, value: 150000 },
        NEGOTIATION: { count: 2, value: 100000 },
        CLOSED_WON: { count: 1, value: 50000 },
      },
      winRate: 0.35,
      avgDealCycle: 45,
    });
  }),

  http.get(`${API_BASE}/opportunities/forecast`, () => {
    return HttpResponse.json({
      period: 'Q1 2026',
      committed: 200000,
      bestCase: 450000,
      pipeline: 750000,
      quota: 500000,
      byMonth: [
        { month: 'Jan', forecast: 120000, actual: 115000 },
        { month: 'Feb', forecast: 150000, actual: 142000 },
        { month: 'Mar', forecast: 180000, actual: 165000 },
        { month: 'Apr', forecast: 200000, actual: 195000 },
        { month: 'May', forecast: 220000, actual: 210000 },
        { month: 'Jun', forecast: 250000, actual: null },
        { month: 'Jul', forecast: 280000, actual: null },
        { month: 'Aug', forecast: 300000, actual: null },
      ],
    });
  }),

  // Tasks
  http.get(`${API_BASE}/tasks`, () => {
    return HttpResponse.json(mockTasks);
  }),

  http.post(`${API_BASE}/tasks`, async ({ request }) => {
    const data = await request.json();
    const newTask = createTask(data as object);
    return HttpResponse.json(newTask, { status: 201 });
  }),

  http.post(`${API_BASE}/tasks/:id/complete`, ({ params }) => {
    const task = mockTasks.find((t) => t.id === params.id);
    if (!task) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ ...task, status: 'COMPLETED' });
  }),

  // Meetings
  http.get(`${API_BASE}/meetings`, () => {
    return HttpResponse.json(mockMeetings);
  }),

  http.get(`${API_BASE}/meetings/:id`, ({ params }) => {
    const meeting = mockMeetings.find((m) => m.id === params.id);
    if (!meeting) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(meeting);
  }),

  http.post(`${API_BASE}/meetings`, async ({ request }) => {
    const data = await request.json();
    const newMeeting = createMeeting(data as object);
    return HttpResponse.json(newMeeting, { status: 201 });
  }),

  // Companies/Accounts
  http.get(`${API_BASE}/accounts`, () => {
    return HttpResponse.json([
      { id: 'acc-1', name: 'Acme Corp', industry: 'Technology', employees: 500 },
      { id: 'acc-2', name: 'Tech Inc', industry: 'Software', employees: 200 },
    ]);
  }),

  http.get(`${API_BASE}/accounts/stats`, () => {
    return HttpResponse.json({
      total: 2,
      byType: { CUSTOMER: 1, PROSPECT: 1 },
    });
  }),

  // Activities
  http.get(`${API_BASE}/activities`, () => {
    return HttpResponse.json([
      { id: 'act-1', type: 'CALL', description: 'Discovery call', createdAt: new Date().toISOString() },
      { id: 'act-2', type: 'EMAIL', description: 'Sent proposal', createdAt: new Date().toISOString() },
    ]);
  }),

  // AI endpoints
  http.get(`${API_BASE}/ai/insights`, () => {
    return HttpResponse.json({
      insights: [],
      summary: {
        atRiskDeals: 2,
        hotLeads: 3,
        upcomingFollowUps: 5,
        meetingsNeedingPrep: 1,
      },
      lastUpdated: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE}/ai/smart-capture`, () => {
    return HttpResponse.json({
      success: true,
      contact: {
        firstName: 'Extracted',
        lastName: 'Name',
        email: 'extracted@example.com',
        company: 'Extracted Corp',
        confidence: 0.85,
      },
    });
  }),
];
