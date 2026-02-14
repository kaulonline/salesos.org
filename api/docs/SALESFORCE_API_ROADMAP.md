# Salesforce Direct API Integration - Phase 2 Roadmap

**Start Date**: TBD (after CSV migration launch)
**Estimated Duration**: 2-3 weeks
**Goal**: Enable one-click Salesforce migration via OAuth + API

---

## Why Salesforce First?

1. **Market Leader**: 23% CRM market share (largest)
2. **Enterprise Focus**: Most enterprise customers use Salesforce
3. **High Demand**: Most requested integration
4. **Well-Documented API**: Mature, stable API with excellent docs
5. **Bulk API**: Can handle datasets up to 150 million records
6. **ROI**: Biggest impact for development time invested

---

## User Experience

### Current Flow (CSV):
```
1. User exports from Salesforce (manual, 30+ min wait)
2. Downloads CSV
3. Uploads to SalesOS
4. Maps fields
5. Imports
TOTAL TIME: ~45-60 minutes
```

### Target Flow (Direct API):
```
1. Click "Connect to Salesforce"
2. Authorize SalesOS (OAuth)
3. Select what to import
4. AI maps fields automatically
5. Click "Start Import"
TOTAL TIME: ~5 minutes + import time
```

**Time Savings**: ~40-50 minutes per migration

---

## Technical Architecture

