import { z } from 'zod';

/**
 * SQL Analysis Result Interface
 * 
 * Represents the comprehensive result of SQL query security analysis.
 * Contains vulnerability assessment, risk scoring, and remediation guidance.
 */
export interface SQLAnalysisResult {
  isVulnerable: boolean;           // Whether the query contains vulnerabilities
  score: number;                   // Risk score from 0-100 (higher = more dangerous)
  detectedPatterns: string[];      // List of detected suspicious patterns
  riskFactors: RiskFactor[];       // Detailed risk factor analysis
  recommendations: string[];       // Security improvement recommendations
  secureAlternative?: string;      // Suggested secure query alternative
}

/**
 * Risk Factor Interface
 * 
 * Defines individual security risk factors found during analysis.
 * Provides categorized risk assessment with specific pattern details.
 */
export interface RiskFactor {
  type: 'high' | 'medium' | 'low'; // Risk severity level
  description: string;             // Human-readable risk description
  pattern: string;                 // The specific pattern that was detected
}

/**
 * Security Scan Result Interface
 * 
 * Contains comprehensive security scan results for various attack vectors.
 * Used for detailed vulnerability reporting and risk assessment.
 */
export interface SecurityScanResult {
  scan_type: string;               // Type of security scan performed
  vulnerabilities: Vulnerability[]; // List of detected vulnerabilities
  risk_score: number;              // Overall risk score (0-100)
  recommendations: string[];       // Security recommendations
  timestamp: string;               // ISO timestamp of the scan
}

/**
 * Vulnerability Interface
 * 
 * Represents a specific security vulnerability discovered during scanning.
 * Provides detailed information for security teams and developers.
 */
export interface Vulnerability {
  type: string;                    // Vulnerability category (SQL Injection, XSS, etc.)
  severity: 'critical' | 'high' | 'medium' | 'low'; // Severity classification
  description: string;             // Detailed vulnerability description
  location?: string;               // Location where vulnerability was found
  payload?: string;                // The malicious payload detected
}

/**
 * SQL Injection Detection Engine
 * 
 * Comprehensive security scanner for detecting SQL injection vulnerabilities,
 * XSS attacks, and input validation issues. This class provides:
 * 
 * - Multi-pattern SQL injection detection
 * - Database-specific vulnerability analysis
 * - Cross-site scripting (XSS) detection
 * - Input validation security checks
 * - Secure query generation and recommendations
 * - Risk scoring and severity assessment
 * 
 * The detector uses regex patterns and heuristic analysis to identify
 * potential security vulnerabilities in user input and SQL queries.
 * 
 * @class SQLInjectionDetector
 */
export class SQLInjectionDetector {

