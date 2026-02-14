/**
 * Standalone script to generate OpenAPI spec from the NestJS application.
 *
 * Usage:
 *   cd /opt/salesos.org/api
 *   npx ts-node -r tsconfig-paths/register scripts/generate-openapi.ts
 *
 * Or via npm script:
 *   npm run generate:openapi
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { writeOpenApiSpec } from '../src/swagger.setup';

async function generate() {
  // Create app without listening or initializing providers.
  // SwaggerModule.createDocument() only needs the module metadata (controllers,
  // decorators, DTOs) which is resolved at creation time — no database, Redis,
  // or other runtime connections are needed.
  const app = await NestFactory.create(AppModule, {
    logger: ['error'],
    // Prevent lifecycle hooks (onModuleInit) from running — avoids DB connections
    preview: true,
  });

  app.setGlobalPrefix('api');

  await writeOpenApiSpec(app);

  await app.close();
  process.exit(0);
}

generate().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
