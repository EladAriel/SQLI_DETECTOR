import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../shared/database.service';
import { EmbeddingService } from './embedding.service';
import { Document } from 'langchain/document';
import { SecurityKnowledgeBase } from '../../shared/security-knowledge-base';

export interface VectorSearchOptions {
  k?: number;
  scoreThreshold?: number;
  fileType?: string;
  contextType?: 'patterns' | 'knowledge' | 'examples' | 'rules' | 'files' | 'all';
  includeScores?: boolean;
}

export interface VectorSearchResult {
  document: Document;
  score?: number;
  metadata: {
    source: 'database' | 'knowledge_base';
    type: string;
    [key: string]: any;
  };
}

@Injectable()
export class UnifiedVectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(UnifiedVectorStoreService.name);
  private knowledgeBase: SecurityKnowledgeBase;
  private isInitialized = false;

  constructor(
    private database: DatabaseService,
    private embeddingService: EmbeddingService
  ) {
    this.knowledgeBase = new SecurityKnowledgeBase();
  }

  async onModuleInit() {
    // Initialize knowledge base without database dependency for now
    this.logger.log('RAG Service starting in basic mode (database initialization skipped)');
    this.isInitialized = true;
    // TODO: Re-enable database initialization once DB issues are resolved
    // await this.initializeKnowledgeBase();
  }

  private async initializeKnowledgeBase() {
    try {
      this.logger.log('Initializing unified vector store with knowledge base');

      // Check if security patterns exist in database
      const existingPatterns = await this.database.securityPattern.count();

      if (existingPatterns === 0) {
        this.logger.log('No security patterns found, seeding from knowledge base');
        await this.seedSecurityPatterns();
      }

      this.isInitialized = true;
      this.logger.log('Unified vector store initialized successfully');
    } catch (error) {
      this.logger.error(`Error initializing unified vector store: ${error.message}`);
    }
  }

  private async seedSecurityPatterns() {
    try {
      const patterns = await this.knowledgeBase.getCommonPatterns();

      for (const pattern of patterns) {
        await this.database.securityPattern.create({
          data: {
            name: pattern.name,
            description: pattern.description,
            pattern: pattern.pattern || '',
            severity: pattern.severity,
            category: 'sql_injection',
            examples: pattern.examples || [],
            mitigation: pattern.mitigation || []
          }
        });
      }

      this.logger.log(`Seeded ${patterns.length} security patterns`);
    } catch (error) {
      this.logger.error(`Error seeding security patterns: ${error.message}`);
    }
  }

  async similaritySearch(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const {
      k = 5,
      scoreThreshold = 0.1,
      contextType = 'all',
      includeScores = false
    } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingService.createEmbedding(query);

      // Search based on context type
      if (contextType === 'files' || contextType === 'all') {
        return this.searchDatabaseFiles(queryEmbedding, query, options);
      } else {
        return this.searchKnowledgeBase(query, options);
      }

    } catch (error) {
      this.logger.error(`Error in similarity search: ${error.message}`);
      return [];
    }
  }

  private async searchDatabaseFiles(
    queryEmbedding: number[],
    queryText: string,
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    const { k = 5, scoreThreshold = 0.1, fileType } = options;

    try {
      // Build SQL query for vector similarity search
      let whereClause = '';
      const params: any[] = [queryEmbedding];

      if (fileType) {
        whereClause = 'AND f.file_type = $2';
        params.push(fileType);
      }

      const query = `
        SELECT 
          fc.content,
          fc.chunk_index,
          fc.start_line,
          fc.end_line,
          fc.metadata as chunk_metadata,
          f.file_name,
          f.file_type,
          f.file_path,
          f.metadata as file_metadata,
          -- Cosine similarity calculation
          (
            SELECT (
              SUM(val1 * val2) / (
                SQRT(SUM(val1 * val1)) * SQRT(SUM(val2 * val2))
              )
            )
            FROM unnest(fe.embedding) WITH ORDINALITY AS t1(val1, idx)
            JOIN unnest($1::float[]) WITH ORDINALITY AS t2(val2, idx) 
              ON t1.idx = t2.idx
          ) as similarity_score
        FROM file_embeddings fe
        JOIN file_chunks fc ON fe.chunk_id = fc.id
        JOIN files f ON fe.file_id = f.id
        WHERE fe.embedding IS NOT NULL ${whereClause}
        ORDER BY similarity_score DESC
        LIMIT ${k}
      `;

      const results = await this.database.$queryRawUnsafe(query, ...params) as any[];

      return results
        .filter(row => row.similarity_score >= scoreThreshold)
        .map(row => ({
          document: new Document({
            pageContent: row.content,
            metadata: {
              chunkIndex: row.chunk_index,
              startLine: row.start_line,
              endLine: row.end_line,
              fileName: row.file_name,
              fileType: row.file_type,
              filePath: row.file_path,
              source: 'database',
              type: 'file_chunk'
            }
          }),
          score: parseFloat(row.similarity_score),
          metadata: {
            source: 'database' as const,
            type: 'file_chunk',
            fileName: row.file_name,
            fileType: row.file_type,
            similarity: parseFloat(row.similarity_score)
          }
        }));

    } catch (error) {
      this.logger.error(`Error searching database files: ${error.message}`);
      return [];
    }
  }

  private async searchKnowledgeBase(
    query: string,
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    const { k = 5, contextType } = options;

    try {
      const results: VectorSearchResult[] = [];

      // Search security patterns
      if (contextType === 'patterns' || contextType === 'all') {
        const patterns = await this.database.securityPattern.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          },
          take: Math.ceil(k / 3)
        });

        patterns.forEach(pattern => {
          results.push({
            document: new Document({
              pageContent: `Security Pattern: ${pattern.name}\nDescription: ${pattern.description}\nSeverity: ${pattern.severity}\nMitigation: ${pattern.mitigation.join(', ')}`,
              metadata: {
                id: pattern.id,
                name: pattern.name,
                severity: pattern.severity,
                category: pattern.category,
                source: 'knowledge_base',
                type: 'security_pattern'
              }
            }),
            metadata: {
              source: 'knowledge_base' as const,
              type: 'security_pattern',
              severity: pattern.severity,
              category: pattern.category
            }
          });
        });
      }

      // Search in-memory knowledge base for other types
      if (contextType === 'knowledge' || contextType === 'examples' || contextType === 'all') {
        const knowledgeResults = await this.searchInMemoryKnowledge(query, k - results.length);
        results.push(...knowledgeResults);
      }

      return results.slice(0, k);

    } catch (error) {
      this.logger.error(`Error searching knowledge base: ${error.message}`);
      return [];
    }
  }

  private async searchInMemoryKnowledge(query: string, k: number): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    try {
      // Search security knowledge
      const knowledge = await this.knowledgeBase.getSecurityKnowledge();
      const matchingKnowledge = knowledge.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      ).slice(0, Math.ceil(k / 2));

      matchingKnowledge.forEach(item => {
        results.push({
          document: new Document({
            pageContent: `${item.title}\n${item.description}\nBest Practices: ${item.best_practices.join(', ')}`,
            metadata: {
              id: item.id,
              title: item.title,
              category: item.category,
              source: 'knowledge_base',
              type: 'security_knowledge'
            }
          }),
          metadata: {
            source: 'knowledge_base' as const,
            type: 'security_knowledge',
            category: item.category
          }
        });
      });

      // Search vulnerable examples
      const examples = await this.knowledgeBase.getVulnerableExamples();
      const matchingExamples = examples.filter(example =>
        example.title.toLowerCase().includes(query.toLowerCase()) ||
        example.description.toLowerCase().includes(query.toLowerCase())
      ).slice(0, Math.floor(k / 2));

      matchingExamples.forEach(example => {
        results.push({
          document: new Document({
            pageContent: `${example.title}\n${example.description}\nVulnerability: ${example.vulnerability_type}\nFix: ${example.fix}`,
            metadata: {
              id: example.id,
              title: example.title,
              vulnerability_type: example.vulnerability_type,
              source: 'knowledge_base',
              type: 'vulnerable_example'
            }
          }),
          metadata: {
            source: 'knowledge_base' as const,
            type: 'vulnerable_example',
            vulnerabilityType: example.vulnerability_type
          }
        });
      });

    } catch (error) {
      this.logger.error(`Error searching in-memory knowledge: ${error.message}`);
    }

    return results;
  }

  async similaritySearchWithScore(
    query: string,
    k: number = 5
  ): Promise<[Document, number][]> {
    const results = await this.similaritySearch(query, {
      k,
      includeScores: true,
      contextType: 'all'
    });

    return results.map(result => [
      result.document,
      result.score || 0
    ]);
  }

  async addDocuments(documents: Document[]): Promise<void> {
    // This would be handled by FileProcessingService for uploaded files
    this.logger.warn('Use FileProcessingService for adding new documents');
  }

  async getDocumentCount(): Promise<number> {
    try {
      const [fileChunks, patterns] = await Promise.all([
        this.database.fileChunk.count(),
        this.database.securityPattern.count()
      ]);

      const knowledgeCount = await this.getInMemoryKnowledgeCount();

      return fileChunks + patterns + knowledgeCount;
    } catch (error) {
      this.logger.error(`Error getting document count: ${error.message}`);
      return 0;
    }
  }

  private async getInMemoryKnowledgeCount(): Promise<number> {
    try {
      const [knowledge, examples, rules] = await Promise.all([
        this.knowledgeBase.getSecurityKnowledge(),
        this.knowledgeBase.getVulnerableExamples(),
        this.knowledgeBase.getDetectionRules()
      ]);

      return knowledge.length + examples.length + rules.length;
    } catch (error) {
      return 0;
    }
  }

  async getServiceStatus(): Promise<{
    status: string;
    initialized: boolean;
    database_documents: number;
    knowledge_base_documents: number;
    total_documents: number;
  }> {
    try {
      const [dbStats, knowledgeCount] = await Promise.all([
        this.database.getStats(),
        this.getInMemoryKnowledgeCount()
      ]);

      const databaseDocs = dbStats.chunks + dbStats.patterns;
      const totalDocs = databaseDocs + knowledgeCount;

      return {
        status: this.isInitialized ? 'operational' : 'initializing',
        initialized: this.isInitialized,
        database_documents: databaseDocs,
        knowledge_base_documents: knowledgeCount,
        total_documents: totalDocs
      };
    } catch (error) {
      return {
        status: 'error',
        initialized: false,
        database_documents: 0,
        knowledge_base_documents: 0,
        total_documents: 0
      };
    }
  }
}
