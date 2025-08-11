import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Logger,
  Body
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { extname } from 'path';
import { FileProcessingService, FileUploadRequest } from './file-processing.service';
import { PostgresVectorStoreService } from './postgres-vector-store.service';
import { EmbeddingService } from './embedding.service';

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'js,ts,sql,py,java,cpp,c,php,rb,go,rs,txt,md').split(',');
  const fileExt = extname(file.originalname).slice(1).toLowerCase();

  if (allowedTypes.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`File type .${fileExt} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

@Controller('files')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(
    private fileProcessingService: FileProcessingService,
    private vectorStoreService: PostgresVectorStoreService,
    private embeddingService: EmbeddingService
  ) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage,
    fileFilter,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // Default 10MB
    }
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const content = file.buffer.toString('utf-8');
      const fileType = extname(file.originalname).slice(1).toLowerCase();

      const fileRequest: FileUploadRequest = {
        fileName: file.originalname,
        fileType,
        filePath: `${process.env.UPLOAD_PATH || './uploads'}/${file.originalname}`,
        content,
        metadata: {
          originalSize: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date().toISOString()
        }
      };

      const result = await this.fileProcessingService.processFile(fileRequest);

      this.logger.log(`File uploaded and processed: ${file.originalname}`);

      return {
        success: true,
        message: 'File uploaded and processed successfully',
        data: result
      };

    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`);
      throw new BadRequestException(`Failed to process file: ${error.message}`);
    }
  }

  @Post('upload-text')
  async uploadTextContent(@Body() body: {
    fileName: string;
    content: string;
    fileType?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const fileType = body.fileType || extname(body.fileName).slice(1).toLowerCase() || 'txt';

      const fileRequest: FileUploadRequest = {
        fileName: body.fileName,
        fileType,
        filePath: `manual/${body.fileName}`,
        content: body.content,
        metadata: {
          source: 'manual_upload',
          uploadedAt: new Date().toISOString(),
          ...body.metadata
        }
      };

      const result = await this.fileProcessingService.processFile(fileRequest);

      return {
        success: true,
        message: 'Content uploaded and processed successfully',
        data: result
      };

    } catch (error) {
      this.logger.error(`Error uploading text content: ${error.message}`);
      throw new BadRequestException(`Failed to process content: ${error.message}`);
    }
  }

  @Get('search')
  async searchFiles(
    @Query('q') query: string,
    @Query('type') fileType?: string,
    @Query('limit') limit?: string
  ) {
    try {
      const searchLimit = limit ? parseInt(limit) : 10;
      const files = await this.fileProcessingService.searchFiles(query, fileType, searchLimit);

      return {
        success: true,
        data: files,
        count: files.length
      };
    } catch (error) {
      this.logger.error(`Error searching files: ${error.message}`);
      throw new BadRequestException(`Search failed: ${error.message}`);
    }
  }

  @Get('semantic-search')
  async semanticSearch(
    @Query('q') query: string,
    @Query('k') k?: string,
    @Query('threshold') threshold?: string,
    @Query('type') fileType?: string,
    @Query('hybrid') hybrid?: string
  ) {
    try {
      if (!query) {
        throw new BadRequestException('Query parameter is required');
      }

      const searchK = k ? parseInt(k) : 5;
      const scoreThreshold = threshold ? parseFloat(threshold) : 0.1;
      const useHybrid = hybrid === 'true';

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.createEmbedding(query);

      let results;
      if (useHybrid) {
        results = await this.vectorStoreService.hybridSearch(
          queryEmbedding,
          query,
          {
            k: searchK,
            scoreThreshold,
            fileType,
            textWeight: 0.3
          }
        );
      } else {
        results = await this.vectorStoreService.similaritySearch(
          queryEmbedding,
          {
            k: searchK,
            scoreThreshold,
            fileType
          }
        );
      }

      return {
        success: true,
        data: results.map(result => ({
          content: result.document.pageContent.substring(0, 500) + '...',
          score: result.score,
          fileName: result.fileName,
          fileType: result.fileType,
          metadata: result.document.metadata
        })),
        query,
        count: results.length,
        searchType: useHybrid ? 'hybrid' : 'semantic'
      };

    } catch (error) {
      this.logger.error(`Error in semantic search: ${error.message}`);
      throw new BadRequestException(`Semantic search failed: ${error.message}`);
    }
  }

  @Get('stats')
  async getFileStats() {
    try {
      const stats = await this.fileProcessingService.getFileStats();
      const vectorStats = await this.vectorStoreService.getFileStatistics();

      return {
        success: true,
        data: {
          ...stats,
          ...vectorStats
        }
      };
    } catch (error) {
      this.logger.error(`Error getting file stats: ${error.message}`);
      throw new BadRequestException(`Failed to get stats: ${error.message}`);
    }
  }

  @Get(':id')
  async getFile(@Param('id') id: string) {
    try {
      const file = await this.fileProcessingService.getFileById(id);

      if (!file) {
        throw new BadRequestException('File not found');
      }

      return {
        success: true,
        data: file
      };
    } catch (error) {
      this.logger.error(`Error getting file: ${error.message}`);
      throw new BadRequestException(`Failed to get file: ${error.message}`);
    }
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    try {
      await this.fileProcessingService.deleteFile(id);

      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`);
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  @Get('type/:fileType')
  async getFilesByType(
    @Param('fileType') fileType: string,
    @Query('limit') limit?: string
  ) {
    try {
      const searchLimit = limit ? parseInt(limit) : 50;
      const documents = await this.vectorStoreService.getDocumentsByFileType(fileType, searchLimit);

      return {
        success: true,
        data: documents.map(doc => ({
          content: doc.pageContent.substring(0, 200) + '...',
          metadata: doc.metadata
        })),
        count: documents.length
      };
    } catch (error) {
      this.logger.error(`Error getting files by type: ${error.message}`);
      throw new BadRequestException(`Failed to get files by type: ${error.message}`);
    }
  }
}
