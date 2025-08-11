import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../shared/database.service';
import { Document } from 'langchain/document';

export interface SimilaritySearchOptions {
  k?: number;
  scoreThreshold?: number;
  fileType?: string;
  includeMetadata?: boolean;
}

export interface SearchResult {
  document: Document;
  score: number;
  fileId: string;
  chunkId: string;
  fileName: string;
  fileType: string;
}

@Injectable()
export class PostgresVectorStoreService {
  private readonly logger = new Logger(PostgresVectorStoreService.name);

  constructor(private database: DatabaseService) {}

  async similaritySearch(
    queryEmbedding: number[],
    options: SimilaritySearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      k = 5,
      scoreThreshold = 0.1,
      fileType,
      includeMetadata = true
    } = options;

    try {
      this.logger.log(`Performing similarity search with k=${k}, threshold=${scoreThreshold}`);

      // Build the SQL query for cosine similarity
      let whereClause = '';
      const params: any[] = [queryEmbedding];

      if (fileType) {
        whereClause = 'AND f.file_type = $2';
        params.push(fileType);
      }

      // Use PostgreSQL's cosine similarity (requires pgvector extension)
      // For now, we'll use a simplified dot product similarity
      const query = `
        SELECT 
          fe.id as embedding_id,
          fe.file_id,
          fe.chunk_id,
          fc.content,
          fc.chunk_index,
          fc.start_line,
          fc.end_line,
          fc.metadata as chunk_metadata,
          f.file_name,
          f.file_type,
          f.file_path,
          f.metadata as file_metadata,
          -- Calculate similarity score (simplified dot product)
          (
            SELECT SUM(val1 * val2) / (
              SQRT(SUM(val1 * val1)) * SQRT(SUM(val2 * val2))
            )
            FROM unnest(fe.embedding) WITH ORDINALITY AS t1(val1, idx)
            JOIN unnest($1::float[]) WITH ORDINALITY AS t2(val2, idx) 
              ON t1.idx = t2.idx
          ) as similarity_score
        FROM file_embeddings fe
        JOIN file_chunks fc ON fe.chunk_id = fc.id
        JOIN files f ON fe.file_id = f.id
        WHERE 1=1 ${whereClause}
        ORDER BY similarity_score DESC
        LIMIT ${k}
      `;

      const results = await this.database.$queryRawUnsafe(query, ...params);

      return (results as any[])
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
              ...(includeMetadata ? {
                chunkMetadata: row.chunk_metadata,
                fileMetadata: row.file_metadata
              } : {})
            }
          }),
          score: parseFloat(row.similarity_score),
          fileId: row.file_id,
          chunkId: row.chunk_id,
          fileName: row.file_name,
          fileType: row.file_type
        }));

    } catch (error) {
      this.logger.error(`Error in similarity search: ${error.message}`);
      return [];
    }
  }

  async hybridSearch(
    queryEmbedding: number[],
    queryText: string,
    options: SimilaritySearchOptions & { textWeight?: number } = {}
  ): Promise<SearchResult[]> {
    const {
      k = 5,
      scoreThreshold = 0.1,
      fileType,
      textWeight = 0.3
    } = options;

    try {
      this.logger.log(`Performing hybrid search with text weight: ${textWeight}`);

      // Combine semantic similarity with text search
      let whereClause = '';
      const params: any[] = [queryEmbedding, queryText];

      if (fileType) {
        whereClause = 'AND f.file_type = $3';
        params.push(fileType);
      }

      const query = `
        SELECT 
          fe.id as embedding_id,
          fe.file_id,
          fe.chunk_id,
          fc.content,
          fc.chunk_index,
          fc.start_line,
          fc.end_line,
          fc.metadata as chunk_metadata,
          f.file_name,
          f.file_type,
          f.file_path,
          f.metadata as file_metadata,
          -- Semantic similarity score
          (
            SELECT SUM(val1 * val2) / (
              SQRT(SUM(val1 * val1)) * SQRT(SUM(val2 * val2))
            )
            FROM unnest(fe.embedding) WITH ORDINALITY AS t1(val1, idx)
            JOIN unnest($1::float[]) WITH ORDINALITY AS t2(val2, idx) 
              ON t1.idx = t2.idx
          ) as semantic_score,
          -- Text similarity score (using PostgreSQL's full-text search)
          GREATEST(
            ts_rank(to_tsvector('english', fc.content), plainto_tsquery('english', $2)),
            similarity(fc.content, $2)
          ) as text_score
        FROM file_embeddings fe
        JOIN file_chunks fc ON fe.chunk_id = fc.id
        JOIN files f ON fe.file_id = f.id
        WHERE 1=1 ${whereClause}
        ORDER BY 
          (semantic_score * ${1 - textWeight} + text_score * ${textWeight}) DESC
        LIMIT ${k}
      `;

      const results = await this.database.$queryRawUnsafe(query, ...params);

      return (results as any[])
        .map(row => {
          const combinedScore = 
            (parseFloat(row.semantic_score) * (1 - textWeight)) + 
            (parseFloat(row.text_score) * textWeight);
          
          return {
            document: new Document({
              pageContent: row.content,
              metadata: {
                chunkIndex: row.chunk_index,
                startLine: row.start_line,
                endLine: row.end_line,
                fileName: row.file_name,
                fileType: row.file_type,
                filePath: row.file_path,
                semanticScore: parseFloat(row.semantic_score),
                textScore: parseFloat(row.text_score),
                chunkMetadata: row.chunk_metadata,
                fileMetadata: row.file_metadata
              }
            }),
            score: combinedScore,
            fileId: row.file_id,
            chunkId: row.chunk_id,
            fileName: row.file_name,
            fileType: row.file_type
          };
        })
        .filter(result => result.score >= scoreThreshold);

    } catch (error) {
      this.logger.error(`Error in hybrid search: ${error.message}`);
      // Fallback to semantic search only
      return this.similaritySearch(queryEmbedding, options);
    }
  }

  async getDocumentsByFileType(fileType: string, limit: number = 50): Promise<Document[]> {
    try {
      const files = await this.database.file.findMany({
        where: { fileType },
        include: {
          chunks: {
            include: {
              embeddings: true
            }
          }
        },
        take: limit
      });

      const documents: Document[] = [];

      for (const file of files) {
        for (const chunk of file.chunks) {
          documents.push(new Document({
            pageContent: chunk.content,
            metadata: {
              fileId: file.id,
              chunkId: chunk.id,
              fileName: file.fileName,
              fileType: file.fileType,
              filePath: file.filePath,
              chunkIndex: chunk.chunkIndex,
              startLine: chunk.startLine,
              endLine: chunk.endLine
            }
          }));
        }
      }

      return documents;
    } catch (error) {
      this.logger.error(`Error getting documents by file type: ${error.message}`);
      return [];
    }
  }

  async getFileStatistics(): Promise<{
    totalFiles: number;
    totalChunks: number;
    totalEmbeddings: number;
    fileTypeBreakdown: Record<string, number>;
    avgChunksPerFile: number;
  }> {
    try {
      const stats = await this.database.getStats();
      
      const fileTypes = await this.database.file.groupBy({
        by: ['fileType'],
        _count: { id: true }
      });

      const fileTypeBreakdown = fileTypes.reduce((acc, item) => {
        acc[item.fileType] = item._count.id;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalFiles: stats.files,
        totalChunks: stats.chunks,
        totalEmbeddings: stats.embeddings,
        fileTypeBreakdown,
        avgChunksPerFile: stats.files > 0 ? stats.chunks / stats.files : 0
      };
    } catch (error) {
      this.logger.error(`Error getting file statistics: ${error.message}`);
      return {
        totalFiles: 0,
        totalChunks: 0,
        totalEmbeddings: 0,
        fileTypeBreakdown: {},
        avgChunksPerFile: 0
      };
    }
  }
}
