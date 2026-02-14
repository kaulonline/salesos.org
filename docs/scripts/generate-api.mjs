/**
 * Generate API reference MDX pages from the OpenAPI spec.
 *
 * Usage:
 *   node scripts/generate-api.mjs
 *
 * Or via npm script:
 *   npm run generate:api
 */
import { generateFiles } from 'fumadocs-openapi';
import path from 'node:path';
import fs from 'node:fs';

const specPath = './openapi.json';
const outputDir = './content/api-reference';

// Clean existing generated MDX files, keep meta.json and index.mdx
const absOutputDir = path.resolve(outputDir);
if (fs.existsSync(absOutputDir)) {
  const files = fs.readdirSync(absOutputDir, { recursive: true });
  for (const file of files) {
    const filePath = path.join(absOutputDir, String(file));
    const fileName = path.basename(filePath);
    if (
      filePath.endsWith('.mdx') &&
      fileName !== 'index.mdx' &&
      fs.statSync(filePath).isFile()
    ) {
      fs.unlinkSync(filePath);
    }
  }
  // Clean subdirectories (tag folders)
  for (const file of fs.readdirSync(absOutputDir)) {
    const filePath = path.join(absOutputDir, file);
    if (fs.statSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true });
    }
  }
}

// Check if spec exists
if (!fs.existsSync(specPath)) {
  console.error(`OpenAPI spec not found at ${specPath}`);
  console.error('Run "npm run generate:openapi" in the API project first');
  process.exit(1);
}

// Strip admin endpoints and internal details from spec before generating
const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
const adminPaths = Object.keys(spec.paths || {}).filter((p) =>
  p.includes('/admin/'),
);
for (const p of adminPaths) {
  delete spec.paths[p];
}

// Also strip "admin only" operations from remaining paths
for (const [, methods] of Object.entries(spec.paths || {})) {
  for (const [method, op] of Object.entries(methods)) {
    if (
      op &&
      typeof op === 'object' &&
      typeof op.summary === 'string' &&
      op.summary.toLowerCase().includes('admin only')
    ) {
      delete methods[method];
    }
  }
}

const filteredSpecPath = './openapi-public.json';
fs.writeFileSync(filteredSpecPath, JSON.stringify(spec, null, 2));

await generateFiles({
  input: [filteredSpecPath],
  output: outputDir,
  per: 'tag',
  groupBy: 'tag',
});

console.log('API reference pages generated successfully');
