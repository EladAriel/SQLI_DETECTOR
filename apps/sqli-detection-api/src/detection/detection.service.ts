import { Injectable, Logger } from '@nestjs/common';
import { SQLInjectionDetector, SQLAnalysisResult, SecurityScanResult } from '../../../shared/sql-injection-detector';
import { AnalyzeQueryDto, SecurityScanDto } from './dto/detection.dto';

/**
 * SQL Injection Detection Service
 * 
 * Core business logic service that handles SQL injection detection and security
 * analysis operations. This service acts as an intermediary between the REST API
 * controllers and the shared SQL injection detection engine.
 * 
 * Key Responsibilities:
 * - SQL query vulnerability analysis
 * - Comprehensive security scanning
 * - Secure query generation and transformation
 * - Batch processing operations
 * - Service statistics and monitoring
 * 
 * Features:
 * - Real-time query analysis with risk scoring
 * - Multi-vector security scanning capabilities
 * - Secure parameterized query generation
 * - Efficient batch processing for multiple queries
 * - Performance monitoring and statistics collection
 * 
 * @class DetectionService
 * @injectable
 */
@Injectable()
export class DetectionService {
  /** Logger instance for service-level monitoring and debugging */
  private readonly logger = new Logger(DetectionService.name);

  /** Core SQL injection detection engine instance */
  private readonly detector: SQLInjectionDetector;

  /**
   * Service Constructor
   * 
   * Initializes the detection service with a new SQL injection detector instance.
   * The detector is configured with default security patterns and rules.
   */
  constructor() {
    // Initialize the core detection engine
    this.detector = new SQLInjectionDetector();
  }

  /**
   * SQL Query Vulnerability Analyzer
   * 
   * Analyzes a single SQL query for potential injection vulnerabilities using
   * pattern matching, risk scoring, and database-specific rules. Provides
   * detailed analysis results including vulnerability details and recommendations.
   * 
   * @async
   * @method analyzeQuery
   * @param {AnalyzeQueryDto} analyzeQueryDto - Query analysis request parameters
   * @returns {Promise<SQLAnalysisResult>} Detailed vulnerability analysis results
   * @throws {Error} When analysis fails or detector encounters critical errors
   */
  async analyzeQuery(analyzeQueryDto: AnalyzeQueryDto): Promise<SQLAnalysisResult> {
    // Log query analysis request with truncated query for security
    this.logger.log(`Analyzing query: ${analyzeQueryDto.query.substring(0, 50)}...`);

    try {
      // Perform vulnerability analysis using the detection engine
      const result = await this.detector.analyzeQuery(
        analyzeQueryDto.query,
        analyzeQueryDto.database_type
      );

      // Log analysis completion with key results
      this.logger.log(`Analysis complete. Vulnerable: ${result.isVulnerable}, Score: ${result.score}`);
      return result;
    } catch (error) {
      // Log and re-throw analysis errors for upstream handling
      this.logger.error(`Error analyzing query: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Multi-Vector Security Scanner
   * 
   * Performs comprehensive security scanning beyond SQL injection detection.
   * This method can detect multiple types of vulnerabilities including XSS,
   * input validation issues, and other security threats based on scan type.
   * 
   * Supported Scan Types:
   * - sql_injection: SQL injection specific analysis
   * - xss: Cross-site scripting detection
   * - input_validation: Input validation vulnerabilities
   * - comprehensive: All vulnerability types combined
   * 
   * @async
   * @method performSecurityScan
   * @param {SecurityScanDto} securityScanDto - Security scan request parameters
   * @returns {Promise<SecurityScanResult>} Comprehensive security scan results
   * @throws {Error} When security scan fails or encounters critical errors
   */
  async performSecurityScan(securityScanDto: SecurityScanDto): Promise<SecurityScanResult> {
    // Log security scan initiation with scan type
    this.logger.log(`Performing ${securityScanDto.scan_type} security scan`);

    try {
      // Execute comprehensive security scan using detection engine
      const result = await this.detector.performSecurityScan(
        securityScanDto.payload,
        securityScanDto.scan_type || 'comprehensive'
      );

      // Log scan completion with risk assessment
      this.logger.log(`Security scan complete. Risk score: ${result.risk_score}`);
      return result;
    } catch (error) {
      // Log and re-throw security scan errors
      this.logger.error(`Error performing security scan: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Secure Query Generator
   * 
   * Transforms potentially vulnerable SQL queries into secure, parameterized
   * versions that prevent SQL injection attacks. This method analyzes input
   * queries and generates safe alternatives with proper parameter binding.
   * 
   * @async
   * @method generateSecureQuery
   * @param {string} vulnerableQuery - The potentially vulnerable SQL query to secure
   * @param {Record<string, any>} [parameters] - Optional parameters for query generation
   * @returns {Promise<Object>} Secure query with parameterization and recommendations
   * @throws {Error} When secure query generation fails
   */
  async generateSecureQuery(vulnerableQuery: string, parameters?: Record<string, any>) {
    // Log secure query generation request with truncated query
    this.logger.log(`Generating secure query for: ${vulnerableQuery.substring(0, 50)}...`);

    try {
      // Generate secure parameterized query using detection engine
      const result = await this.detector.generateSecureQuery(vulnerableQuery, parameters);

      // Log successful secure query generation
      this.logger.log('Secure query generated successfully');
      return result;
    } catch (error) {
      // Log and re-throw generation errors
      this.logger.error(`Error generating secure query: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Batch Query Analyzer
   * 
   * Efficiently processes multiple SQL queries in parallel for vulnerability
   * analysis. This method is optimized for high-throughput operations while
   * maintaining individual query analysis quality and detailed reporting.
   * 
   * @async
   * @method batchAnalyze
   * @param {string[]} queries - Array of SQL queries to analyze
   * @returns {Promise<SQLAnalysisResult[]>} Array of analysis results for each query
   * @throws {Error} When batch analysis fails or encounters processing errors
   */
  async batchAnalyze(queries: string[]): Promise<SQLAnalysisResult[]> {
    // Log batch analysis initiation with query count
    this.logger.log(`Batch analyzing ${queries.length} queries`);

    try {
      // Process all queries in parallel for efficiency
      const results = await Promise.all(
        queries.map(query => this.detector.analyzeQuery(query))
      );

      // Calculate and log batch analysis summary statistics
      const vulnerableCount = results.filter(r => r.isVulnerable).length;
      this.logger.log(`Batch analysis complete. ${vulnerableCount}/${queries.length} queries vulnerable`);

      return results;
    } catch (error) {
      // Log and re-throw batch processing errors
      this.logger.error(`Error in batch analysis: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Detection Service Statistics Provider
   * 
   * Retrieves comprehensive statistics about the detection service usage,
   * performance metrics, and security scan history. In production, this
   * would integrate with a persistence layer for accurate metrics.
   * 
   * @async
   * @method getDetectionStats
   * @returns {Promise<Object>} Service statistics including scans, vulnerabilities, and metrics
   */
  async getDetectionStats(): Promise<{
    total_scans: number;
    vulnerable_queries: number;
    avg_risk_score: number;
    last_scan_time: string;
  }> {
    // TODO: In production, integrate with database for real metrics
    // Currently returning mock data for demonstration purposes
    return {
      total_scans: 1250,
      vulnerable_queries: 187,
      avg_risk_score: 23.5,
      last_scan_time: new Date().toISOString()
    };
  }
}