### 1. OAuth 2.0 Web Server Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: User clicks "Connect to Salesforce"                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Redirect to Salesforce                                 │
│ URL: https://login.salesforce.com/services/oauth2/authorize    │
│ Params:                                                         │
│   response_type=code                                            │
│   client_id={connected_app_id}                                  │
│   redirect_uri={callback_url}                                   │
│   scope=api refresh_token                                       │
│   state={csrf_token}                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: User logs in to Salesforce and authorizes              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Salesforce redirects back with code                    │
│ URL: {redirect_uri}?code=xxx&state=yyy                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Exchange code for tokens                               │
│ POST: https://{instance}.salesforce.com/services/oauth2/token  │
│ Response: {                                                     │
│   access_token: "...",                                          │
│   refresh_token: "...",                                         │
│   instance_url: "https://mycompany.my.salesforce.com",         │
│   id: "https://login.salesforce.com/id/00D.../005...",         │
│   issued_at: "1234567890",                                      │
│   signature: "..."                                              │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Store encrypted tokens in CrmConnection table          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Week 1: OAuth + Standard REST API

#### Task 1.1: Salesforce Connected App Setup
**File**: Manual setup in Salesforce org
**Deliverable**: Connected App credentials

**Steps**:
1. Create Salesforce Developer account
2. Create Connected App in Setup
3. Configure OAuth settings:
   - Callback URL: `https://salesos.org/api/crm-integrations/salesforce/callback`
   - Scopes: `api`, `refresh_token`, `offline_access`
4. Get Consumer Key and Secret
5. Store in environment variables

---

#### Task 1.2: OAuth Service Implementation
**File**: `/opt/salesos.org/api/src/crm-integrations/salesforce-oauth.service.ts`

```typescript
@Injectable()
export class SalesforceOAuthService {
  private readonly clientId = process.env.SALESFORCE_CLIENT_ID;
  private readonly clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  private readonly redirectUri = process.env.SALESFORCE_REDIRECT_URI;

  /**
   * Generate authorization URL
   */
  getAuthorizationUrl(userId: string, organizationId: string): string {
    const state = this.generateState(userId, organizationId);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'api refresh_token offline_access',
      state,
    });
    return `https://login.salesforce.com/services/oauth2/authorize?${params}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, state: string) {
    // Verify state (CSRF protection)
    const { userId, organizationId } = await this.verifyState(state);

    // Exchange code for tokens
    const response = await axios.post(
      'https://login.salesforce.com/services/oauth2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      })
    );

    // Encrypt and store tokens
    const connection = await this.prisma.crmConnection.create({
      data: {
        userId,
        organizationId,
        integrationId: this.getSalesforceIntegrationId(),
        instanceUrl: response.data.instance_url,
        accessToken: this.encrypt(response.data.access_token),
        refreshToken: this.encrypt(response.data.refresh_token),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        externalOrgId: this.extractOrgId(response.data.id),
        externalUserId: this.extractUserId(response.data.id),
        isActive: true,
      },
    });

    return connection;
  }

  /**
   * Refresh expired access token
   */
  async refreshAccessToken(connectionId: string) {
    const connection = await this.prisma.crmConnection.findUnique({
      where: { id: connectionId },
    });

    const response = await axios.post(
      `${connection.instanceUrl}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.decrypt(connection.refreshToken),
        client_id: this.clientId,
        client_secret: this.clientSecret,
      })
    );

    // Update with new access token
    await this.prisma.crmConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: this.encrypt(response.data.access_token),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });
  }
}
```

**Tests**:
- ✅ Generate valid authorization URL
- ✅ Verify state token (CSRF protection)
- ✅ Exchange code for tokens
- ✅ Store encrypted tokens
- ✅ Refresh expired tokens

---

#### Task 1.3: Salesforce REST API Client
**File**: `/opt/salesos.org/api/src/crm-integrations/clients/salesforce.client.ts`

```typescript
@Injectable()
export class SalesforceApiClient {
  private readonly apiVersion = 'v59.0';

  /**
   * Get count of records
   */
  async getRecordCount(
    connection: CrmConnection,
    entityType: 'Lead' | 'Contact' | 'Account' | 'Opportunity'
  ): Promise<number> {
    const query = `SELECT COUNT() FROM ${entityType}`;
    const result = await this.query(connection, query);
    return result.totalSize;
  }

  /**
   * Fetch records with pagination (for < 1,000 records)
   */
  async fetchRecords(
    connection: CrmConnection,
    entityType: string,
    fields: string[],
    offset: number = 0,
    limit: number = 200
  ): Promise<any[]> {
    const fieldList = fields.join(', ');
    const query = `SELECT ${fieldList} FROM ${entityType} LIMIT ${limit} OFFSET ${offset}`;

    const result = await this.query(connection, query);
    return result.records;
  }

  /**
   * Execute SOQL query
   */
  private async query(connection: CrmConnection, soql: string) {
    const accessToken = this.decrypt(connection.accessToken);

    const response = await axios.get(
      `${connection.instanceUrl}/services/data/${this.apiVersion}/query`,
      {
        params: { q: soql },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  /**
   * Test connection validity
   */
  async testConnection(connection: CrmConnection): Promise<boolean> {
    try {
      await this.query(connection, 'SELECT Id FROM User LIMIT 1');
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired, try to refresh
        await this.oauthService.refreshAccessToken(connection.id);
        return this.testConnection(connection);
      }
      return false;
    }
  }
}
```

**Tests**:
- ✅ Get record count
- ✅ Fetch records with pagination
- ✅ Handle expired tokens (auto-refresh)
- ✅ Handle rate limits
- ✅ Handle API errors

---

### Week 2: Bulk API 2.0 Implementation

#### Task 2.1: Bulk API Client
**File**: `/opt/salesos.org/api/src/crm-integrations/clients/salesforce-bulk.client.ts`

```typescript
@Injectable()
export class SalesforceBulkApiClient {
  /**
   * Bulk fetch for large datasets (> 1,000 records)
   */
  async* bulkFetchRecords(
    connection: CrmConnection,
    entityType: string,
    fields: string[]
  ): AsyncIterator<any[]> {
    // Step 1: Create bulk query job
    const jobId = await this.createBulkJob(connection, entityType, fields);

    // Step 2: Poll for job completion
    await this.waitForJobCompletion(connection, jobId);

    // Step 3: Get result locator
    const locator = await this.getResultLocator(connection, jobId);

    // Step 4: Stream results in batches
    let hasMore = true;
    let currentLocator = locator;

    while (hasMore) {
      const batch = await this.getResultBatch(connection, jobId, currentLocator);

      // Parse CSV batch
      const records = this.parseCSVBatch(batch.data);
      yield records;

      // Check for more results
      hasMore = batch.hasMore;
      currentLocator = batch.nextLocator;
    }

    // Step 5: Close job
    await this.closeBulkJob(connection, jobId);
  }

  /**
   * Create bulk query job
   */
  private async createBulkJob(
    connection: CrmConnection,
    entityType: string,
    fields: string[]
  ): Promise<string> {
    const accessToken = this.decrypt(connection.accessToken);

    const response = await axios.post(
      `${connection.instanceUrl}/services/data/v59.0/jobs/query`,
      {
        operation: 'query',
        query: `SELECT ${fields.join(', ')} FROM ${entityType}`,
        contentType: 'CSV',
        columnDelimiter: 'COMMA',
        lineEnding: 'LF',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.id;
  }

  /**
   * Poll for job completion
   */
  private async waitForJobCompletion(
    connection: CrmConnection,
    jobId: string,
    maxWaitMs: number = 300000 // 5 minutes
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getJobStatus(connection, jobId);

      if (status.state === 'JobComplete') {
        return;
      }

      if (status.state === 'Failed' || status.state === 'Aborted') {
        throw new Error(`Bulk job ${status.state}: ${status.errorMessage}`);
      }

      // Wait 5 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error('Bulk job timeout after 5 minutes');
  }

  /**
   * Get result batch
   */
  private async getResultBatch(
    connection: CrmConnection,
    jobId: string,
    locator: string
  ) {
    const accessToken = this.decrypt(connection.accessToken);

    const response = await axios.get(
      `${connection.instanceUrl}/services/data/v59.0/jobs/query/${jobId}/results`,
      {
        params: locator ? { locator } : {},
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/csv',
        },
      }
    );

    return {
      data: response.data,
      hasMore: response.headers['sforce-locator'] !== 'null',
      nextLocator: response.headers['sforce-locator'],
    };
  }
}
```

**Tests**:
- ✅ Create bulk job
- ✅ Poll until completion
- ✅ Stream results in batches
- ✅ Handle job failures
- ✅ Parse CSV results

---

#### Task 2.2: Smart Strategy Selector
**File**: `/opt/salesos.org/api/src/crm-integrations/salesforce-strategy.service.ts`

```typescript
@Injectable()
export class SalesforceStrategyService {
  /**
   * Choose optimal import strategy based on record count
   */
  async selectStrategy(
    connection: CrmConnection,
    entityType: string
  ): Promise<'rest' | 'bulk'> {
    const count = await this.apiClient.getRecordCount(connection, entityType);

    // < 1,000 records: Use REST API (faster for small datasets)
    if (count < 1000) {
      return 'rest';
    }

    // > 1,000 records: Use Bulk API 2.0 (optimized for large datasets)
    return 'bulk';
  }

  /**
   * Import records using selected strategy
   */
  async importRecords(
    connection: CrmConnection,
    entityType: string,
    fields: string[],
    fieldMappings: MigrationFieldMapping[],
    migrationId: string
  ): Promise<void> {
    const strategy = await this.selectStrategy(connection, entityType);

    if (strategy === 'rest') {
      await this.importViaRest(connection, entityType, fields, fieldMappings, migrationId);
    } else {
      await this.importViaBulk(connection, entityType, fields, fieldMappings, migrationId);
    }
  }

  /**
   * Import via REST API (small datasets)
   */
  private async importViaRest(...) {
    const count = await this.apiClient.getRecordCount(connection, entityType);
    const batchSize = 200;

    for (let offset = 0; offset < count; offset += batchSize) {
      const records = await this.apiClient.fetchRecords(
        connection,
        entityType,
        fields,
        offset,
        batchSize
      );

      await this.processAndImport(records, fieldMappings, migrationId);

      // Update progress
      await this.migrationService.updateProgress(migrationId, {
        successCount: offset + records.length,
      });
    }
  }

  /**
   * Import via Bulk API (large datasets)
   */
  private async importViaBulk(...) {
    let totalProcessed = 0;

    for await (const batch of this.bulkClient.bulkFetchRecords(connection, entityType, fields)) {
      await this.processAndImport(batch, fieldMappings, migrationId);

      totalProcessed += batch.length;

      // Update progress every batch
      await this.migrationService.updateProgress(migrationId, {
        apiRecordsFetched: totalProcessed,
      });
    }
  }
}
```

---

### Week 3: Frontend + Testing

#### Task 3.1: OAuth Flow UI
**File**: `/opt/salesos.org/pages/dashboard/settings/Migration.tsx`

Add after CRM selection:

```tsx
{step === 1.5 && (
  <div className="space-y-6">
    <h2 className="text-2xl font-light text-[#1A1A1A]">
      Choose Import Method
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* CSV Upload Option */}
      <button
        onClick={() => setImportMethod('csv')}
        className={`p-6 rounded-2xl border-2 transition-all ${
          importMethod === 'csv'
            ? 'border-[#EAD07D] bg-[#EAD07D]/10'
            : 'border-gray-200 hover:border-[#EAD07D]/50'
        }`}
      >
        <FileUp size={32} className="text-[#1A1A1A] mb-3" />
        <h3 className="text-lg font-semibold text-[#1A1A1A]">
          📁 Upload CSV File
        </h3>
        <p className="text-sm text-[#666] mt-2">
          Export data from Salesforce and upload the CSV file
        </p>
        <div className="mt-4 space-y-1 text-xs text-[#999]">
          <div>✓ Works with any Salesforce edition</div>
          <div>✓ You control what data to export</div>
          <div>✓ No API credentials needed</div>
        </div>
      </button>

      {/* Direct API Option */}
      <button
        onClick={() => setImportMethod('api')}
        className={`p-6 rounded-2xl border-2 transition-all ${
          importMethod === 'api'
            ? 'border-[#EAD07D] bg-[#EAD07D]/10'
            : 'border-gray-200 hover:border-[#EAD07D]/50'
        }`}
      >
        <Zap size={32} className="text-[#1A1A1A] mb-3" />
        <h3 className="text-lg font-semibold text-[#1A1A1A]">
          🔗 Connect Directly
        </h3>
        <p className="text-sm text-[#666] mt-2">
          Connect your Salesforce account and import automatically
        </p>
        <div className="mt-4 space-y-1 text-xs text-[#999]">
          <div>✓ One-click connection (OAuth)</div>
          <div>✓ Automatic data pull</div>
          <div>✓ Optimized for large datasets</div>
        </div>
      </button>
    </div>

    {/* Show connection button if API selected */}
    {importMethod === 'api' && !hasActiveConnection && (
      <div className="text-center">
        <button
          onClick={handleConnectSalesforce}
          className="px-8 py-4 bg-[#1A1A1A] text-white rounded-full font-semibold text-lg hover:bg-[#333] transition-colors"
        >
          Connect to Salesforce
        </button>
        <p className="text-sm text-[#999] mt-3">
          You'll be redirected to Salesforce to authorize SalesOS
        </p>
      </div>
    )}

    {/* Show connected status */}
    {importMethod === 'api' && hasActiveConnection && (
      <div className="bg-[#93C01F]/10 border border-[#93C01F]/30 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle size={24} className="text-[#93C01F]" />
        <div>
          <p className="font-semibold text-[#1A1A1A]">
            Connected to Salesforce
          </p>
          <p className="text-sm text-[#666]">
            {connection.instanceUrl} • Connected {formatDistanceToNow(connection.createdAt)} ago
          </p>
        </div>
      </div>
    )}
  </div>
)}
```

#### Task 3.2: Record Count Display

```tsx
{step === 2 && importMethod === 'api' && (
  <div className="space-y-4">
    <h2 className="text-2xl font-light text-[#1A1A1A]">
      Select Data to Import
    </h2>

    {loading && (
      <div className="flex items-center gap-3 text-[#666]">
        <Loader2 className="animate-spin" size={20} />
        <span>Counting records in your Salesforce account...</span>
      </div>
    )}

    {!loading && recordCounts && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['Lead', 'Contact', 'Account', 'Opportunity'].map(entityType => (
          <div
            key={entityType}
            className="bg-white rounded-2xl p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#1A1A1A]">
                {entityType}s
              </h3>
              <span className="text-2xl font-light text-[#1A1A1A]">
                {recordCounts[entityType].toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-[#999]">
              {recordCounts[entityType] > 1000
                ? '🚀 Will use Bulk API (optimized for large datasets)'
                : '⚡ Will use REST API (fast for small datasets)'
              }
            </p>
            <button
              onClick={() => handleSelectEntity(entityType)}
              className="w-full mt-4 py-2 px-4 bg-[#F0EBD8] hover:bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A] transition-colors"
            >
              Import {entityType}s
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

#### Task 3.3: Integration Tests

```typescript
describe('Salesforce Direct API - E2E', () => {
  it('should complete OAuth flow', async () => {
    // 1. Start authorization
    const authUrl = await salesforceOAuth.getAuthorizationUrl(userId, orgId);
    expect(authUrl).toContain('login.salesforce.com');

    // 2. Simulate OAuth callback
    const code = 'mock_auth_code';
    const state = extractStateFromUrl(authUrl);
    const connection = await salesforceOAuth.exchangeCodeForTokens(code, state);

    // 3. Verify connection created
    expect(connection.userId).toBe(userId);
    expect(connection.organizationId).toBe(orgId);
    expect(connection.isActive).toBe(true);
  });

  it('should fetch record count', async () => {
    const count = await salesforceClient.getRecordCount(connection, 'Lead');
    expect(count).toBeGreaterThan(0);
  });

  it('should import via REST API (<1k records)', async () => {
    const migrationId = await createMigration({
      importMethod: 'api',
      connectionId: connection.id,
      entityType: 'Lead',
    });

    await strategyService.importRecords(
      connection,
      'Lead',
      fields,
      mappings,
      migrationId
    );

    const migration = await getMigration(migrationId);
    expect(migration.status).toBe('COMPLETED');
    expect(migration.successCount).toBeGreaterThan(0);
  });

  it('should import via Bulk API (>1k records)', async () => {
    // Test with large dataset
  });
});
```

---

## API Rate Limits

### Salesforce REST API Limits:
- **Professional Edition**: 5,000 calls/24 hours
- **Enterprise Edition**: 10,000 calls/24 hours
- **Unlimited Edition**: 25,000 calls/24 hours
- **Developer Edition**: 5,000 calls/24 hours

**Our Strategy**:
- Use Bulk API for > 1,000 records (separate limit pool)
- REST API for < 1,000 records
- Exponential backoff on 429 errors

### Salesforce Bulk API 2.0 Limits:
- **Concurrent Jobs**: 200 per org
- **Records per Job**: 150 million
- **Job Duration**: Max 10 minutes
- **No API call limits** (uses separate governor)

---

## Environment Variables Required

```bash
# Salesforce OAuth
SALESFORCE_CLIENT_ID=your_connected_app_consumer_key
SALESFORCE_CLIENT_SECRET=your_connected_app_consumer_secret
SALESFORCE_REDIRECT_URI=https://salesos.org/api/crm-integrations/salesforce/callback

# Token Encryption
ENCRYPTION_KEY=random_32_byte_key_base64_encoded

# API Version
SALESFORCE_API_VERSION=v59.0
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| OAuth Success Rate | > 98% |
| Import Success Rate | > 99% for valid data |
| Small Dataset (<1k) Import Time | < 5 minutes |
| Large Dataset (10k) Import Time | < 20 minutes |
| Bulk Import (100k) Time | < 90 minutes |
| User Satisfaction | 4.5+ stars |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OAuth failures | Clear error messages, retry flow |
| Token expiration | Auto-refresh before API calls |
| Rate limit errors | Exponential backoff, queue system |
| Large dataset timeout | Use Bulk API 2.0, background job |
| Data mapping errors | Preview before import, rollback option |
| Security concerns | Encrypted tokens, RBAC, audit trail |

---

## Launch Checklist

- [ ] Salesforce Connected App created and approved
- [ ] OAuth flow tested with real Salesforce account
- [ ] REST API client tested with <1k records
- [ ] Bulk API client tested with >10k records
- [ ] Strategy selector chooses correctly
- [ ] Frontend OAuth flow works end-to-end
- [ ] Token encryption working
- [ ] Token refresh working
- [ ] Error handling comprehensive
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] User guide with screenshots
- [ ] Launch announcement prepared

---

## Timeline

**Week 1** (5 days):
- Day 1-2: Connected App setup + OAuth service
- Day 3-4: REST API client
- Day 5: Testing OAuth + REST

**Week 2** (5 days):
- Day 1-2: Bulk API 2.0 client
- Day 3: Strategy selector
- Day 4-5: Integration testing

**Week 3** (5 days):
- Day 1-2: Frontend OAuth flow
- Day 3: Record count UI
- Day 4: End-to-end testing
- Day 5: Documentation + Launch

**Total**: 15 working days (~3 weeks)

---

## Post-Launch

After Salesforce API launches:

1. **Monitor** usage and success rates
2. **Gather feedback** from early users
3. **Iterate** based on learnings
4. **Decide** on next CRM (likely HubSpot based on demand)
5. **Maintain** CSV as fallback option

---

**Status**: ⏳ READY TO START (after CSV migration launches)
