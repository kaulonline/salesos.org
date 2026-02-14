import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tags exposed in the public API documentation.
 * Only CRM-facing endpoints that external developers need.
 */
const PUBLIC_API_TAGS = [
  // CRM Core
  'Auth',
  'Leads',
  'Contacts',
  'Accounts',
  'Opportunities',
  'Pipelines',
  'Products',
  'Quotes',
  'Orders',
  'Contracts',
  'Tasks',
  'Activities',
  'Notes',
  'Campaigns',
  'Competitors',
  // Communication
  'Conversations',
  'Call Intelligence',
  'Meetings',
  // Sales Intelligence
  'Sales Coaching',
  'Playbooks',
  // CPQ & Analytics
  'Price Books',
  'CPQ Analytics',
  'Reports',
  'Dashboard',
  // Developer Tools
  'Webhooks',
  'API Keys',
  'Custom Fields',
  'Web Forms',
  'Email Templates',
  // Documents
  'Documents',
  'E-Signature',
  // Other
  'Search',
  'Notifications',
  'Territories',
  'Splits',
];

const TAG_DESCRIPTIONS: Record<string, string> = {
  Auth: 'Authentication, registration, and session management',
  Leads: 'Lead management and conversion',
  Contacts: 'Contact records and relationships',
  Accounts: 'Account/company management',
  Opportunities: 'Opportunity tracking and pipeline',
  Pipelines: 'Sales pipeline configuration',
  Products: 'Product catalog management',
  Quotes: 'Quote creation and management',
  Orders: 'Order processing and fulfillment',
  Contracts: 'Contract lifecycle management',
  Tasks: 'Task management and assignment',
  Activities: 'Activity tracking and logging',
  Notes: 'Notes on records',
  Campaigns: 'Marketing campaign management',
  Competitors: 'Competitor tracking',
  Conversations: 'Conversation threads and messaging',
  'Call Intelligence': 'Call recording analysis and insights',
  Meetings: 'Meeting scheduling and management',
  'Sales Coaching': 'AI-powered sales coaching',
  Playbooks: 'Sales playbook management',
  'Price Books': 'Price book management',
  'CPQ Analytics': 'Configure-Price-Quote analytics',
  Reports: 'Reporting and analytics',
  Dashboard: 'Dashboard data and widgets',
  Webhooks: 'Webhook subscription management',
  'API Keys': 'API key management',
  'Custom Fields': 'Custom field definitions',
  'Web Forms': 'Web form builder and submissions',
  'Email Templates': 'Email template management',
  Documents: 'Document management',
  'E-Signature': 'Electronic signature workflows',
  Search: 'Global search',
  Notifications: 'Notification management',
  Territories: 'Sales territory management',
  Splits: 'Revenue split configuration',
};

export function buildSwaggerDocument(app: INestApplication) {
  let builder = new DocumentBuilder()
    .setTitle('SalesOS API')
    .setDescription(
      'SalesOS is an AI-powered Sales CRM and Revenue Intelligence platform. ' +
      'This API provides programmatic access to CRM data, sales coaching, CPQ, and more.',
    )
    .setVersion('1.0.0')
    .addServer('https://salesos.org/api', 'Production')
    .addServer('http://localhost:4000/api', 'Local Development')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token',
      },
      'JWT',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API Key authentication',
      },
      'ApiKey',
    );

  for (const tag of PUBLIC_API_TAGS) {
    builder = builder.addTag(tag, TAG_DESCRIPTIONS[tag] || '');
  }

  const config = builder.build();

  return SwaggerModule.createDocument(app, config);
}

/**
 * Filter an OpenAPI document to only include paths belonging to the public tags.
 * Also removes unreferenced schemas from components.
 */
function filterPublicEndpoints(document: any): void {
  const publicTags = new Set(PUBLIC_API_TAGS);

  // Filter paths: keep only operations whose tags intersect with PUBLIC_API_TAGS
  const paths = document.paths || {};
  for (const [pathKey, methods] of Object.entries(paths)) {
    const methodsObj = methods as Record<string, any>;
    for (const [method, op] of Object.entries(methodsObj)) {
      if (typeof op !== 'object' || !op.tags) continue;
      const hasPublicTag = op.tags.some((t: string) => publicTags.has(t));
      if (!hasPublicTag) {
        delete methodsObj[method];
      } else {
        // Strip non-public tags from remaining operations
        op.tags = op.tags.filter((t: string) => publicTags.has(t));
      }
    }
    // Remove path entirely if no methods remain
    const remaining = Object.keys(methodsObj).filter(
      (k) => typeof methodsObj[k] === 'object',
    );
    if (remaining.length === 0) {
      delete paths[pathKey];
    }
  }

  // Filter tags array
  if (document.tags) {
    document.tags = document.tags.filter((t: any) => publicTags.has(t.name));
  }

  // Remove unreferenced schemas
  const docStr = JSON.stringify(document.paths || {});
  if (document.components?.schemas) {
    const schemas = document.components.schemas;
    // Iteratively remove unreferenced schemas (schemas can reference other schemas)
    let changed = true;
    while (changed) {
      changed = false;
      const currentDoc = JSON.stringify(document);
      for (const name of Object.keys(schemas)) {
        const ref = `#/components/schemas/${name}`;
        // Count references (excluding the schema's own definition key)
        const refCount = currentDoc.split(`"$ref":"${ref}"`).length - 1;
        if (refCount === 0) {
          delete schemas[name];
          changed = true;
        }
      }
    }
  }
}

export async function writeOpenApiSpec(app: INestApplication, outputPath?: string) {
  const document = buildSwaggerDocument(app);

  // Normalize security requirements: some controllers use @ApiBearerAuth() (defaults to 'bearer')
  // while others use @ApiBearerAuth('JWT'). Unify all to reference the 'JWT' scheme.
  for (const methods of Object.values(document.paths || {})) {
    for (const op of Object.values(methods as Record<string, any>)) {
      if (op?.security) {
        op.security = op.security.map((req: Record<string, string[]>) => {
          if ('bearer' in req) {
            const { bearer, ...rest } = req;
            return { JWT: bearer, ...rest };
          }
          return req;
        });
      }
    }
  }

  // Filter to only public-facing API tags
  filterPublicEndpoints(document);

  const target = outputPath || path.join(__dirname, '..', '..', 'docs', 'openapi.json');

  // Ensure directory exists
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(target, JSON.stringify(document, null, 2));
  console.log(`OpenAPI spec written to ${target}`);
  console.log(`  Paths: ${Object.keys(document.paths || {}).length}`);
  console.log(`  Tags: ${(document.tags || []).length}`);

  return document;
}
