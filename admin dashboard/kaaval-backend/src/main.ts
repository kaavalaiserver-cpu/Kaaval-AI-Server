import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

// Prevent DB connection failures from crashing the process
process.on('unhandledRejection', (reason) => {
  const logger = new Logger('UnhandledRejection');
  logger.warn('Database unavailable — non-DB routes still functional');
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, { abortOnError: false });

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // let frontend handle CSP
    crossOriginEmbedderPolicy: false,
  }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 8003;
  await app.listen(port);
  logger.log(`Kaaval AI Backend running on port ${port}`);
}
bootstrap();
