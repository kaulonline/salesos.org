# Direct API Migration Implementation

**Status**: In Progress
**Feature**: Add direct CRM API integration as an alternative to CSV upload
**Requirement**: Smart pagination for small datasets, Bulk API for large datasets

---

## Overview

Users now have **two options** for CRM migration:

1. **CSV Upload** (Existing) - Manual export/import workflow
2. **Direct API** (New) - OAuth connection with automatic data pull

---

## Database Schema Updates

### New Model: CrmConnection (Enhanced Existing)

```prisma
model CrmConnection {
  id             String @id @default(cuid())
  userId         String
  organizationId String // Multi-tenant isolation
  integrationId  String

  // Connection details
  instanceUrl  String
  accessToken  String // Encrypted
  refreshToken String // Encrypted
  expiresAt    DateTime

  // CRM org info
  externalOrgId  String?
  externalUserId String?
  username       String?
  email          String?

  // Status
  isActive  Boolean  @default(true)
  isSandbox Boolean  @default(false)
  scopes    String[] @default([])

  // Sync
  syncSettings Json?
  lastSyncAt   DateTime?
  lastError    String?

  // Relations
  integration  CrmIntegration
  user         User
  organization Organization
  migrations   Migration[]
}
```

### Updated Model: Migration

```prisma
model Migration {
  // ... existing fields ...
  importMethod    String  @default("csv") // "csv" or "api"
  crmConnectionId String? // Link to OAuth connection
  apiRecordsFetched Int @default(0)

  // Relations
  crmConnection CrmConnection?
}
```

---

## Architecture

### User Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│ Step 1: Choose CRM (Salesforce, HubSpot, etc.)               │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 1.5: Choose Import Method                                │
│                                                                │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  📁 CSV Upload   │   OR    │  🔗 Direct API   │          │
│  └──────────────────┘         └──────────────────┘          │
└────────────────────────────────────────────────────────────────┘
           ↓                               ↓
┌─────────────────────┐      ┌──────────────────────────────────┐
│ Upload CSV file     │      │ OAuth Flow:                      │
│ (existing flow)     │      │  1. Redirect to CRM              │
└─────────────────────┘      │  2. User authorizes              │
                             │  3. Callback with tokens         │
                             │  4. Auto-fetch entity count      │
                             │  5. Choose pagination strategy   │
                             └──────────────────────────────────┘
                                          ↓
                     ┌────────────────────────────────────────────┐
                     │ Step 2: Record Count Check                │
                     │                                            │
                     │  < 1,000 records → Standard API + Paging   │
                     │  > 1,000 records → Bulk API                │
                     └────────────────────────────────────────────┘
                                          ↓
                     ┌────────────────────────────────────────────┐
                     │ Step 3: AI Field Mapping (same as CSV)    │
                     └────────────────────────────────────────────┘
                                          ↓
                     ┌────────────────────────────────────────────┐
                     │ Step 4: Review & Import                   │
                     └────────────────────────────────────────────┘
```

---

## Implementation Components

### 1. Frontend Components

#### New Component: ImportMethodSelector
**Location**: `/opt/salesos.org/pages/dashboard/settings/Migration.tsx`

```typescript
// New Step 1.5 in Migration Wizard
<ImportMethodSelector
  selectedMethod={importMethod} // 'csv' | 'api'
  onSelectMethod={handleMethodSelect}
  crmType={selectedCRM}
  isConnected={hasActiveConnection}
/>
```

**Features**:
- Radio button selection: CSV vs Direct API
- Shows connection status if already connected
- "Connect to [CRM]" button for OAuth flow
- Explains benefits of each method

#### Enhanced Component: Migration Wizard
**New Props**:
- `importMethod`: 'csv' | 'api'
- `crmConnection`: Connection object (if API selected)
- `recordCount`: Number of records available

**New Steps**:
- Step 0: Choose Import Method (CSV vs API)
- Step 1a: CSV Upload (if CSV chosen)
- Step 1b: OAuth Connection (if API chosen)
- Step 2: Count records & choose strategy
- Rest of flow remains same

---

### 2. Backend Services

#### A. OAuth Service

**Location**: `/opt/salesos.org/api/src/crm-integrations/oauth.service.ts`

**Methods**:
```typescript
// Get OAuth authorization URL
getAuthorizationUrl(crmType: string, userId: string, organizationId: string): string

// Handle OAuth callback
handleCallback(crmType: string, code: string, state: string): CrmConnection

// Refresh access token
refreshToken(connectionId: string): CrmConnection

