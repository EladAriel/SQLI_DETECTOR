import { Histogram, Counter, Gauge, register } from 'prom-client';

/**
 * SQL Injection Detection Metrics Collection
 * 
 * Comprehensive Prometheus metrics collection for monitoring and observability
 * of the SQL injection detection system. This module provides detailed insights
 * into system performance, security analysis effectiveness, and operational health.
 * 
 * Metrics Categories:
 * - Analysis performance and results tracking
 * - Vulnerability detection and classification
 * - File processing and upload monitoring
 * - MCP tool usage and performance
 * - Database and API health monitoring
 * - Vector store operations tracking
 * 
 * These metrics enable:
 * - Performance monitoring and optimization
 * - Security effectiveness measurement
 * - Operational health monitoring
 * - Capacity planning and scaling decisions
 * - Security trend analysis and reporting
 */

/**
 * SQL Injection Detection Metrics Collection
 * 
 * Comprehensive set of Prometheus metrics for monitoring the SQL injection
 * detection system's performance, effectiveness, and operational health.
 */
export const sqlInjectionMetrics = {
  /**
   * Analysis Counter Metric
   * 
   * Tracks the total number of SQL injection analyses performed with
   * detailed labels for result classification and analysis context.
   */
  analysisCounter: new Counter({
    name: 'sqli_analysis_total',
    help: 'Total number of SQL injection analyses performed',
    labelNames: ['result', 'risk_level', 'file_type', 'detection_method']
  }),

  /**
   * Analysis Duration Histogram
   * 
   * Measures the time taken for SQL injection analysis operations
   * to identify performance bottlenecks and optimization opportunities.
   */
  analysisHistogram: new Histogram({
    name: 'sqli_analysis_duration_seconds',
    help: 'Duration of SQL injection analysis in seconds',
    buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10],  // Buckets optimized for analysis times
    labelNames: ['analysis_type', 'file_type']
  }),

  /**
   * Vulnerability Detection Counter
   * 
   * Counts vulnerabilities detected by type and severity to track
   * the effectiveness of the detection system and security trends.
   */
  vulnerabilityCounter: new Counter({
    name: 'sqli_vulnerabilities_detected_total',
    help: 'Total number of vulnerabilities detected by type',
    labelNames: ['vulnerability_type', 'severity', 'pattern']
  }),

  /**
   * Active Analyses Gauge
   * 
   * Tracks the number of currently running analyses to monitor
   * system load and prevent resource exhaustion.
   */
  activeAnalysesGauge: new Gauge({
    name: 'sqli_active_analyses',
    help: 'Number of currently active SQL injection analyses'
  }),

  /**
   * File Processing Counter
   * 
   * Monitors file upload and processing operations with status
   * tracking for operational visibility and error monitoring.
   */
  fileProcessingCounter: new Counter({
    name: 'sqli_files_processed_total',
    help: 'Total number of files processed for SQL injection detection',
    labelNames: ['file_type', 'processing_status', 'source']
  }),

  /**
   * File Processing Duration Histogram
   * 
   * Measures file processing times including upload and analysis
   * phases to optimize system performance and user experience.
   */
  fileProcessingHistogram: new Histogram({
    name: 'sqli_file_processing_duration_seconds',
    help: 'Duration of file processing including upload and analysis',
    buckets: [0.5, 1, 2, 5, 10, 30, 60],  // Buckets for file processing times
    labelNames: ['file_type', 'file_size_category']
  }),

  /**
   * MCP Tool Usage Counter
   * 
   * Tracks Model Context Protocol tool invocations for AI
   * interaction monitoring and usage pattern analysis.
   */
  mcpToolCounter: new Counter({
    name: 'mcp_tool_calls_total',
    help: 'Total number of MCP tool calls',
    labelNames: ['tool_name', 'status', 'user_type']
  }),

  /**
   * MCP Tool Execution Time Histogram
   * 
   * Measures MCP tool execution duration for performance
   * optimization and user experience improvement.
   */
  mcpToolHistogram: new Histogram({
    name: 'mcp_tool_execution_duration_seconds',
    help: 'Duration of MCP tool execution',
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],  // Buckets for tool execution times
    labelNames: ['tool_name']
  }),

  /**
   * Database Connection Status Gauge
   * 
   * Monitors database connectivity health for system
   * reliability and alerting purposes.
   */
  databaseConnectionGauge: new Gauge({
    name: 'database_connection_status',
    help: 'Status of database connection (1=connected, 0=disconnected)'
  }),

  /**
   * API Error Counter
   * 
   * Tracks API errors by type and endpoint for error
   * monitoring and system reliability assessment.
   */
  apiErrorCounter: new Counter({
    name: 'sqli_api_errors_total',
    help: 'Total number of API errors',
    labelNames: ['error_type', 'endpoint', 'status_code']
  }),

  /**
   * Vector Store Operations Gauge
   * 
   * Monitors vector database operations for semantic
   * search performance and capacity management.
   */
  vectorStoreGauge: new Gauge({
    name: 'vector_store_operations',
    help: 'Number of vector store operations in progress',
    labelNames: ['operation_type']
  }),

  /**
   * Semantic Search Counter
   * 
   * Tracks semantic search queries and their effectiveness
   * for optimizing search algorithms and user experience.
   */
  semanticSearchCounter: new Counter({
    name: 'semantic_search_queries_total',
    help: 'Total number of semantic search queries',
    labelNames: ['query_type', 'results_found']
  })
};

