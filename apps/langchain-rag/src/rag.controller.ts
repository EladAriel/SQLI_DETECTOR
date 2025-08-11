import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  Logger,
  HttpException
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiProperty,
  ApiPropertyOptional
} from '@nestjs/swagger';
import { RagService, QueryAnalysisRequest } from './rag.service';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query Analysis Data Transfer Object
 * 
 * Defines the structure and validation rules for SQL query analysis requests.
 * This DTO ensures proper input validation and API documentation for the
 * RAG-based security analysis endpoints.
 */
class QueryAnalysisDto {
  @ApiProperty({
    description: 'SQL query or security question to analyze',
    example: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
    maxLength: 5000
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Maximum number of sources to include',
    example: 5,
    minimum: 1,
    maximum: 20
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  max_sources?: number;

  @ApiPropertyOptional({
    description: 'Include similarity scores in response',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_scores?: boolean;

  @ApiPropertyOptional({
    description: 'Type of context to search for',
    enum: ['patterns', 'knowledge', 'examples', 'rules', 'all'],
    example: 'all'
  })
  @IsOptional()
  @IsEnum(['patterns', 'knowledge', 'examples', 'rules', 'all'])
  context_type?: 'patterns' | 'knowledge' | 'examples' | 'rules' | 'all';
}

/**
 * Semantic Search Data Transfer Object
 * 
 * Defines the structure for semantic search requests against the security
 * knowledge base. Provides validation and documentation for vector-based
 * similarity search operations.
 */
class SemanticSearchDto {
  @ApiProperty({
    description: 'Search query for semantic similarity',
    example: 'SQL injection prevention',
    maxLength: 1000
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    example: 5,
    minimum: 1,
    maximum: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  max_results?: number;

  @ApiPropertyOptional({
    description: 'Include similarity scores',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_scores?: boolean;
}

/**
 * Retrieval-Augmented Generation (RAG) Controller
 * 
 * REST API controller that provides intelligent SQL security analysis using
 * RAG methodology. This controller combines vector database retrieval with
 * large language model generation to provide context-aware security analysis.
 * 
 * Key Features:
 * - SQL query vulnerability analysis with contextual knowledge
 * - Security advice generation based on knowledge base
 * - Vulnerability explanations with relevant examples
 * - Semantic search across security patterns and rules
 * - Service health monitoring and status reporting
 * 
 * Architecture:
 * - Uses LangChain for AI orchestration
 * - Integrates with vector database for context retrieval
 * - Provides comprehensive error handling and logging
 * - Supports multiple analysis types and context filtering
 * 
 * @class RagController
 * @controller rag
 */
@ApiTags('rag')
@Controller('rag')
export class RagController {
  /** Logger instance for request/response monitoring */
  private readonly logger = new Logger(RagController.name);

  /**
   * Controller Constructor
   * 
   * Initializes the RAG controller with the RAG service dependency.
   * The service handles all AI processing and vector database operations.
   * 
   * @param {RagService} ragService - RAG service for AI-powered analysis
   */
  constructor(private readonly ragService: RagService) { }

  /**
   * SQL Query Analysis Endpoint
   * 
   * Analyzes SQL queries for security vulnerabilities using RAG methodology.
   * Retrieves relevant security patterns and knowledge to provide comprehensive
   * vulnerability analysis with contextual recommendations.
   * 
   * @async
   * @method analyzeSQLQuery
   * @param {QueryAnalysisDto} queryAnalysisDto - Analysis request with query and parameters
   * @returns {Promise<Object>} Comprehensive analysis with AI-generated insights and sources
   * @throws {HttpException} When analysis fails or request validation fails
   */
  @Post('analyze-sql')
  @ApiOperation({
    summary: 'Analyze SQL query with RAG',
    description: 'Uses RAG to analyze SQL queries for vulnerabilities with context from security knowledge base'
  })
  @ApiBody({ type: QueryAnalysisDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SQL analysis completed successfully',
    schema: {
      example: {
        answer: "This SQL query contains a classic SQL injection vulnerability...",
        sources: [
          {
            content: "SQL Injection Pattern: Boolean-based injection...",
            metadata: { type: "pattern", severity: "high" }
          }
        ],
        query: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
        timestamp: "2024-01-01T00:00:00.000Z"
      }
    }
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async analyzeSQLQuery(@Body() queryAnalysisDto: QueryAnalysisDto) {
    try {
      // Log analysis request with truncated query for security
      this.logger.log(`Received SQL analysis request: ${queryAnalysisDto.query.substring(0, 30)}...`);

      // Execute RAG-based SQL analysis
      const result = await this.ragService.analyzeSQLQuery(queryAnalysisDto);

      // Log successful analysis completion
      this.logger.log(`SQL analysis completed successfully`);

      return {
        status: 'success',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Log analysis errors for monitoring and debugging
      this.logger.error(`Error in SQL analysis: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to analyze SQL query',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Security Advice Generation Endpoint
   * 
   * Provides comprehensive security advice and best practices using RAG
   * methodology. Retrieves relevant security knowledge and generates
   * personalized recommendations based on user queries.
   * 
   * @async
   * @method getSecurityAdvice
   * @param {QueryAnalysisDto} queryAnalysisDto - Advice request with security question
   * @returns {Promise<Object>} Contextual security advice with supporting sources
   * @throws {HttpException} When advice generation fails
   */
  @Post('security-advice')
  @ApiOperation({
    summary: 'Get security advice with RAG',
    description: 'Provides comprehensive security advice using RAG with security knowledge base'
  })
  @ApiBody({ type: QueryAnalysisDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Security advice provided successfully'
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getSecurityAdvice(@Body() queryAnalysisDto: QueryAnalysisDto) {
    try {
      // Log security advice request with truncated query
      this.logger.log(`Received security advice request: ${queryAnalysisDto.query.substring(0, 30)}...`);

      // Generate contextual security advice using RAG
      const result = await this.ragService.getSecurityAdvice(queryAnalysisDto);

      // Log successful advice generation
      this.logger.log(`Security advice generated successfully`);

      return {
        status: 'success',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Log advice generation errors
      this.logger.error(`Error providing security advice: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to provide security advice',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Vulnerability Explanation Endpoint
   * 
   * Provides detailed explanations of security vulnerabilities, attack vectors,
   * and mitigation strategies using RAG methodology. Retrieves educational
   * content and examples to provide comprehensive learning resources.
   * 
   * @async
   * @method explainVulnerability
   * @param {QueryAnalysisDto} queryAnalysisDto - Explanation request with vulnerability topic
   * @returns {Promise<Object>} Detailed vulnerability explanation with examples and sources
   * @throws {HttpException} When explanation generation fails
   */
  @Post('explain-vulnerability')
  @ApiOperation({
    summary: 'Explain vulnerability with RAG',
    description: 'Provides detailed explanation of vulnerabilities using RAG with educational content'
  })
  @ApiBody({ type: QueryAnalysisDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vulnerability explanation provided successfully'
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async explainVulnerability(@Body() queryAnalysisDto: QueryAnalysisDto) {
    try {
      // Log vulnerability explanation request
      this.logger.log(`Received vulnerability explanation request: ${queryAnalysisDto.query.substring(0, 30)}...`);

      // Generate detailed vulnerability explanation using RAG
      const result = await this.ragService.explainVulnerability(queryAnalysisDto);

      // Log successful explanation generation
      this.logger.log(`Vulnerability explanation generated successfully`);

      return {
        status: 'success',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Log explanation generation errors
      this.logger.error(`Error explaining vulnerability: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to explain vulnerability',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Semantic Search Endpoint
   * 
   * Provides direct access to semantic similarity search capabilities
   * across the security knowledge base. This endpoint enables custom
   * search operations and exploration of the vector database contents.
   * 
   * @async
   * @method semanticSearch
   * @param {SemanticSearchDto} searchDto - Search request with query and parameters
   * @returns {Promise<Object>} Search results with documents, metadata, and similarity scores
   * @throws {HttpException} When semantic search fails
   */
  @Post('semantic-search')
  @ApiOperation({
    summary: 'Perform semantic search',
    description: 'Searches the knowledge base using semantic similarity'
  })
  @ApiBody({ type: SemanticSearchDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Semantic search completed successfully'
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async semanticSearch(@Body() searchDto: SemanticSearchDto) {
    try {
      // Log semantic search request
      this.logger.log(`Received semantic search request: ${searchDto.query.substring(0, 30)}...`);

      // Execute vector-based semantic search
      const result = await this.ragService.semanticSearch(
        searchDto.query,
        searchDto.max_results || 5,
        searchDto.include_scores || false
      );

      // Log successful search completion
      this.logger.log(`Semantic search completed with ${result.count} results`);

      return {
        status: 'success',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Log search errors for debugging
      this.logger.error(`Error in semantic search: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to perform semantic search',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Service Status Endpoint
   * 
   * Provides comprehensive status information about the RAG service
   * including vector store health, model configuration, and operational
   * metrics. Essential for monitoring and debugging.
   * 
   * @async
   * @method getServiceStatus
   * @returns {Promise<Object>} Service status with health and configuration information
   * @throws {HttpException} When status retrieval fails
   */
  @Get('status')
  @ApiOperation({
    summary: 'Get RAG service status',
    description: 'Returns the current status of the RAG service and its components'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service status retrieved successfully'
  })
  async getServiceStatus() {
    try {
      // Log status check request
      this.logger.log('Retrieving RAG service status');

      // Get comprehensive service status from RAG service
      const status = await this.ragService.getServiceStatus();

      // Log successful status retrieval
      this.logger.log('Service status retrieved successfully');

      return {
        status: 'success',
        data: status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Log status retrieval errors
      this.logger.error(`Error getting service status: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to get service status',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
