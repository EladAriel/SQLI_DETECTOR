import {
  Controller,
  Post,
  Body,
  Get,
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
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { DetectionService } from './detection.service';
import {
  AnalyzeQueryDto,
  SecurityScanDto,
  BatchAnalyzeDto,
  GenerateSecureQueryDto
} from './dto/detection.dto';

/**
 * SQL Injection Detection Controller
 * 
 * REST API controller that provides endpoints for SQL injection detection and
 * security analysis. This controller serves as the main entry point for the
 * detection API, offering comprehensive security scanning capabilities.
 * 
 * Key Features:
 * - Single query vulnerability analysis
 * - Comprehensive security scanning (SQL injection, XSS, input validation)
 * - Batch processing for multiple queries
 * - Secure query generation from vulnerable code
 * - Detection service statistics and monitoring
 * 
 * All endpoints include comprehensive error handling, logging, and input validation.
 * Swagger documentation is provided for API consumers and testing.
 * 
 * @controller DetectionController
 * @route /detection
 */
@ApiTags('detection')
@Controller('detection')
export class DetectionController {
  // Logger instance for request tracking and error monitoring
  private readonly logger = new Logger(DetectionController.name);

  /**
   * Detection Controller Constructor
   * 
   * Initializes the controller with the detection service dependency.
   * The service handles all business logic for security analysis.
   * 
   * @constructor
   * @param {DetectionService} detectionService - Service for performing security analysis
   */
  constructor(private readonly detectionService: DetectionService) { }

  /**
   * SQL Query Vulnerability Analyzer
   * 
   * Analyzes a single SQL query for potential injection vulnerabilities.
   * This endpoint performs comprehensive pattern matching against known
   * attack vectors and provides detailed security assessment with remediation guidance.
   * 
   * Features:
   * - Multi-pattern SQL injection detection
   * - Risk scoring (0-100 scale)
   * - Detailed vulnerability reporting
   * - Secure code alternatives
   * - Database-specific analysis
   * 
   * @async
   * @function analyzeQuery
   * @param {AnalyzeQueryDto} analyzeQueryDto - Query analysis request data
   * @returns {Promise<Object>} Comprehensive vulnerability analysis results
   * @throws {HttpException} When analysis fails or input is invalid
   */
  @Post('analyze-query')
  @ApiOperation({
    summary: 'Analyze SQL query for injection vulnerabilities',
    description: 'Performs comprehensive analysis of a SQL query to detect potential injection vulnerabilities'
  })
  @ApiBody({ type: AnalyzeQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Query analysis completed successfully',
    schema: {
      example: {
        isVulnerable: true,
        score: 85,
        detectedPatterns: ["'\\s*(OR|AND)\\s*'\\s*=\\s*'"],
        riskFactors: [
          {
            type: "high",
            description: "Boolean-based SQL injection pattern detected",
            pattern: "' OR '1'='1'"
          }
        ],
        recommendations: [
          "Use parameterized queries or prepared statements",
          "Implement input validation and sanitization"
        ],
        secureAlternative: "-- Secure parameterized version:\nSELECT * FROM users WHERE id = ?\n-- Use prepared statements with bound parameters"
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async analyzeQuery(@Body() analyzeQueryDto: AnalyzeQueryDto) {
    try {
      // Log incoming analysis request for monitoring
      this.logger.log(`Received query analysis request for query starting with: ${analyzeQueryDto.query.substring(0, 30)}...`);

      // Perform vulnerability analysis using detection service
      const result = await this.detectionService.analyzeQuery(analyzeQueryDto);

      // Log security events for monitoring and alerting
      if (result.isVulnerable) {
        this.logger.warn(`Vulnerable query detected with score ${result.score}: ${result.detectedPatterns.join(', ')}`);
      }

      // Return standardized response format
      return {
        status: 'success',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Log error details for debugging and monitoring
      this.logger.error(`Error analyzing query: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to analyze query',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Comprehensive Security Scanner
   * 
   * Performs multi-vector security scanning on input payloads to detect
   * various types of security vulnerabilities beyond just SQL injection.
   * This endpoint provides comprehensive threat assessment capabilities.
   * 
   * Scan Types:
   * - sql_injection: SQL injection specific scanning
   * - xss: Cross-site scripting detection
   * - input_validation: Input validation vulnerabilities
   * - comprehensive: All vulnerability types
   * 
   * @async
   * @function performSecurityScan
   * @param {SecurityScanDto} securityScanDto - Security scan request parameters
   * @returns {Promise<Object>} Comprehensive security scan results with vulnerabilities
   * @throws {HttpException} When scan fails or input is invalid
   */
  @Post('security-scan')
  @ApiOperation({
    summary: 'Perform comprehensive security scan',
    description: 'Scans input payload for various security vulnerabilities including SQL injection, XSS, and input validation issues'
  })
  @ApiBody({ type: SecurityScanDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Security scan completed successfully',
    schema: {
      example: {
        scan_type: "comprehensive",
        vulnerabilities: [
          {
            type: "SQL Injection",
            severity: "high",
            description: "Potential SQL injection pattern detected: '; DROP TABLE",
            payload: "'; DROP TABLE users; --"
          }
        ],
        risk_score: 75,
        recommendations: [
          "Implement parameterized queries",
          "Use input validation and sanitization"
        ],
        timestamp: "2024-01-01T00:00:00.000Z"
      }
    }
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async performSecurityScan(@Body() securityScanDto: SecurityScanDto) {
    try {
      // Log scan request with type information
      this.logger.log(`Received security scan request for ${securityScanDto.scan_type || 'comprehensive'} scan`);

      // Execute comprehensive security scanning
      const result = await this.detectionService.performSecurityScan(securityScanDto);

      // Log high-risk findings for immediate attention
      if (result.risk_score > 50) {
        this.logger.warn(`High-risk security scan result: ${result.risk_score} risk score, ${result.vulnerabilities.length} vulnerabilities found`);
      }

      // Return standardized response with scan results
      return {
        status: 'success',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Log error details for debugging and monitoring
      this.logger.error(`Error performing security scan: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to perform security scan',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Batch Query Analyzer
   * 
   * Efficiently analyzes multiple SQL queries in a single request to reduce
   * API overhead and improve performance for bulk operations. This endpoint
   * is optimized for processing multiple queries while maintaining individual
   * analysis quality and detailed reporting.
   * 
   * Features:
   * - Bulk processing up to 50 queries per request
   * - Individual analysis results for each query
   * - Aggregate statistics and summary reporting
   * - Efficient parallel processing
   * 
   * @async
   * @function batchAnalyze
   * @param {BatchAnalyzeDto} batchAnalyzeDto - Batch analysis request with multiple queries
   * @returns {Promise<Object>} Batch analysis results with individual and summary data
   * @throws {HttpException} When batch size exceeds limits or processing fails
   */
  @Post('batch-analyze')
  @ApiOperation({
    summary: 'Batch analyze multiple SQL queries',
    description: 'Analyzes multiple SQL queries in a single request for efficiency'
  })
  @ApiBody({ type: BatchAnalyzeDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch analysis completed successfully'
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async batchAnalyze(@Body() batchAnalyzeDto: BatchAnalyzeDto) {
    try {
      // Log batch analysis request with query count
      this.logger.log(`Received batch analysis request for ${batchAnalyzeDto.queries.length} queries`);

      // Enforce batch size limits to prevent resource exhaustion
      if (batchAnalyzeDto.queries.length > 50) {
        throw new HttpException(
          {
            status: 'error',
            message: 'Maximum 50 queries allowed per batch'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      // Process all queries in the batch
      const results = await this.detectionService.batchAnalyze(batchAnalyzeDto.queries);

      // Calculate summary statistics for reporting
      const vulnerableCount = results.filter(r => r.isVulnerable).length;
      this.logger.log(`Batch analysis complete: ${vulnerableCount}/${results.length} queries vulnerable`);

      // Return comprehensive batch results with summary
      return {
        status: 'success',
        data: {
          results,
          summary: {
            total_queries: results.length,
            vulnerable_queries: vulnerableCount,
            average_score: results.reduce((sum, r) => sum + r.score, 0) / results.length
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Log batch processing errors for debugging
      this.logger.error(`Error in batch analysis: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to perform batch analysis',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Secure Query Generator
   * 
   * Transforms vulnerable SQL queries into secure, parameterized versions to
   * prevent SQL injection attacks. This endpoint analyzes input queries,
   * identifies security weaknesses, and provides secure alternatives.
   * 
   * Features:
   * - Vulnerable query analysis and transformation
   * - Parameter extraction and validation
   * - Secure query template generation
   * - Security improvement recommendations
   * 
   * @async
   * @function generateSecureQuery
   * @param {GenerateSecureQueryDto} generateSecureQueryDto - Vulnerable query transformation request
   * @returns {Promise<Object>} Secure query with parameters and improvements
   * @throws {HttpException} When query generation fails or input is invalid
   */
  @Post('generate-secure-query')
  @ApiOperation({
    summary: 'Generate secure version of vulnerable query',
    description: 'Takes a potentially vulnerable SQL query and generates a secure parameterized version'
  })
  @ApiBody({ type: GenerateSecureQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Secure query generated successfully'
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateSecureQuery(@Body() generateSecureQueryDto: GenerateSecureQueryDto) {
    try {
      // Log secure query generation request
      this.logger.log(`Received secure query generation request`);

      // Generate secure version with proper parameterization
      const result = await this.detectionService.generateSecureQuery(
        generateSecureQueryDto.vulnerable_query,
        generateSecureQueryDto.parameters
      );

      // Log successful secure query generation
      this.logger.log(`Secure query generated successfully`);

      return {
        status: 'success',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Log generation errors for security monitoring
      this.logger.error(`Error generating secure query: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to generate secure query',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Service Statistics Endpoint
   * 
   * Provides comprehensive statistics about the SQL injection detection
   * service usage, performance metrics, and security scan history.
   * This endpoint is essential for monitoring service health and effectiveness.
   * 
   * Statistics Include:
   * - Total scans performed
   * - Vulnerable queries detected
   * - Average risk scores
   * - Recent activity timestamps
   * - Performance metrics
   * 
   * @async
   * @function getStats
   * @returns {Promise<Object>} Comprehensive detection service statistics
   * @throws {HttpException} When statistics retrieval fails
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get detection service statistics',
    description: 'Returns statistics about the detection service usage and performance'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        total_scans: 1250,
        vulnerable_queries: 187,
        avg_risk_score: 23.5,
        last_scan_time: "2024-01-01T00:00:00.000Z"
      }
    }
  })
  async getStats() {
    try {
      // Retrieve comprehensive service statistics
      const stats = await this.detectionService.getDetectionStats();

      // Log statistics access for monitoring
      this.logger.log(`Statistics retrieved successfully`);

      return {
        status: 'success',
        data: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Log error for statistics endpoint monitoring
      this.logger.error(`Error retrieving stats: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve statistics',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
