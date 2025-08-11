import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../shared/database.service';
import { EmbeddingService } from './embedding.service';
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { createHash } from 'crypto';

export interface FileUploadRequest {
  fileName: string;
  fileType: string;
  filePath: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface ProcessedFile {
  id: string;
  fileName: string;
  chunks: number;
  embeddings: number;
  size: number;
}

@Injectable()
export class FileProcessingService {
  private readonly logger = new Logger(FileProcessingService.name);
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor(
    private database: DatabaseService,
    private embeddingService: EmbeddingService
  ) {
    // Configure text splitter for code files
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: [
        '\n\n',    // Double newlines (paragraphs)
        '\n',      // Single newlines
        '\r\n',    // Windows line endings
        '.',       // Sentences
        ';',       // Statement endings
        ',',       // Clause separators
        ' ',       // Spaces
        ''         // Characters
      ],
    });
  }

  async processFile(fileRequest: FileUploadRequest): Promise<ProcessedFile> {
    this.logger.log(`Processing file: ${fileRequest.fileName}`);

    try {
      // Generate file checksum for deduplication
      const checksum = this.generateChecksum(fileRequest.content);

      // Check if file already exists
      const existingFile = await this.database.file.findUnique({
        where: { checksum },
        include: { chunks: true, embeddings: true }
      });

      if (existingFile) {
        this.logger.log(`File already exists: ${existingFile.fileName}`);
        return {
          id: existingFile.id,
          fileName: existingFile.fileName,
          chunks: existingFile.chunks.length,
          embeddings: existingFile.embeddings.length,
          size: existingFile.size
        };
      }

      // Create file record
      const file = await this.database.file.create({
        data: {
          fileName: fileRequest.fileName,
          fileType: fileRequest.fileType,
          filePath: fileRequest.filePath,
          content: fileRequest.content,
          size: Buffer.byteLength(fileRequest.content, 'utf8'),
          checksum,
          metadata: fileRequest.metadata || {}
        }
      });

      // Split content into chunks
      const documents = await this.createDocumentChunks(
        fileRequest.content,
        fileRequest.fileName,
        fileRequest.fileType
      );

      // Process chunks
      const chunks = await this.processChunks(file.id, documents);
      
      // Generate embeddings
      const embeddings = await this.generateEmbeddings(file.id, chunks);

      this.logger.log(
        `File processed successfully: ${file.fileName} (${chunks.length} chunks, ${embeddings.length} embeddings)`
      );

      return {
        id: file.id,
        fileName: file.fileName,
        chunks: chunks.length,
        embeddings: embeddings.length,
        size: file.size
      };

    } catch (error) {
      this.logger.error(`Error processing file ${fileRequest.fileName}: ${error.message}`);
      throw error;
    }
  }

  private async createDocumentChunks(
    content: string,
    fileName: string,
    fileType: string
  ): Promise<Document[]> {
    // Create a document with metadata
    const document = new Document({
      pageContent: content,
      metadata: {
        fileName,
        fileType,
        source: fileName
      }
    });

    // Split into chunks
    const chunks = await this.textSplitter.splitDocuments([document]);
    
    // Add chunk-specific metadata
    return chunks.map((chunk, index) => {
      chunk.metadata = {
        ...chunk.metadata,
        chunkIndex: index,
        chunkCount: chunks.length
      };
      return chunk;
    });
  }

  private async processChunks(fileId: string, documents: Document[]) {
    const chunks = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      
      // Estimate line numbers (approximate)
      const lines = doc.pageContent.split('\n');
      const startLine = i * 20 + 1; // Rough estimation
      const endLine = startLine + lines.length - 1;

      const chunk = await this.database.fileChunk.create({
        data: {
          fileId,
          content: doc.pageContent,
          chunkIndex: i,
          startLine,
          endLine,
          metadata: doc.metadata
        }
      });

      chunks.push(chunk);
    }

    return chunks;
  }

  private async generateEmbeddings(fileId: string, chunks: any[]) {
    const embeddings = [];

    for (const chunk of chunks) {
      try {
        // Generate embedding for chunk content
        const embeddingVector = await this.embeddingService.createEmbedding(chunk.content);
        
        const embedding = await this.database.fileEmbedding.create({
          data: {
            fileId,
            chunkId: chunk.id,
            embedding: embeddingVector,
            model: 'text-embedding-3-large',
            dimensions: embeddingVector.length
          }
        });

        embeddings.push(embedding);
      } catch (error) {
        this.logger.error(`Failed to generate embedding for chunk ${chunk.id}: ${error.message}`);
      }
    }

    return embeddings;
  }

  private generateChecksum(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  async getFileById(fileId: string) {
    return this.database.file.findUnique({
      where: { id: fileId },
      include: {
        chunks: {
          include: {
            embeddings: true
          }
        },
        embeddings: true
      }
    });
  }

  async searchFiles(query: string, fileType?: string, limit: number = 10) {
    const where: any = {
      OR: [
        { fileName: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (fileType) {
      where.fileType = fileType;
    }

    return this.database.file.findMany({
      where,
      take: limit,
      include: {
        chunks: {
          take: 3 // Include first 3 chunks for preview
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteFile(fileId: string) {
    return this.database.file.delete({
      where: { id: fileId }
    });
  }

  async getFileStats() {
    const stats = await this.database.getStats();
    
    const fileTypes = await this.database.file.groupBy({
      by: ['fileType'],
      _count: {
        id: true
      }
    });

    return {
      ...stats,
      fileTypes: fileTypes.reduce((acc, item) => {
        acc[item.fileType] = item._count.id;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}