/**
 * File Size Categorizer
 * 
 * Categorizes file sizes into buckets for metrics labeling
 * and performance analysis. Helps identify processing patterns
 * based on file size characteristics.
 * 
 * @function getFileSizeCategory
 * @param {number} size - File size in bytes
 * @returns {string} Size category (small, medium, large, xlarge)
 */
export function getFileSizeCategory(size: number): string {
  if (size < 1024) return 'small';           // < 1KB
  if (size < 1024 * 10) return 'medium';     // < 10KB
  if (size < 1024 * 100) return 'large';     // < 100KB
  return 'xlarge';                            // >= 100KB
}

/**
 * Risk Level Categorizer
 * 
 * Converts numeric vulnerability scores into categorical risk levels
 * for easier analysis and alerting. Provides standardized risk
 * classification across the system.
 * 
 * @function getRiskCategory
 * @param {number} score - Vulnerability score (0-100)
 * @returns {string} Risk category (none, low, medium, high, critical)
 */
export function getRiskCategory(score: number): string {
  if (score >= 80) return 'critical';        // 80-100: Critical risk
  if (score >= 60) return 'high';            // 60-79: High risk
  if (score >= 40) return 'medium';          // 40-59: Medium risk
  if (score > 0) return 'low';               // 1-39: Low risk
  return 'none';                             // 0: No risk
}

/**
 * Request Metrics Middleware
 * 
 * Express middleware function to automatically track HTTP request
 * metrics including response times, error rates, and endpoint usage.
 * Provides comprehensive API monitoring and performance insights.
 * 
 * @function trackRequestMetrics
 * @param {any} req - Express request object
 * @param {any} res - Express response object
 * @param {any} next - Express next function
 */
export function trackRequestMetrics(req: any, res: any, next: any) {
  const startTime = Date.now();  // Record request start time

  // Track metrics when response finishes
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;  // Calculate duration in seconds
    const endpoint = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Track API response times for analysis endpoints
    if (endpoint.includes('/detect')) {
      sqlInjectionMetrics.analysisHistogram
        .labels('api_request', 'unknown')
        .observe(duration);
    }

    // Track HTTP errors for monitoring and alerting
    if (statusCode >= 400) {
      sqlInjectionMetrics.apiErrorCounter
        .labels('http_error', endpoint, statusCode.toString())
        .inc();
    }
  });

  next();  // Continue to next middleware
}

/**
 * Custom Metrics Registration
 * 
 * Registers all custom metrics with Prometheus. While metrics are
 * auto-registered when created, this function provides explicit
 * registration confirmation and logging.
 * 
 * @function registerCustomMetrics
 */
export function registerCustomMetrics() {
  // Note: Metrics are auto-registered when created with prom-client
  console.log('Custom Prometheus metrics registered successfully');
}

/**
 * Metrics Endpoint Response Generator
 * 
 * Generates the Prometheus metrics response in the standard format
 * for scraping by Prometheus monitoring systems.
 * 
 * @async
 * @function getMetricsResponse
 * @returns {Promise<string>} Prometheus metrics in text format
 */
export async function getMetricsResponse(): Promise<string> {
  return await register.metrics();
}

/**
 * Health Metrics Updater
 * 
 * Updates health-related metrics based on system status checks.
 * Used for monitoring database connectivity and system health.
 * 
 * @function updateHealthMetrics
 * @param {boolean} isHealthy - Whether the system is healthy
 */
export function updateHealthMetrics(isHealthy: boolean) {
  sqlInjectionMetrics.databaseConnectionGauge.set(isHealthy ? 1 : 0);
}

/**
 * Metrics Tracking Utilities
 * 
 * Collection of utility functions for tracking specific events and
 * operations across the SQL injection detection system. These functions
 * provide standardized metrics collection for different system components.
 */
