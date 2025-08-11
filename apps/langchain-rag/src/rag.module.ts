import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService } from './vector-store.service';
import { UnifiedVectorStoreService } from './unified-vector-store.service';
import { PostgresVectorStoreService } from './postgres-vector-store.service';
import { DatabaseService } from '../../shared/database.service';
import { FileController } from './file.controller';
import { FileProcessingService } from './file-processing.service';
import { RagHealthController } from './rag-health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [RagController, FileController, RagHealthController],
  providers: [
    RagService,
    EmbeddingService,
    VectorStoreService,
    UnifiedVectorStoreService,
    PostgresVectorStoreService,
    DatabaseService,
    FileProcessingService
  ],
  exports: [RagService, UnifiedVectorStoreService, EmbeddingService],
})
export class RagModule { }
