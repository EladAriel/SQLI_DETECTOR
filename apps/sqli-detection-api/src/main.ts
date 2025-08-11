import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const logger = new Logger('SQLDetectionAPI');

  try {
    logger.log('🚀 Starting SQL Detection API...');

    const logLevel = process.env.LOG_LEVEL?.split(',') as ('error' | 'warn' | 'log' | 'debug' | 'verbose')[] || ['log', 'error', 'warn'];

    logger.log('📦 Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: logLevel,
    });

    logger.log('🔒 Setting up security middleware...');
    // Security middleware
    app.use(helmet());
    app.use(compression());
    app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    }));

    logger.log('⏱️ Setting up rate limiting...');
    // Rate limiting
    app.use(
      rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
      }),
    );

    logger.log('✅ Setting up validation...');
    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    logger.log('📚 Setting up Swagger documentation...');
    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('SQL Injection Detection API')
      .setDescription('Microservice for detecting and preventing SQL injection attacks')
      .setVersion('1.0')
      .addTag('detection', 'SQL injection detection endpoints')
      .addTag('analysis', 'Query analysis endpoints')
      .addTag('security', 'Security scanning endpoints')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    logger.log('🌐 Setting up global prefix...');
    // Global prefix
    app.setGlobalPrefix('api/v1');

    const port = process.env.API_PORT || process.env.PORT || 3001;

    logger.log(`🎯 Starting server on port ${port}...`);
    await app.listen(port);

    logger.log(`✅ SQL Injection Detection API is running on: http://localhost:${port}`);
    logger.log(`📖 API Documentation available at: http://localhost:${port}/api/docs`);
    logger.log(`🔍 Health check: http://localhost:${port}/api/v1/health`);

  } catch (error) {
    logger.error('❌ Failed to start SQL Detection API:', error);
    console.error('Full error details:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