export const MetricsTrackers = {
  /**
   * MCP Tool Execution Tracker
   * 
   * Tracks Model Context Protocol tool executions including
   * duration and success/failure rates for performance monitoring.
   * 
   * @function trackMCPTool
   * @param {string} toolName - Name of the MCP tool executed
   * @param {number} startTime - Tool execution start timestamp
   * @param {string} status - Execution status (success or error)
   */
  trackMCPTool: (toolName: string, startTime: number, status: 'success' | 'error') => {
    const duration = (Date.now() - startTime) / 1000;  // Calculate execution time

    // Increment tool usage counter with labels
    sqlInjectionMetrics.mcpToolCounter.labels(toolName, status, 'user').inc();

    // Record execution duration
    sqlInjectionMetrics.mcpToolHistogram.labels(toolName).observe(duration);
  },

  /**
   * Security Analysis Tracker
   * 
   * Tracks SQL injection analysis results including vulnerability
   * detection, risk assessment, and performance metrics.
   * 
   * @function trackAnalysis
   * @param {any} result - Analysis result object with vulnerability data
   * @param {string} fileType - Type of file analyzed
   * @param {string} method - Detection method used
   * @param {number} duration - Analysis duration in seconds
   */
  trackAnalysis: (result: any, fileType: string, method: string, duration: number) => {
    const riskLevel = getRiskCategory(result.vulnerability_score || 0);
    const isVulnerable = result.is_vulnerable ? 'vulnerable' : 'safe';

    // Track analysis results with comprehensive labels
    sqlInjectionMetrics.analysisCounter
      .labels(isVulnerable, riskLevel, fileType, method)
      .inc();

    // Record analysis duration
    sqlInjectionMetrics.analysisHistogram
      .labels(method, fileType)
      .observe(duration);

    // Track individual vulnerabilities found
    if (result.vulnerabilities) {
      result.vulnerabilities.forEach((vuln: any) => {
        sqlInjectionMetrics.vulnerabilityCounter
          .labels(vuln.type || 'unknown', vuln.severity || 'unknown', vuln.pattern || 'unknown')
          .inc();
      });
    }
  },

  /**
   * File Processing Tracker
   * 
   * Tracks file upload and processing operations including
   * processing time, file characteristics, and success rates.
   * 
   * @function trackFileProcessing
   * @param {string} fileType - Type of file processed
   * @param {number} size - File size in bytes
   * @param {string} status - Processing status
   * @param {string} source - Source of the file (upload, api, etc.)
   * @param {number} duration - Processing duration in seconds
   */
  trackFileProcessing: (fileType: string, size: number, status: string, source: string, duration: number) => {
    const sizeCategory = getFileSizeCategory(size);

    // Track file processing with status and source
    sqlInjectionMetrics.fileProcessingCounter
      .labels(fileType, status, source)
      .inc();

    // Record processing duration by file characteristics
    sqlInjectionMetrics.fileProcessingHistogram
      .labels(fileType, sizeCategory)
      .observe(duration);
  },

  /**
   * Semantic Search Tracker
   * 
   * Tracks semantic search operations and their effectiveness
   * for optimizing search algorithms and user experience.
   * 
   * @function trackSemanticSearch
   * @param {string} queryType - Type of semantic search query
   * @param {number} resultsCount - Number of results returned
   */
  trackSemanticSearch: (queryType: string, resultsCount: number) => {
    const resultsCategory = resultsCount > 0 ? 'found' : 'not_found';

    // Track search effectiveness
    sqlInjectionMetrics.semanticSearchCounter
      .labels(queryType, resultsCategory)
      .inc();
  },

  /**
   * Active Operations Counter Increment
   * 
   * Increments the count of active analyses for load monitoring.
   * 
   * @function incrementActiveAnalyses
   */
  incrementActiveAnalyses: () => {
    sqlInjectionMetrics.activeAnalysesGauge.inc();
  },

  /**
   * Active Operations Counter Decrement
   * 
   * Decrements the count of active analyses when operations complete.
   * 
   * @function decrementActiveAnalyses
   */
  decrementActiveAnalyses: () => {
    sqlInjectionMetrics.activeAnalysesGauge.dec();
  },

  /**
   * Vector Store Operations Tracker
   * 
   * Sets the current count of vector store operations for
   * capacity monitoring and performance optimization.
   * 
   * @function setVectorStoreOperations
   * @param {string} operationType - Type of vector store operation
   * @param {number} count - Current operation count
   */
  setVectorStoreOperations: (operationType: string, count: number) => {
    sqlInjectionMetrics.vectorStoreGauge.labels(operationType).set(count);
  }
};

/**
 * Default Export
 * 
 * Exports the complete metrics system for easy import and usage
 * across the application. Provides centralized access to all
 * monitoring capabilities.
 */
export default {
  sqlInjectionMetrics,
  MetricsTrackers,
  registerCustomMetrics,
  getMetricsResponse,
  updateHealthMetrics,
  trackRequestMetrics
};
