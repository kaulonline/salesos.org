import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { ApplicationLogService } from './admin/application-log.service';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Raw body is captured via body-parser verify callback below (for webhook signature verification)
    // Reduce log verbosity - only show warnings and errors in production
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['log', 'error', 'warn'], // Exclude DEBUG level
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Serve static files from uploads directory (for avatars, etc.)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Get the ApplicationLogService for global filters/interceptors
  const applicationLogService = app.get(ApplicationLogService);

  // ===== SECURITY: Helmet middleware for HTTP security headers =====
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.ipdata.co", "wss:", "https:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Needed for some third-party integrations
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }));

  // Body size limits - reduced from 150mb for security (DoS prevention)
  // Use verify callback to preserve raw body for webhook signature verification (Zoom, Stripe, etc.)
  app.use(bodyParser.json({
    limit: '50mb', // Reduced from 150mb - still allows large file uploads
    verify: (req: any, res, buf) => {
      // Preserve raw body for webhook signature verification
      // This is required for Zoom, Stripe, and other services that sign payloads
      req.rawBody = buf;
    },
  }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  app.setGlobalPrefix('api');

  // ===== SECURITY: Environment-aware CORS configuration =====
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = isProduction
    ? [
        'https://engage.iriseller.com',
        'https://new.iriseller.com',
        'https://iriseller.com',
        'https://salesos.org',
        'https://www.salesos.org',
      ]
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'https://engage.iriseller.com',
        'https://new.iriseller.com',
        'https://iriseller.com',
        'https://salesos.org',
      ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-ID', 'X-CSRF-Token', 'X-Request-ID'],
    maxAge: 3600, // Cache preflight for 1 hour
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter for centralized error logging
  app.useGlobalFilters(new GlobalExceptionFilter(applicationLogService));
  
  // Global interceptor for request/response logging
  app.useGlobalInterceptors(new RequestLoggingInterceptor(applicationLogService));

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  
  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log('Global exception filter and request logging interceptor enabled');
}
bootstrap();
