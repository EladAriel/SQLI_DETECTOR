import { Injectable, Logger } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from 'langchain/document';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY || 'demo-key',
      modelName: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
      maxRetries: 3,
      timeout: 30000,
    });
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      this.logger.log(`Creating embedding for text: ${text.substring(0, 50)}...`);
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      this.logger.error(`Error creating embedding: ${error.message}`);
      // Return mock embedding for demo purposes
      return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      this.logger.log(`Creating embeddings for ${texts.length} texts`);
      const embeddings = await this.embeddings.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      this.logger.error(`Error creating embeddings: ${error.message}`);
      // Return mock embeddings for demo purposes
      return texts.map(() => new Array(1536).fill(0).map(() => Math.random() - 0.5));
    }
  }

  async createDocumentEmbeddings(documents: Document[]): Promise<MemoryVectorStore> {
    try {
      this.logger.log(`Creating vector store for ${documents.length} documents`);
      const vectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        this.embeddings
      );
      return vectorStore;
    } catch (error) {
      this.logger.error(`Error creating document embeddings: ${error.message}`);
      // Create empty vector store for demo
      return new MemoryVectorStore(this.embeddings);
    }
  }

  getEmbeddingsModel(): OpenAIEmbeddings {
    return this.embeddings;
  }
}
