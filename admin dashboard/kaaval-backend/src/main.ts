import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';
import { GlobalHttpExceptionFilter } from './common/http-exception.filter.js';

// Prevent DB connection failures from crashing the process
process.on('unhandledRejection', (reason) => {
  const logger = new Logger('UnhandledRejection');
  logger.warn(`Unhandled rejection: ${reason}`);
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    // Suppress NestJS default exception messages from leaking in responses
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ── Body size limits (prevent DoS via huge payloads) ──────────────────
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // ── Helmet security headers ────────────────────────────────────────────
  app.use(helmet({
    // API server: enforce strict CSP — no scripts/styles should load from here
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'none'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    // Prevent MIME-type sniffing
    noSniff: true,
    // Block clickjacking
    frameguard: { action: 'deny' },
    // Referrer policy
    referrerPolicy: { policy: 'no-referrer' },
    // Force HTTPS in production
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  }));

  // ── Global exception filter (strip stack traces from responses) ────────
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // ── Global validation pipe ─────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown properties
      transform: true,          // auto-transform types
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true, // reject requests with extra fields
      disableErrorMessages: process.env.NODE_ENV === 'production', // hide field names in prod
    }),
  );

  // ── CORS ───────────────────────────────────────────────────────────────
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : process.env.NODE_ENV === 'production'
      ? ['https://yourdomain.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 8003;
  await app.listen(port);
  logger.log(`Kaaval AI Backend running on port ${port} [${process.env.NODE_ENV ?? 'development'}]`);
}
bootstrap();
 