// Revoke connection
revokeConnection(connectionId: string, organizationId: string): void
```

**Supported CRMs**:
- Salesforce (OAuth 2.0 Web Server Flow)
- HubSpot (OAuth 2.0)
- Pipedrive (OAuth 2.0)
- Zoho CRM (OAuth 2.0)
- Monday.com (OAuth 2.0)

---

#### B. CRM API Clients

**Base Interface**:
```typescript
interface CrmApiClient {
  // Get total record count
  getRecordCount(entityType: EntityType): Promise<number>

  // Fetch records with pagination (for < 1k records)
  fetchRecords(entityType: EntityType, offset: number, limit: number): Promise<any[]>

  // Bulk fetch (for > 1k records)
  bulkFetchRecords(entityType: EntityType): AsyncIterator<any[]>

  // Test connection
  testConnection(): Promise<boolean>
}
```

#### B1. Salesforce API Client
**Location**: `/opt/salesos.org/api/src/crm-integrations/clients/salesforce.client.ts`

```typescript
class SalesforceApiClient implements CrmApiClient {
  // Small datasets: SOQL queries with LIMIT/OFFSET
  async fetchRecords(entityType, offset, limit) {
    const query = `SELECT ${fields} FROM ${object} LIMIT ${limit} OFFSET ${offset}`;
    return this.query(query);
  }

  // Large datasets: Bulk API 2.0
  async* bulkFetchRecords(entityType) {
    // Create bulk job
    const jobId = await this.createBulkJob(entityType);

    // Poll for completion
    await this.waitForJobCompletion(jobId);

    // Stream results in batches
    for await (const batch of this.getBulkResults(jobId)) {
      yield batch;
    }
  }
}
```

**APIs Used**:
- Standard REST API: For < 1,000 records
- Bulk API 2.0: For > 1,000 records (up to 150M records)

**Rate Limits**:
- REST API: 15,000 calls/24 hours (varies by edition)
- Bulk API: Independent limit pool

---

#### B2. HubSpot API Client
**Location**: `/opt/salesos.org/api/src/crm-integrations/clients/hubspot.client.ts`

```typescript
class HubSpotApiClient implements CrmApiClient {
  // Small datasets: Search API with pagination
  async fetchRecords(entityType, offset, limit) {
    return this.searchAPI.search({
      filters: [],
      after: offset,
      limit: limit
    });
  }

  // Large datasets: Batch API
  async* bulkFetchRecords(entityType) {
    const totalCount = await this.getRecordCount(entityType);
    const batchSize = 100; // HubSpot batch limit

    for (let offset = 0; offset < totalCount; offset += batchSize) {
      const batch = await this.batchAPI.read(entityType, offset, batchSize);
      yield batch;
    }
  }
}
```

**APIs Used**:
- Search API: For searching with filters
- Batch API: For bulk reads (100 records/request)

**Rate Limits**:
- Professional: 10 requests/second
- Enterprise: 15 requests/second

---

#### B3. Pipedrive API Client
**Location**: `/opt/salesos.org/api/src/crm-integrations/clients/pipedrive.client.ts`

```typescript
class PipedriveApiClient implements CrmApiClient {
  // Pagination for all sizes (no bulk API)
  async fetchRecords(entityType, offset, limit) {
    return this.get(`/${entityType}`, {
      start: offset,
      limit: Math.min(limit, 500) // Max 500/request
    });
  }

  // Batch fetching with rate limit handling
  async* bulkFetchRecords(entityType) {
    const totalCount = await this.getRecordCount(entityType);
    const batchSize = 500;

    for (let offset = 0; offset < totalCount; offset += batchSize) {
      await this.rateLimiter.wait(); // Respect rate limits
      const batch = await this.fetchRecords(entityType, offset, batchSize);
      yield batch;
    }
  }
}
```

**Rate Limits**:
- 10,000 requests/day (resets at midnight UTC)
- Exponential backoff on 429 errors

---

#### B4. Zoho CRM API Client
**Location**: `/opt/salesos.org/api/src/crm-integrations/clients/zoho.client.ts`

```typescript
class ZohoApiClient implements CrmApiClient {
  // Standard pagination
  async fetchRecords(entityType, offset, limit) {
    return this.get(`/${entityType}`, {
      page: Math.floor(offset / 200) + 1,
      per_page: Math.min(limit, 200) // Max 200/request
    });
  }