  /**
   * SQL Injection Pattern Database
   * 
   * Comprehensive collection of regex patterns designed to detect various
   * SQL injection attack vectors including classic SQL injection,
   * comment-based injections, function-based attacks, time-based blind
   * SQL injection, boolean-based blind SQL injection, error-based SQL
   * injection, LDAP injection patterns, and NoSQL injection patterns.
   */
  private sqlInjectionPatterns = [
    // Classic SQL injection patterns - more specific
    /(\b(DROP|DELETE)\s+(TABLE|DATABASE|SCHEMA)\b)/i,    // Destructive operations
    /UNION\s+(ALL\s+)?SELECT/i,                          // UNION-based injection
    /'(\s)*(OR|AND)\s*'\s*=\s*'/i,                      // Quote-based conditions
    /'(\s)*(OR|AND)\s*1\s*=\s*1/i,                      // Always-true conditions
    /'(\s)*(OR|AND)\s*'?\d+'?\s*=\s*'?\d+'?/i,          // Numeric comparisons

    // Comment-based injections
    /--[\s\S]*$/,                                        // SQL line comments
    /\/\*[\s\S]*?\*\//,                                  // SQL block comments
    /#[\s\S]*$/,                                         // MySQL hash comments

    // Function-based injections
    /(CONCAT|SUBSTRING|ASCII|CHAR|LENGTH|SLEEP|BENCHMARK|LOAD_FILE|INTO\s+OUTFILE)/i,
    /(WAITFOR\s+DELAY|EXEC\s*\(|EXECUTE\s*\()/i,        // Execution functions

    // Time-based blind SQL injection
    /(SLEEP\s*\(|WAITFOR\s+DELAY|BENCHMARK\s*\()/i,     // Timing attack patterns

    // Boolean-based blind SQL injection
    /(AND|OR)\s+\d+\s*=\s*\d+/i,                        // Numeric boolean conditions
    /(AND|OR)\s+('\w+'|"\w+")\s*=\s*('\w+'|"\w+")/i,    // String boolean conditions

    // Error-based SQL injection
    /(CAST\s*\(|CONVERT\s*\(|EXTRACTVALUE\s*\(|UPDATEXML\s*\()/i, // Type conversion attacks

    // LDAP injection patterns
    /(\*|\||\&|\!|\=|\<|\>|\~)/,                         // LDAP special characters

    // NoSQL injection patterns
    /(\$where|\$ne|\$gt|\$lt|\$regex|\$in|\$nin)/i,      // MongoDB injection operators
  ];

  /**
   * Cross-Site Scripting (XSS) Pattern Database
   * 
   * Collection of regex patterns to detect XSS attack vectors including
   * script tag injections, iframe embeddings, JavaScript protocol usage,
   * event handler attributes, image-based XSS, and object/embed tag abuse.
   */
  private xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,    // Script tags
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,    // Iframe injections
    /javascript:/gi,                                          // JavaScript protocol
    /on\w+\s*=/gi,                                           // Event handlers (onclick, onload, etc.)
    /<img[^>]+src[^>]*>/gi,                                  // Image-based XSS
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,   // Object tag abuse
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,     // Embed tag abuse
  ];

  /**
   * Input Validation Pattern Database
   * 
   * Patterns to detect various input validation vulnerabilities including
   * path traversal attacks, command injection attempts, file inclusion
   * vulnerabilities, and protocol-based attacks.
   */
  private inputValidationPatterns = [
    // Path traversal patterns
    /\.\.[\/\\]/,                                            // Directory traversal (../)
    /\.\.[\\\/]/,                                            // Directory traversal (..\)

    // Command injection patterns
    /[;&|`$]/,                                               // Command separators and substitution
    /(nc|netcat|telnet|wget|curl|ping|nslookup|dig)\s/i,    // Network utilities

    // File inclusion patterns
    /(include|require|include_once|require_once)\s*\(/i,     // PHP inclusion functions
    /file:\/\/|ftp:\/\/|data:/i,                             // Dangerous protocols
  ];

  /**
   * SQL Query Security Analyzer
   * 
   * Performs comprehensive security analysis of SQL queries to detect potential
   * injection vulnerabilities. This method examines the query against multiple
   * pattern databases and provides detailed risk assessment.
   * 
   * Features:
   * - Multi-pattern SQL injection detection
   * - Database-specific vulnerability analysis
   * - Risk scoring with detailed breakdown
   * - Secure alternative generation
   * - Actionable security recommendations
   * 
   * @async
   * @function analyzeQuery
   * @param {string} query - The SQL query to analyze for security vulnerabilities
   * @param {string} [databaseType] - Optional database type for specific checks (mysql, postgresql, sqlite, mssql)
   * @returns {Promise<SQLAnalysisResult>} Comprehensive analysis results with risk assessment
   */
  public async analyzeQuery(
    query: string,
    databaseType?: 'mysql' | 'postgresql' | 'sqlite' | 'mssql'
  ): Promise<SQLAnalysisResult> {
    // Initialize result tracking variables
    const detectedPatterns: string[] = [];  // Store regex patterns that matched
    const riskFactors: RiskFactor[] = [];   // Detailed risk factor analysis
    let score = 0;                          // Cumulative risk score (0-100)

    // Iterate through all SQL injection patterns to find matches
    for (const pattern of this.sqlInjectionPatterns) {
      const matches = query.match(pattern);
      if (matches) {
        // Store the pattern for reporting
        detectedPatterns.push(pattern.toString());

        // Assign risk score based on pattern severity and type
        if (pattern.toString().includes('DROP|DELETE')) {
          // Destructive operations pose the highest risk
          riskFactors.push({
            type: 'high',
            description: 'Potentially destructive SQL operations detected',
            pattern: matches[0]
          });
          score += 30;  // High score for destructive operations
        } else if (pattern.toString().includes('UNION')) {
          // UNION-based attacks allow data extraction
          riskFactors.push({
            type: 'high',
            description: 'UNION-based SQL injection pattern detected',
            pattern: matches[0]
          });
          score += 25;  // High score for data extraction attacks
        } else if (pattern.toString().includes('OR|AND')) {
          // Boolean-based attacks for authentication bypass
          riskFactors.push({
            type: 'medium',
            description: 'Boolean-based SQL injection pattern detected',
            pattern: matches[0]
          });
          score += 20;  // Medium score for logic manipulation
        } else {
          // General suspicious patterns
          riskFactors.push({
            type: 'medium',
            description: 'Suspicious SQL pattern detected',
            pattern: matches[0]
          });
          score += 15;  // Base score for suspicious patterns
        }
      }
    }

    // Perform additional database-specific security checks
    if (databaseType) {
      score += this.performDatabaseSpecificChecks(query, databaseType);
    }

    // Generate contextual security recommendations
    const recommendations = this.generateRecommendations(riskFactors, databaseType);

    // Generate secure alternative if query is deemed vulnerable
    let secureAlternative: string | undefined;
    if (score > 20) {  // Threshold for generating secure alternatives
      secureAlternative = this.generateSecureAlternative(query, databaseType);
    }

    // Return comprehensive analysis results
    return {
      isVulnerable: score > 20,           // Vulnerability threshold
      score: Math.min(score, 100),        // Cap score at 100
      detectedPatterns,                   // List of matched patterns
      riskFactors,                        // Detailed risk analysis
      recommendations,                    // Security recommendations
      secureAlternative                   // Suggested secure query (if applicable)
    };
  }

  /**
   * Multi-Vector Security Scanner
   * 
   * Performs comprehensive security scanning for multiple attack vectors
   * including SQL injection, XSS, and input validation vulnerabilities.
   * This method provides flexible scanning options for different security
   * assessment needs.
   * 
   * @async
   * @function performSecurityScan
   * @param {string} payload - The input payload to scan for vulnerabilities
   * @param {string} scanType - Type of scan to perform (input_validation, sql_injection, xss, comprehensive)
   * @returns {Promise<SecurityScanResult>} Detailed security scan results with vulnerabilities and recommendations
   */
  public async performSecurityScan(
    payload: string,
    scanType: 'input_validation' | 'sql_injection' | 'xss' | 'comprehensive'
  ): Promise<SecurityScanResult> {
    const vulnerabilities: Vulnerability[] = [];  // Collected vulnerabilities
    let riskScore = 0;                           // Aggregate risk score

    // Execute appropriate scanning based on requested type
    switch (scanType) {
      case 'sql_injection':
        // Perform SQL injection specific scanning
        const sqlVulns = await this.detectSQLInjection(payload);
        vulnerabilities.push(...sqlVulns);
        break;

      case 'xss':
        // Perform Cross-Site Scripting scanning
        const xssVulns = await this.detectXSS(payload);
        vulnerabilities.push(...xssVulns);
        break;

      case 'input_validation':
        // Perform input validation vulnerability scanning
        const inputVulns = await this.detectInputValidationIssues(payload);
        vulnerabilities.push(...inputVulns);
        break;

      case 'comprehensive':
        // Perform all types of scanning for complete assessment
        const allVulns = await Promise.all([
          this.detectSQLInjection(payload),
          this.detectXSS(payload),
          this.detectInputValidationIssues(payload)
        ]);
        vulnerabilities.push(...allVulns.flat());
        break;
    }

    // Calculate aggregate risk score based on vulnerability severities
    riskScore = vulnerabilities.reduce((total, vuln) => {
      switch (vuln.severity) {
        case 'critical': return total + 40;  // Critical vulnerabilities
        case 'high': return total + 25;      // High-impact vulnerabilities
        case 'medium': return total + 15;    // Medium-impact vulnerabilities
        case 'low': return total + 5;        // Low-impact vulnerabilities
        default: return total;
      }
    }, 0);

    // Generate security recommendations based on findings
    const recommendations = this.generateSecurityRecommendations(vulnerabilities);

    // Return comprehensive scan results
    return {
      scan_type: scanType,
      vulnerabilities,
      risk_score: Math.min(riskScore, 100),  // Cap at 100
      recommendations,
      timestamp: new Date().toISOString()    // Timestamp for audit trail
    };
  }

  /**
   * Secure Query Generator
   * 
   * Analyzes a potentially vulnerable SQL query and generates a secure
   * parameterized alternative. This method helps developers understand
   * how to properly secure their SQL queries against injection attacks.
   * 
   * @async
   * @function generateSecureQuery
   * @param {string} vulnerableQuery - The original vulnerable SQL query
   * @param {Record<string, any>} [parameters] - Optional existing parameters
   * @returns {Promise<SecureQueryResult>} Secure query with parameters and explanation
   */
  public async generateSecureQuery(
    vulnerableQuery: string,
    parameters?: Record<string, any>
  ): Promise<{ original: string; secure: string; explanation: string; parameters: Record<string, any> }> {
    let secureQuery = vulnerableQuery;                    // Working copy of the query
    const extractedParams: Record<string, any> = parameters || {}; // Parameter storage

    // Replace string literals with parameterized placeholders
    secureQuery = secureQuery.replace(
      /'([^']+)'/g,
      (match, value) => {
        // Generate unique parameter name
        const paramName = `param_${Object.keys(extractedParams).length + 1}`;
        extractedParams[paramName] = value;
        return `$${paramName}`;  // Use parameterized placeholder
      }
    );

    // Remove potentially dangerous SQL operations that shouldn't be in user queries
    secureQuery = secureQuery.replace(
      /;\s*(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)\s+/gi,
      ''  // Strip dangerous operations
    );

    // Provide detailed explanation of the security improvements
    const explanation = `
Secure Query Generation:
1. String literals replaced with parameterized placeholders
2. Dangerous SQL operations removed
3. Input validation should be implemented at application level
4. Use prepared statements with these parameters
`;

    return {
      original: vulnerableQuery,
      secure: secureQuery,
      explanation,
      parameters: extractedParams
    };
  }

  /**
   * Database-Specific Security Checker
   * 
   * Performs additional security checks based on the specific database
   * management system in use. Different databases have unique security
   * vulnerabilities and attack vectors that require specialized detection.
   * 
   * @private
   * @function performDatabaseSpecificChecks
   * @param {string} query - The SQL query to analyze
   * @param {string} databaseType - The database management system type
   * @returns {number} Additional risk score based on database-specific vulnerabilities
   */
  private performDatabaseSpecificChecks(query: string, databaseType: string): number {
    let additionalScore = 0;  // Additional risk score for database-specific issues

    switch (databaseType) {
      case 'mysql':
        // MySQL-specific security checks
        if (query.match(/LOAD_FILE|INTO\s+OUTFILE|DUMPFILE/i)) {
          additionalScore += 25;  // File system access vulnerabilities
        }
        break;

      case 'postgresql':
        // PostgreSQL-specific security checks
        if (query.match(/COPY|pg_read_file|pg_ls_dir/i)) {
          additionalScore += 25;  // Administrative function abuse
        }
        break;

      case 'mssql':
        // Microsoft SQL Server-specific security checks
        if (query.match(/xp_cmdshell|OPENROWSET|OPENDATASOURCE/i)) {
          additionalScore += 30;  // System command execution vulnerabilities
        }
        break;
    }

    return additionalScore;
  }

  /**
   * Security Recommendation Generator
   * 
   * Generates contextual security recommendations based on detected
   * risk factors and the database environment. Provides actionable
   * guidance for improving query security.
   * 
   * @private
   * @function generateRecommendations
   * @param {RiskFactor[]} riskFactors - Array of detected risk factors
   * @param {string} [databaseType] - Optional database type for specific recommendations
   * @returns {string[]} Array of security recommendations
   */
  private generateRecommendations(riskFactors: RiskFactor[], databaseType?: string): string[] {
    // Base security recommendations for all scenarios
    const recommendations: string[] = [
      'Use parameterized queries or prepared statements',
      'Implement input validation and sanitization',
      'Apply the principle of least privilege for database users',
      'Use stored procedures where appropriate',
      'Implement proper error handling without exposing system details'
    ];

    // Add high-priority recommendations for serious vulnerabilities
    if (riskFactors.some(rf => rf.type === 'high')) {
      recommendations.push(
        'Conduct immediate security review due to high-risk patterns detected',
        'Consider implementing Web Application Firewall (WAF)',
        'Enable database audit logging'
      );
    }

    // Add database-specific recommendations
    if (databaseType) {
      recommendations.push(`Follow ${databaseType}-specific security best practices`);
    }

    return recommendations;
  }

  /**
   * Secure Alternative Generator
   * 
   * Creates a basic secure alternative to a vulnerable query by
   * parameterizing values and adding security-focused comments.
   * This provides developers with a starting point for secure implementation.
   * 
   * @private
   * @function generateSecureAlternative
   * @param {string} query - The original vulnerable query
   * @param {string} [databaseType] - Optional database type for specific syntax
   * @returns {string} Secure query alternative with explanatory comments
   */
  private generateSecureAlternative(query: string, databaseType?: string): string {
    let secure = query;  // Working copy of the query

    // Replace string literals with parameterized placeholders
    secure = secure.replace(/'[^']*'/g, '?');

    // Determine appropriate comment syntax for the database
    const comment = databaseType === 'mysql' ? '-- ' :
      databaseType === 'postgresql' ? '-- ' :
        databaseType === 'mssql' ? '-- ' : '-- ';

    // Return secure query with explanatory comments
    return `${comment}Secure parameterized version:\n${secure}\n${comment}Use prepared statements with bound parameters`;
  }

  /**
   * SQL Injection Vulnerability Detector
   * 
   * Analyzes input payload specifically for SQL injection patterns.
   * This method focuses solely on SQL injection detection and provides
   * detailed vulnerability information for each detected pattern.
   * 
   * @private
   * @async
   * @function detectSQLInjection
   * @param {string} payload - The input payload to analyze
   * @returns {Promise<Vulnerability[]>} Array of SQL injection vulnerabilities found
   */
  private async detectSQLInjection(payload: string): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];  // Store detected vulnerabilities

    // Check payload against all SQL injection patterns
    for (const pattern of this.sqlInjectionPatterns) {
      const matches = payload.match(pattern);
      if (matches) {
        // Create vulnerability record for each detected pattern
        vulnerabilities.push({
          type: 'SQL Injection',
          severity: this.getSeverityForSQLPattern(pattern),
          description: `Potential SQL injection pattern detected: ${matches[0]}`,
          payload: matches[0]
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Cross-Site Scripting (XSS) Detector
   * 
   * Analyzes input payload for XSS attack patterns including script
   * injections, event handlers, and malicious HTML content. Provides
   * detailed vulnerability assessment for web application security.
   * 
   * @private
   * @async
   * @function detectXSS
   * @param {string} payload - The input payload to analyze
   * @returns {Promise<Vulnerability[]>} Array of XSS vulnerabilities found
   */
  private async detectXSS(payload: string): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];  // Store detected vulnerabilities

    // Check payload against all XSS patterns
    for (const pattern of this.xssPatterns) {
      const matches = payload.match(pattern);
      if (matches) {
        // Create vulnerability record for each detected XSS pattern
        vulnerabilities.push({
          type: 'Cross-Site Scripting (XSS)',
          severity: 'high',  // XSS is generally considered high severity
          description: `Potential XSS pattern detected: ${matches[0]}`,
          payload: matches[0]
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Input Validation Issue Detector
   * 
   * Analyzes input payload for various input validation vulnerabilities
   * including path traversal, command injection, and file inclusion attacks.
   * Focuses on application-level security weaknesses.
   * 
   * @private
   * @async
   * @function detectInputValidationIssues
   * @param {string} payload - The input payload to analyze
   * @returns {Promise<Vulnerability[]>} Array of input validation vulnerabilities found
   */
  private async detectInputValidationIssues(payload: string): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];  // Store detected vulnerabilities

    // Check payload against all input validation patterns
    for (const pattern of this.inputValidationPatterns) {
      const matches = payload.match(pattern);
      if (matches) {
        // Create vulnerability record for each detected input validation issue
        vulnerabilities.push({
          type: 'Input Validation',
          severity: 'medium',  // Input validation issues are typically medium severity
          description: `Input validation issue detected: ${matches[0]}`,
          payload: matches[0]
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * SQL Pattern Severity Classifier
   * 
   * Determines the severity level of SQL injection patterns based on
   * their potential impact and risk level. This classification helps
   * prioritize security responses and remediation efforts.
   * 
   * @private
   * @function getSeverityForSQLPattern
   * @param {RegExp} pattern - The regex pattern to classify
   * @returns {string} Severity level (critical, high, medium, low)
   */
  private getSeverityForSQLPattern(pattern: RegExp): 'critical' | 'high' | 'medium' | 'low' {
    const patternStr = pattern.toString();  // Convert pattern to string for analysis

    // Critical severity: Destructive operations and system commands
    if (patternStr.includes('DROP|DELETE') || patternStr.includes('xp_cmdshell')) {
      return 'critical';
    }
    // High severity: Data extraction and code execution
    else if (patternStr.includes('UNION') || patternStr.includes('EXEC')) {
      return 'high';
    }
    // Medium severity: Logic manipulation and authentication bypass
    else if (patternStr.includes('OR|AND')) {
      return 'medium';
    }
    // Low severity: General suspicious patterns
    else {
      return 'low';
    }
  }

  /**
   * Contextual Security Recommendation Generator
   * 
   * Generates targeted security recommendations based on the specific
   * types of vulnerabilities detected. Provides actionable guidance
   * tailored to the security issues found during scanning.
   * 
   * @private
   * @function generateSecurityRecommendations
   * @param {Vulnerability[]} vulnerabilities - Array of detected vulnerabilities
   * @returns {string[]} Array of tailored security recommendations
   */
  private generateSecurityRecommendations(vulnerabilities: Vulnerability[]): string[] {
    const recommendations = new Set<string>();  // Use Set to avoid duplicates

    // Generate recommendations based on vulnerability types
    vulnerabilities.forEach(vuln => {
      switch (vuln.type) {
        case 'SQL Injection':
          recommendations.add('Implement parameterized queries');
          recommendations.add('Use input validation and sanitization');
          recommendations.add('Apply database user privilege restrictions');
          break;

        case 'Cross-Site Scripting (XSS)':
          recommendations.add('Implement output encoding/escaping');
          recommendations.add('Use Content Security Policy (CSP)');
          recommendations.add('Validate and sanitize all user inputs');
          break;

        case 'Input Validation':
          recommendations.add('Implement strict input validation');
          recommendations.add('Use whitelist-based validation');
          recommendations.add('Implement file upload restrictions');
          break;
      }
    });

    // Convert Set back to Array for return
    return Array.from(recommendations);
  }
}
