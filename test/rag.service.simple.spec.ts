import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from '../apps/langchain-rag/src/rag.service';
import { VectorStoreService } from '../apps/langchain-rag/src/vector-store.service';
import { UnifiedVectorStoreService } from '../apps/langchain-rag/src/unified-vector-store.service';
import { EmbeddingService } from '../apps/langchain-rag/src/embedding.service';
import { DatabaseService } from '../apps/shared/database.service';
import { SecurityKnowledgeBase } from '../apps/shared/security-knowledge-base';

describe('RagService', () => {
  let service: RagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        {
          provide: UnifiedVectorStoreService,
          useValue: {
            similaritySearch: jest.fn().mockResolvedValue([]),
            initializeKnowledgeBase: jest.fn(),
            onModuleInit: jest.fn(),
          },
        },
        {
          provide: VectorStoreService,
          useValue: {
            similaritySearch: jest.fn().mockResolvedValue([]),
            initializeVectorStore: jest.fn(),
          },
        },
        {
          provide: EmbeddingService,
          useValue: {
            generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            securityPattern: {
              count: jest.fn().mockResolvedValue(0),
              createMany: jest.fn(),
            },
          },
        },
        {
          provide: SecurityKnowledgeBase,
          useValue: {
            getSecurityKnowledge: jest.fn().mockResolvedValue([]),
            getCommonPatterns: jest.fn().mockResolvedValue([]),
            getDetectionRules: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: 'OPENAI_API_KEY',
          useValue: 'test-key',
        },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeSQLQuery', () => {
    it('should return a response with query analysis', async () => {
      const request = { query: 'SELECT * FROM users WHERE id = 1' };

      const result = await service.analyzeSQLQuery(request);

      expect(result).toBeDefined();
      expect(result.query).toBe(request.query);
      expect(result.answer).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getSecurityAdvice', () => {
    it('should provide security advice', async () => {
      const request = { query: 'How to prevent SQL injection?' };

      const result = await service.getSecurityAdvice(request);

      expect(result).toBeDefined();
      expect(result.query).toBe(request.query);
      expect(result.answer).toBeDefined();
      expect(result.sources).toBeDefined();
    });
  });

  describe('explainVulnerability', () => {
    it('should explain vulnerabilities', async () => {
      const request = { query: 'Explain SQL injection vulnerability' };

      const result = await service.explainVulnerability(request);

      expect(result).toBeDefined();
      expect(result.query).toBe(request.query);
      expect(result.answer).toBeDefined();
      expect(result.sources).toBeDefined();
    });
  });
});