  // Bulk API for large exports
  async* bulkFetchRecords(entityType) {
    // Create bulk read job
    const jobId = await this.bulkAPI.createJob({
      operation: 'read',
      module: entityType
    });

    // Download results
    const fileUrl = await this.bulkAPI.getResult(jobId);
    const records = await this.downloadCSV(fileUrl);
    yield records;
  }
}
```

**Rate Limits**:
- Free: 200 API calls/day
- Professional: 25,000 API calls/day
- Bulk API: Separate limits

---

#### B5. Monday.com API Client
**Location**: `/opt/salesos.org/api/src/crm-integrations/clients/monday.client.ts`

```typescript
class MondayApiClient implements CrmApiClient {
  // GraphQL queries with cursor pagination
  async fetchRecords(entityType, cursor, limit) {
    const query = `{
      boards(ids: ${boardId}) {
        items(limit: ${limit}, cursor: "${cursor}") {
          id
          name
          column_values { ... }
          cursor
        }
      }
    }`;
    return this.graphql(query);
  }

  // Paginate through all records
  async* bulkFetchRecords(entityType) {
    let cursor = null;
    while (true) {
      const batch = await this.fetchRecords(entityType, cursor, 100);
      yield batch.items;
      if (!batch.cursor) break;
      cursor = batch.cursor;
    }
  }
}
```

**Rate Limits**:
- 10,000,000 complexity points/minute
- Each query has complexity cost

---

### 3. Rate Limit Handler

**Location**: `/opt/salesos.org/api/src/crm-integrations/rate-limiter.service.ts`

```typescript
class RateLimiterService {
  // Exponential backoff with jitter
  async wait(retryCount: number = 0) {
    const backoff = Math.min(1000 * Math.pow(2, retryCount), 30000);
    const jitter = Math.random() * 1000;
    await sleep(backoff + jitter);
  }

  // Handle 429 responses
  async handleRateLimit(response: Response) {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      await sleep(parseInt(retryAfter) * 1000);
    } else {
      await this.wait();
    }
  }
}
```

---

### 4. Encryption Service

**Location**: `/opt/salesos.org/api/src/crm-integrations/encryption.service.ts`

```typescript
class EncryptionService {
  // Encrypt OAuth tokens before storing
  encrypt(plaintext: string): string {
    // AES-256-GCM encryption
    // Key from environment variable
  }

  // Decrypt tokens when needed
  decrypt(ciphertext: string): string {
    // Decrypt with same key
  }
}
```

**Security**:
- AES-256-GCM encryption
- Encryption key stored in environment variable
- Tokens encrypted at rest in database
- Keys rotated quarterly

---

## API Endpoints

### OAuth Endpoints

```typescript
// Get authorization URL
GET /api/crm-integrations/:crmType/authorize
→ Returns: { authUrl: string, state: string }

// OAuth callback (redirect endpoint)
GET /api/crm-integrations/:crmType/callback?code=xxx&state=yyy
→ Creates CrmConnection
→ Redirects to: /dashboard/settings/migration?connected=true

// List connections
GET /api/crm-integrations/connections
→ Returns: CrmConnection[]

// Revoke connection
DELETE /api/crm-integrations/connections/:id
→ Revokes OAuth token and marks inactive

// Test connection
POST /api/crm-integrations/connections/:id/test
→ Returns: { isValid: boolean, error?: string }
```

### Migration Endpoints (Enhanced)

```typescript
// Get record count from CRM (new)
POST /api/import-export/crm-count
Body: { connectionId: string, entityType: string }
→ Returns: { count: number, useBulkApi: boolean }

// Start API import (new)
POST /api/import-export/import-api
Body: {
  connectionId: string,
  entityType: string,
  fieldMappings: MigrationFieldMapping[]
}
→ Returns: { migrationId: string }

// Existing endpoints remain unchanged
```

---

## Record Count Thresholds

| Records | API Strategy | CRM-Specific Implementation |
|---------|--------------|----------------------------|
| **< 1,000** | Standard API with pagination | All CRMs: REST/GraphQL with LIMIT/OFFSET |
| **1,000 - 10,000** | Batched API calls | Salesforce: REST, Others: Batch APIs |
| **> 10,000** | Bulk API | Salesforce: Bulk 2.0, HubSpot: Batch, Zoho: Bulk Read |
| **> 100,000** | Bulk API + Background Job | Async processing, email notification on completion |

---

## Frontend Changes

### 1. New Import Method Selector Component

**File**: `/opt/salesos.org/pages/dashboard/settings/Migration.tsx`

Add after Step 1 (Choose CRM):

```tsx
{step === 1.5 && (
  <ImportMethodSelector
    crmType={selectedCRM}
    importMethod={importMethod}
    onSelectMethod={setImportMethod}
    connection={activeConnection}
    onConnect={handleOAuthConnect}
  />
)}
```

### 2. OAuth Connection Button

```tsx
<button
  onClick={() => initiateOAuth(selectedCRM)}
  className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full"
