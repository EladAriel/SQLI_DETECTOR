import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { RagModule } from './rag.module';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';

async function bootstrap() {
  const logger = new Logger('LangChainRAG');

  try {
    logger.log('🚀 Starting LangChain RAG Service...');

    const logLevel = process.env.LOG_LEVEL?.split(',') as ('error' | 'warn' | 'log' | 'debug' | 'verbose')[] || ['log', 'error', 'warn'];

    logger.log('📦 Creating NestJS application...');
    const app = await NestFactory.create(RagModule, {
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
      .setTitle('LangChain RAG Service')
      .setDescription('Retrieval-Augmented Generation service for SQL injection knowledge')
      .setVersion('1.0')
      .addTag('rag', 'RAG endpoints')
      .addTag('embeddings', 'Vector embeddings endpoints')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    logger.log('🌐 Setting up global prefix...');
    // Global prefix
    app.setGlobalPrefix('api/v1');

    const port = process.env.RAG_PORT || process.env.PORT || 3002;

    logger.log(`🎯 Starting server on port ${port}...`);
    await app.listen(port);

    logger.log(`✅ LangChain RAG Service is running on: http://localhost:${port}`);
    logger.log(`📖 API Documentation available at: http://localhost:${port}/api/docs`);
    logger.log(`🔍 Available endpoints: http://localhost:${port}/api/v1/`);

  } catch (error) {
    logger.error('❌ Failed to start LangChain RAG Service:', error);
    console.error('Full error details:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
