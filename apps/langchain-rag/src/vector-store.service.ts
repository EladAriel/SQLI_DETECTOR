import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from 'langchain/document';
import { EmbeddingService } from './embedding.service';
import { SecurityKnowledgeBase } from '../../shared/security-knowledge-base';

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private vectorStore: MemoryVectorStore;
  private knowledgeBase: SecurityKnowledgeBase;

  constructor(private embeddingService: EmbeddingService) {
    this.knowledgeBase = new SecurityKnowledgeBase();
  }

  async onModuleInit() {
    await this.initializeVectorStore();
  }

  private async initializeVectorStore() {
    this.logger.log('Initializing vector store with security knowledge');
    
    try {
      // Prepare documents from knowledge base
      const documents = await this.prepareSecurityDocuments();
      
      // Create vector store
      this.vectorStore = await this.embeddingService.createDocumentEmbeddings(documents);
      
      this.logger.log(`Vector store initialized with ${documents.length} documents`);
    } catch (error) {
      this.logger.error(`Error initializing vector store: ${error.message}`);
      // Initialize empty vector store
      this.vectorStore = new MemoryVectorStore(this.embeddingService.getEmbeddingsModel());
    }
  }

  private async prepareSecurityDocuments(): Promise<Document[]> {
    const documents: Document[] = [];

    // Add patterns as documents
    const patterns = await this.knowledgeBase.getCommonPatterns();
    patterns.forEach(pattern => {
      documents.push(new Document({
        pageContent: `SQL Injection Pattern: ${pattern.name}
Description: ${pattern.description}
Severity: ${pattern.severity}
Examples: ${pattern.examples.join(', ')}
Mitigation: ${pattern.mitigation.join(', ')}`,
        metadata: {
          type: 'pattern',
          id: pattern.id,
          name: pattern.name,
          severity: pattern.severity
        }
      }));
    });

    // Add security knowledge as documents
    const knowledge = await this.knowledgeBase.getSecurityKnowledge();
    knowledge.forEach(item => {
      documents.push(new Document({
        pageContent: `Security Knowledge: ${item.title}
Category: ${item.category}
Description: ${item.description}
Best Practices: ${item.best_practices.join(', ')}
Code Examples: ${item.code_examples.map(ex => `${ex.language}: ${ex.explanation}`).join('; ')}`,
        metadata: {
          type: 'knowledge',
          id: item.id,
          category: item.category,
          title: item.title
        }
      }));
    });

    // Add vulnerable examples as documents
    const examples = await this.knowledgeBase.getVulnerableExamples();
    examples.forEach(example => {
      documents.push(new Document({
        pageContent: `Vulnerable Code Example: ${example.title}
Description: ${example.description}
Vulnerability Type: ${example.vulnerability_type}
Exploitation Scenario: ${example.exploitation_scenario}
Fix: ${example.fix}
Prevention: ${example.prevention_measures.join(', ')}`,
        metadata: {
          type: 'example',
          id: example.id,
          title: example.title,
          vulnerability_type: example.vulnerability_type
        }
      }));
    });

    // Add detection rules as documents
    const rules = await this.knowledgeBase.getDetectionRules();
    rules.forEach(rule => {
      documents.push(new Document({
        pageContent: `Detection Rule: ${rule.name}
Description: ${rule.description}
Rule Type: ${rule.rule_type}
Pattern: ${rule.pattern}
Confidence: ${rule.confidence}
Database Types: ${rule.database_types.join(', ')}`,
        metadata: {
          type: 'rule',
          id: rule.id,
          name: rule.name,
          rule_type: rule.rule_type,
          confidence: rule.confidence
        }
      }));
    });

    return documents;
  }

  async similaritySearch(query: string, k: number = 5): Promise<Document[]> {
    try {
      this.logger.log(`Performing similarity search for: ${query.substring(0, 50)}...`);
      
      if (!this.vectorStore) {
        await this.initializeVectorStore();
      }

      const results = await this.vectorStore.similaritySearch(query, k);
      this.logger.log(`Found ${results.length} similar documents`);
      
      return results;
    } catch (error) {
      this.logger.error(`Error in similarity search: ${error.message}`);
      return [];
    }
  }

  async similaritySearchWithScore(query: string, k: number = 5): Promise<[Document, number][]> {
    try {
      this.logger.log(`Performing similarity search with scores for: ${query.substring(0, 50)}...`);
      
      if (!this.vectorStore) {
        await this.initializeVectorStore();
      }

      const results = await this.vectorStore.similaritySearchWithScore(query, k);
      this.logger.log(`Found ${results.length} similar documents with scores`);
      
      return results;
    } catch (error) {
      this.logger.error(`Error in similarity search with score: ${error.message}`);
      return [];
    }
  }

  async addDocuments(documents: Document[]): Promise<void> {
    try {
      this.logger.log(`Adding ${documents.length} documents to vector store`);
      
      if (!this.vectorStore) {
        await this.initializeVectorStore();
      }

      await this.vectorStore.addDocuments(documents);
      this.logger.log('Documents added successfully');
    } catch (error) {
      this.logger.error(`Error adding documents: ${error.message}`);
    }
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    try {
      this.logger.log(`Deleting ${ids.length} documents from vector store`);
      // Note: MemoryVectorStore doesn't support deletion by ID
      // In a production environment, you'd use a persistent vector store like Pinecone
      this.logger.warn('Document deletion not supported by MemoryVectorStore');
    } catch (error) {
      this.logger.error(`Error deleting documents: ${error.message}`);
    }
  }

  async getDocumentCount(): Promise<number> {
    try {
      if (!this.vectorStore) {
        return 0;
      }
      
      // MemoryVectorStore doesn't have a direct count method
      // We'll estimate based on the knowledge base
      const patterns = await this.knowledgeBase.getCommonPatterns();
      const knowledge = await this.knowledgeBase.getSecurityKnowledge();
      const examples = await this.knowledgeBase.getVulnerableExamples();
      const rules = await this.knowledgeBase.getDetectionRules();
      
      return patterns.length + knowledge.length + examples.length + rules.length;
    } catch (error) {
      this.logger.error(`Error getting document count: ${error.message}`);
      return 0;
    }
  }

  getVectorStore(): MemoryVectorStore {
    return this.vectorStore;
  }
}