>
  Connect to {selectedCRM}
</button>
```

### 3. Record Count Display

```tsx
{importMethod === 'api' && recordCount && (
  <div className="bg-[#F0EBD8] rounded-2xl p-4">
    <p className="text-sm text-[#666]">
      Found <strong>{recordCount.toLocaleString()}</strong> {entityType} records
    </p>
    <p className="text-xs text-[#999] mt-1">
      Using {recordCount > 1000 ? 'Bulk API' : 'Standard API'} for optimal performance
    </p>
  </div>
)}
```

---

## Security Considerations

### 1. OAuth Token Storage
- ✅ Encrypted at rest (AES-256-GCM)
- ✅ Encrypted in transit (HTTPS)
- ✅ Scoped to minimum required permissions
- ✅ Auto-refresh before expiration
- ✅ Revokable by user

### 2. Multi-Tenant Isolation
- ✅ CrmConnection has `organizationId`
- ✅ All queries filtered by organization
- ✅ Users can only see their org's connections
- ✅ RBAC enforced (ADMIN/OWNER only)

### 3. Rate Limit Protection
- ✅ Exponential backoff on errors
- ✅ Respect CRM-specific rate limits
- ✅ Queue system for concurrent imports
- ✅ Graceful degradation

### 4. Data Privacy
- ✅ Tokens encrypted at rest
- ✅ No logs containing tokens
- ✅ Audit trail for all connections
- ✅ GDPR compliant (right to delete)

---

## Testing Plan

### Unit Tests
```bash
# OAuth Service
- ✅ Generate authorization URL
- ✅ Handle callback with valid code
- ✅ Handle callback with invalid state
- ✅ Refresh expired tokens
- ✅ Encrypt/decrypt tokens

# API Clients
- ✅ Fetch records with pagination
- ✅ Bulk fetch for large datasets
- ✅ Handle rate limits
- ✅ Handle API errors

# Migration Service
- ✅ Import via API with field mapping
- ✅ Choose correct strategy based on count
- ✅ Handle connection failures
```

### Integration Tests
```bash
# End-to-end OAuth flow
1. Start authorization
2. Mock CRM callback
3. Verify connection created
4. Fetch test records
5. Import with mapping
6. Verify data in database
```

---

## Rollout Plan

### Phase 1: Salesforce Only (Week 1-2)
- Implement OAuth for Salesforce
- Salesforce API client with bulk support
- Frontend OAuth flow
- Testing with real Salesforce account

### Phase 2: HubSpot (Week 3)
- HubSpot OAuth integration
- HubSpot API client
- Testing

### Phase 3: Other CRMs (Week 4-5)
- Pipedrive, Zoho, Monday.com
- Individual API clients
- Testing

### Phase 4: Polish & Documentation (Week 6)
- Error handling improvements
- User documentation
- Video tutorials
- Launch announcement

---

## Success Metrics

- **Connection Success Rate**: > 95%
- **Import Completion Rate**: > 98%
- **Average Import Time**:
  - 1,000 records: < 5 minutes
  - 10,000 records: < 15 minutes
  - 100,000 records: < 60 minutes
- **User Satisfaction**: 4.5+ stars
- **API vs CSV Usage**: Track adoption of each method

---

## Status: NOT YET FULLY IMPLEMENTED

**What's Done**:
- ✅ Database schema updated
- ✅ Prisma models defined
- ✅ Architecture documented

**What's Remaining**:
- ⏳ OAuth service implementation
- ⏳ CRM API clients (5 clients)
- ⏳ Frontend OAuth flow
- ⏳ Import method selector UI
- ⏳ Record count API
- ⏳ Bulk API implementations
- ⏳ Rate limit handling
- ⏳ Token encryption
- ⏳ Testing
- ⏳ Documentation

**Estimated Time to Complete**: 4-6 weeks full implementation

---

**Next Steps**:
1. Push schema changes to database
2. Implement Salesforce OAuth as MVP
3. Test end-to-end with real Salesforce account
4. Iterate based on feedback

**Decision Point**: Should we proceed with full implementation now, or launch CSV-based migration first and add API integration based on user demand?
