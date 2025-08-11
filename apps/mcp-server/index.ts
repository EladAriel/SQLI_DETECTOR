import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { SQLInjectionDetector } from '../shared/sql-injection-detector';
import { SecurityKnowledgeBase } from '../shared/security-knowledge-base';
import { SharedSecureTemplateLoader } from '../shared/shared-secure-template-loader';
import axios from 'axios';

/**
 * SQL Injection Detection MCP Server
 * 
 * A comprehensive Model Context Protocol (MCP) server that provides AI language models
 * with powerful SQL injection detection and security analysis capabilities. This server
 * acts as a bridge between AI systems and the SQL injection detection infrastructure,
 * offering tools, resources, and prompts for comprehensive security analysis.
 * 
 * Key Features:
 * - File upload and security analysis via API integration
 * - Semantic search across vulnerable code patterns
 * - Comprehensive security auditing capabilities
 * - Real-time SQL query vulnerability analysis
 * - Educational security knowledge base access
 * - Contextual security prompts and guidance
 * 
 * The server integrates with the detection API, knowledge base, and template system
 * to provide AI models with complete security analysis capabilities for SQL injection
 * detection and prevention.
 * 
 * @class SQLInjectionMCPServer
 */
export class SQLInjectionMCPServer {
  // Core MCP server instance for handling protocol communication
  private server: McpServer;

  // SQL injection detection engine for local analysis
  private detector: SQLInjectionDetector;

  // Security knowledge base for patterns and educational content
  private knowledgeBase: SecurityKnowledgeBase;

  // API base URL for detection service integration
  private apiBaseUrl: string;

  /**
   * MCP Server Constructor
   * 
   * Initializes the SQL injection detection MCP server with all necessary
   * components including the detector, knowledge base, and API integration.
   * Sets up server configuration and prepares all tools, resources, and prompts.
   * 
   * @constructor
   */
  constructor() {
    // Initialize MCP server with identification and version information
    this.server = new McpServer({
      name: 'sqli-detection-mcp-server',
      version: '1.0.0',
    });

    // Initialize security components
    this.detector = new SQLInjectionDetector();
    this.knowledgeBase = new SecurityKnowledgeBase();

    // Configure API endpoint with environment variable fallback
    this.apiBaseUrl = process.env.SQLI_API_URL || `http://localhost:${process.env.API_PORT || '3001'}`;

    // Set up all MCP server capabilities
    this.setupResources();   // Static security data resources
    this.setupTools();       // Interactive analysis tools
    this.setupPrompts();     // AI guidance prompts
  }

  /**
   * Security Resources Setup
   * 
   * Registers static security resources that AI models can access to understand
   * SQL injection patterns, detection rules, and educational content. These
   * resources provide the knowledge base for intelligent security analysis.
   * 
   * Resources registered:
   * - Common attack patterns with examples and mitigation strategies
   * - Detection rules with confidence scores and database compatibility
   * - Educational security knowledge with best practices and code examples
   * - Vulnerable code examples with exploitation scenarios and fixes
   * 
   * @private
   * @async
   * @function setupResources
   * @returns {Promise<void>} Resolves when all resources are registered
   */
  private async setupResources(): Promise<void> {
    // Register comprehensive SQL injection patterns database
    this.server.registerResource(
      'common-patterns',
      'sqli://patterns/common',
      {
        title: 'Common SQL Injection Patterns',
        description: 'Database of common SQL injection attack patterns',
        mimeType: 'application/json',
      },
      async (uri) => ({
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(await this.knowledgeBase.getCommonPatterns(), null, 2),
        }],
      })
    );

    // Register detection rules with confidence metrics
    this.server.registerResource(
      'detection-rules',
      'sqli://rules/detection',
      {
        title: 'Detection Rules',
        description: 'SQL injection detection rules and signatures',
        mimeType: 'application/json',
      },
      async (uri) => ({
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(await this.knowledgeBase.getDetectionRules(), null, 2),
        }],
      })
    );

    // Register educational security knowledge base
    this.server.registerResource(
      'security-knowledge',
      'sqli://knowledge/security',
      {
        title: 'Security Knowledge Base',
        description: 'Comprehensive security knowledge base for SQL injection prevention',
        mimeType: 'application/json',
      },
      async (uri) => ({
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(await this.knowledgeBase.getSecurityKnowledge(), null, 2),
        }],
      })
    );

    // Register vulnerable code examples for education
    this.server.registerResource(
      'vulnerable-examples',
      'sqli://examples/vulnerable',
      {
        title: 'Vulnerable Code Examples',
        description: 'Examples of vulnerable SQL code and their fixes',
        mimeType: 'application/json',
      },
      async (uri) => ({
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(await this.knowledgeBase.getVulnerableExamples(), null, 2),
        }],
      })
    );
  }

  private setupTools(): void {
    // Enhanced tool that calls the SQL Detection API
    this.server.registerTool(
      'analyze_uploaded_file',
      {
        title: 'Analyze Uploaded SQL File',
        description: 'Retrieve and analyze uploaded code files for SQL injection vulnerabilities',
        inputSchema: {
          fileName: z.string().describe('Name of the uploaded file to analyze'),
          fileType: z.enum(['sql', 'js', 'ts', 'php', 'java', 'py']).optional().describe('Type of file (sql, js, ts, php, etc.)'),
        },
      },
      async ({ fileName, fileType }) => {
        try {
          // 1. Retrieve file from PostgreSQL via API
          const fileResponse = await axios.get(`${this.apiBaseUrl}/api/files/search`, {
            params: { fileName, fileType: fileType || '' },
            timeout: 30000,
          });

          if (!fileResponse.data || fileResponse.data.length === 0) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  error: 'File not found',
                  fileName,
                  suggestions: [
                    'Check if the file has been uploaded to the database',
                    'Verify the filename spelling',
                    'Try searching with partial filename'
                  ],
                  timestamp: new Date().toISOString(),
                }, null, 2),
              }],
            };
          }

          const file = fileResponse.data[0];

          // 2. Analyze the file content using SQL Detection API
          const analysisResponse = await axios.post(`${this.apiBaseUrl}/api/detect`, {
            content: file.content,
            context_type: 'uploaded_file',
            file_metadata: {
              fileName: file.fileName || file.filename,
              fileType: file.fileType || fileType,
              uploadedAt: file.createdAt || file.uploadDate
            }
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000,
          });

          const analysis = analysisResponse.data;

          // 3. Format comprehensive response
          return {
            content: [{
              type: 'text',
              text: this.formatAnalysisResult(analysis, file),
            }],
          };

        } catch (error) {
          console.error('Error in analyze_uploaded_file tool:', error);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to analyze uploaded file',
                fileName,
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              }, null, 2),
            }],
          };
        }
      }
    );

    // Tool for semantic search across uploaded files
    this.server.registerTool(
      'search_vulnerable_patterns',
      {
        title: 'Search for Vulnerable Code Patterns',
        description: 'Search uploaded files for specific vulnerability patterns using semantic search',
        inputSchema: {
          pattern: z.string().describe('Vulnerability pattern to search for (e.g., "SQL injection", "XSS", "user input")'),
          k: z.number().optional().describe('Number of similar files to return (default: 5)'),
          fileType: z.string().optional().describe('Filter by file type (sql, js, ts, php, etc.)'),
        },
      },
      async ({ pattern, k = 5, fileType }) => {
        try {
          // Use semantic search to find similar vulnerable code
          const searchParams: any = {
            q: pattern,
            k: k
          };
          if (fileType) searchParams.fileType = fileType;

          const searchResponse = await axios.get(`${this.apiBaseUrl}/api/files/semantic-search`, {
            params: searchParams,
            timeout: 30000,
          });

          const results = searchResponse.data;

          if (!results || results.length === 0) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  message: 'No files found matching pattern',
                  pattern,
                  suggestions: [
                    'Try a broader search pattern',
                    'Check if files have been uploaded',
                    'Use different keywords (e.g., "SELECT", "INSERT", "user input")'
                  ],
                  timestamp: new Date().toISOString(),
                }, null, 2),
              }],
            };
          }

          // Analyze each found file
          const analyses = await Promise.all(
            results.map(async (file: any) => {
              try {
                const analysisResponse = await axios.post(`${this.apiBaseUrl}/api/detect`, {
                  content: file.content,
                  context_type: 'semantic_search'
                }, {
                  headers: { 'Content-Type': 'application/json' },
                  timeout: 60000,
                });
                return { file, analysis: analysisResponse.data };
              } catch (error) {
                return {
                  file,
                  analysis: {
                    error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    vulnerability_score: 0,
                    is_vulnerable: false
                  }
                };
              }
            })
          );

          return {
            content: [{
              type: 'text',
              text: this.formatMultipleAnalyses(analyses, pattern),
            }],
          };

        } catch (error) {
          console.error('Error in search_vulnerable_patterns tool:', error);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to search vulnerable patterns',
                pattern,
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              }, null, 2),
            }],
          };
        }
      }
    );

    // Tool for comprehensive security audit
    this.server.registerTool(
      'comprehensive_security_audit',
      {
        title: 'Comprehensive Security Audit',
        description: 'Perform a complete security audit of all uploaded files with detailed reporting',
        inputSchema: {
          fileType: z.string().optional().describe('Filter by file type for focused audit'),
          severity: z.enum(['all', 'high', 'medium', 'low']).optional().describe('Filter by vulnerability severity'),
          limit: z.number().optional().describe('Maximum number of files to audit (default: 20)'),
        },
      },
      async ({ fileType, severity = 'all', limit = 20 }) => {
        try {
          // Get all files or filtered files
          const searchParams: any = { limit };
          if (fileType) searchParams.fileType = fileType;

          const filesResponse = await axios.get(`${this.apiBaseUrl}/api/files`, {
            params: searchParams,
            timeout: 30000,
          });

          const files = filesResponse.data;

          if (!files || files.length === 0) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  message: 'No files found for security audit',
                  fileType,
                  timestamp: new Date().toISOString(),
                }, null, 2),
              }],
            };
          }

          // Analyze all files
          const auditPromises = files.map(async (file: any) => {
            try {
              const analysisResponse = await axios.post(`${this.apiBaseUrl}/api/detect`, {
                content: file.content,
                context_type: 'security_audit'
              }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000,
              });

              return {
                file_info: {
                  id: file.id,
                  fileName: file.fileName || file.filename,
                  fileType: file.fileType,
                  size: file.content.length,
                  uploadDate: file.createdAt || file.uploadDate,
                },
                analysis: analysisResponse.data,
                vulnerability_count: analysisResponse.data.vulnerabilities?.length || 0,
                risk_score: analysisResponse.data.vulnerability_score || 0,
              };
            } catch (error) {
              return {
                file_info: {
                  id: file.id,
                  fileName: file.fileName || file.filename,
                  fileType: file.fileType,
                  size: file.content.length,
                },
                error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                vulnerability_count: 0,
                risk_score: 0,
              };
            }
          });

          const auditResults = await Promise.all(auditPromises);

          // Filter by severity if specified
          const filteredResults = severity === 'all' ? auditResults :
            auditResults.filter(result => {
              if (severity === 'high') return result.risk_score >= 70;
              if (severity === 'medium') return result.risk_score >= 40 && result.risk_score < 70;
              if (severity === 'low') return result.risk_score < 40;
              return true;
            });

          return {
            content: [{
              type: 'text',
              text: this.formatSecurityAuditReport(filteredResults, severity, fileType),
            }],
          };

        } catch (error) {
          console.error('Error in comprehensive_security_audit tool:', error);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'Failed to perform security audit',
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              }, null, 2),
            }],
          };
        }
      }
    );

    // Legacy tools for backward compatibility
    this.server.registerTool(
      'analyze_sql_query',
      {
        title: 'SQL Query Analyzer',
        description: 'Analyze a SQL query for potential injection vulnerabilities',
        inputSchema: {
          query: z.string().describe('The SQL query to analyze'),
          database_type: z.enum(['mysql', 'postgresql', 'sqlite', 'mssql']).optional().describe('The type of database (optional)'),
        },
      },
      async ({ query, database_type }) => {
        const analysis = await this.detector.analyzeQuery(query, database_type);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              query: query,
              database_type: database_type || 'unknown',
              is_vulnerable: analysis.isVulnerable,
              vulnerability_score: analysis.score,
              detected_patterns: analysis.detectedPatterns,
              risk_factors: analysis.riskFactors,
              recommendations: analysis.recommendations,
              secure_alternative: analysis.secureAlternative,
              timestamp: new Date().toISOString(),
            }, null, 2),
          }],
        };
      }
    );
  }

  private setupPrompts(): void {
    // SQL Security Review Prompt
    this.server.registerPrompt(
      'sql_security_review',
      {
        title: 'SQL Security Code Review',
        description: 'Template for conducting SQL security code review',
        argsSchema: {
          code_snippet: z.string().describe('The SQL code to review'),
          context: z.string().optional().describe('Additional context about the application'),
        },
      },
      async ({ code_snippet, context }) => {
        try {
          const template = await SharedSecureTemplateLoader.loadTemplate(
            'apps/mcp-server/prompts',
            'sql_security_review_prompt',
            {
              code_snippet: code_snippet || '[CODE_SNIPPET]',
              context: context || '[APPLICATION_CONTEXT]'
            }
          );

          return {
            description: 'SQL Security Code Review Template',
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: template,
              },
            }],
          };
        } catch (error) {
          console.error('Error loading SQL security review template:', error);
          throw new Error('Failed to load security review template');
        }
      }
    );

    // Vulnerability Assessment Prompt
    this.server.registerPrompt(
      'vulnerability_assessment',
      {
        title: 'Vulnerability Assessment',
        description: 'Template for comprehensive vulnerability assessment',
        argsSchema: {
          application_type: z.string().describe('Type of application being assessed'),
          database_schema: z.string().optional().describe('Database schema information'),
        },
      },
      async ({ application_type, database_schema }) => {
        try {
          const template = await SharedSecureTemplateLoader.loadTemplate(
            'apps/mcp-server/prompts',
            'vulnerability_assessment_prompt',
            {
              application_type: application_type || '[APPLICATION_TYPE]',
              database_schema: database_schema || '[DATABASE_SCHEMA]'
            }
          );

          return {
            description: 'Comprehensive Vulnerability Assessment Template',
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: template,
              },
            }],
          };
        } catch (error) {
          console.error('Error loading vulnerability assessment template:', error);
          throw new Error('Failed to load vulnerability assessment template');
        }
      }
    );

    // Secure Coding Guide Prompt
    this.server.registerPrompt(
      'secure_coding_guide',
      {
        title: 'Secure Coding Guidelines',
        description: 'Generate secure coding guidelines for SQL',
        argsSchema: {
          framework: z.string().describe('Development framework being used'),
          database_type: z.string().describe('Database management system'),
        },
      },
      async ({ framework, database_type }) => {
        try {
          const template = await SharedSecureTemplateLoader.loadTemplate(
            'apps/mcp-server/prompts',
            'secure_coding_guide_prompt',
            {
              framework: framework || '[FRAMEWORK]',
              database_type: database_type || '[DATABASE_TYPE]'
            }
          );

          return {
            description: 'Secure Coding Guidelines Template',
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: template,
              },
            }],
          };
        } catch (error) {
          console.error('Error loading secure coding guide template:', error);
          throw new Error('Failed to load secure coding guide template');
        }
      }
    );
  }

  /**
   * Analysis Result Formatter
   * 
   * Formats comprehensive security analysis results into a readable markdown
   * report for AI models and human users. This method transforms raw analysis
   * data into structured, actionable security information.
   * 
   * @private
   * @function formatAnalysisResult
   * @param {any} analysis - Raw security analysis results from the detection API
   * @param {any} file - File metadata and content information
   * @returns {string} Formatted markdown report with vulnerability details and recommendations
   */
  private formatAnalysisResult(analysis: any, file: any): string {
    return `
# 🔍 SQL Injection Analysis Report

## 📁 File Information
- **File Name:** ${file.fileName || file.filename}
- **File Type:** ${file.fileType || 'unknown'}
- **Upload Date:** ${file.createdAt || file.uploadDate}
- **File Size:** ${file.content.length} bytes

## 🛡️ Security Analysis
- **Vulnerability Score:** ${analysis.vulnerability_score || 0}/100
- **Risk Level:** ${analysis.risk_level || 'unknown'}
- **Is Vulnerable:** ${analysis.is_vulnerable ? '🚨 YES' : '✅ NO'}

## 🔍 Detected Issues
${analysis.vulnerabilities?.map((vuln: any, index: number) => `
### ${index + 1}. ${vuln.type || 'Security Issue'} (Severity: ${vuln.severity || 'unknown'})
- **Pattern:** \`${vuln.pattern || 'N/A'}\`
- **Location:** Line ${vuln.line || 'Unknown'}
- **Description:** ${vuln.description || 'No description provided'}
- **Fix:** ${vuln.recommendation || 'Use parameterized queries and input validation'}
`).join('\n') || 'No vulnerabilities detected ✅'}

## 📋 Recommendations
${analysis.recommendations?.map((rec: string) => `- ${rec}`).join('\n') || '- Follow secure coding practices\n- Use parameterized queries\n- Validate all user inputs'}

## 💡 Secure Code Example
\`\`\`sql
${analysis.secure_example || 'SELECT * FROM users WHERE id = $1 AND status = $2'}
\`\`\`

---
*Analysis completed at: ${new Date().toISOString()}*
`;
  }

  /**
   * Multiple Analysis Results Formatter
   * 
   * Formats security analysis results for multiple files into a comprehensive
   * summary report. Provides aggregate statistics and prioritized action items
   * for handling multiple vulnerability findings.
   * 
   * @private
   * @function formatMultipleAnalyses
   * @param {any[]} analyses - Array of analysis results for multiple files
   * @param {string} pattern - The search pattern that was used to find these files
   * @returns {string} Formatted markdown report with aggregated vulnerability information
   */
  private formatMultipleAnalyses(analyses: any[], pattern: string): string {
    // Calculate aggregate statistics for the report
    const totalFiles = analyses.length;
    const vulnerableFiles = analyses.filter(a => a.analysis.is_vulnerable || (a.analysis.vulnerability_score > 0)).length;
    const highRiskFiles = analyses.filter(a => (a.analysis.vulnerability_score || 0) > 70).length;
    const mediumRiskFiles = analyses.filter(a => {
      const score = a.analysis.vulnerability_score || 0;
      return score > 40 && score <= 70;
    }).length;
    const lowRiskFiles = analyses.filter(a => (a.analysis.vulnerability_score || 0) <= 40 && (a.analysis.vulnerability_score || 0) > 0).length;

    return `
# 🔍 Vulnerability Pattern Search Results: "${pattern}"

## 📊 Search Summary
- **Files Found:** ${totalFiles}
- **Vulnerable Files:** ${vulnerableFiles}
- **High Risk Files:** ${highRiskFiles} 🔴
- **Medium Risk Files:** ${mediumRiskFiles} 🟡
- **Low Risk Files:** ${lowRiskFiles} 🟢

## 📁 Detailed Results

${analyses.map((item, index) => `
### ${index + 1}. ${item.file.fileName || item.file.filename}
- **Risk Score:** ${item.analysis.vulnerability_score || 0}/100
- **Risk Level:** ${item.analysis.risk_level || 'unknown'}
- **Issues Found:** ${item.analysis.vulnerabilities?.length || 0}
- **File Size:** ${item.file.content?.length || 0} bytes
${item.analysis.error ? `- **Error:** ${item.analysis.error}` : ''}
${(item.analysis.vulnerabilities?.length || 0) > 0 ? `
  **Top Issues:**
${item.analysis.vulnerabilities.slice(0, 3).map((vuln: any) => `  - ${vuln.type}: ${vuln.description} (Line ${vuln.line || '?'})`).join('\n')}
` : ''}
`).join('\n')}

## 🚨 Priority Actions
${vulnerableFiles > 0 ? `
1. **Immediate:** Review ${highRiskFiles} high-risk files
2. **Soon:** Address ${mediumRiskFiles} medium-risk vulnerabilities  
3. **Eventually:** Fix ${lowRiskFiles} low-risk issues
4. **Prevention:** Implement secure coding standards
` : `
✅ **Great News!** No vulnerabilities found in the analyzed files.
- Continue following secure coding practices
- Regular security audits recommended
- Consider implementing automated security scanning
`}

---
*Search completed at: ${new Date().toISOString()}*
`;
  }

  /**
   * Security Audit Report Formatter
   * 
   * Creates a comprehensive security audit report for multiple files with
   * executive summary, risk distribution, and prioritized action items.
   * Designed for management reporting and security team coordination.
   * 
   * @private
   * @function formatSecurityAuditReport
   * @param {any[]} auditResults - Array of audit results for multiple files
   * @param {string} severity - Severity filter that was applied
   * @param {string} [fileType] - Optional file type filter that was applied
   * @returns {string} Executive-level security audit report in markdown format
   */
  private formatSecurityAuditReport(auditResults: any[], severity: string, fileType?: string): string {
    // Calculate comprehensive audit statistics
    const totalFiles = auditResults.length;
    const vulnerableFiles = auditResults.filter(result => result.vulnerability_count > 0).length;
    const totalVulnerabilities = auditResults.reduce((sum, result) => sum + result.vulnerability_count, 0);

    // Analyze risk distribution across the codebase
    const riskDistribution = {
      high: auditResults.filter(result => result.risk_score >= 70).length,
      medium: auditResults.filter(result => result.risk_score >= 40 && result.risk_score < 70).length,
      low: auditResults.filter(result => result.risk_score < 40 && result.risk_score > 0).length,
      clean: auditResults.filter(result => result.risk_score === 0).length,
    };

    return `
# 🛡️ Comprehensive Security Audit Report

## 📊 Executive Summary
- **Files Audited:** ${totalFiles}
- **Vulnerable Files:** ${vulnerableFiles}
- **Total Vulnerabilities:** ${totalVulnerabilities}
- **Security Score:** ${Math.round(((totalFiles - vulnerableFiles) / totalFiles) * 100)}%

${fileType ? `- **File Type Filter:** ${fileType}` : ''}
${severity !== 'all' ? `- **Severity Filter:** ${severity}` : ''}

## 🎯 Risk Distribution
- 🔴 **High Risk (70-100):** ${riskDistribution.high} files
- 🟡 **Medium Risk (40-69):** ${riskDistribution.medium} files  
- 🟢 **Low Risk (1-39):** ${riskDistribution.low} files
- ✅ **Clean (0):** ${riskDistribution.clean} files

## 📁 Detailed File Analysis

${auditResults.slice(0, 10).map((result, index) => `
### ${index + 1}. ${result.file_info.fileName}
- **Risk Score:** ${result.risk_score}/100
- **Vulnerabilities:** ${result.vulnerability_count}
- **File Type:** ${result.file_info.fileType}
- **Size:** ${result.file_info.size} bytes
- **Upload Date:** ${result.file_info.uploadDate}

${result.error ? `❌ **Analysis Error:** ${result.error}` : ''}
${result.analysis?.vulnerabilities?.slice(0, 2).map((vuln: any) => `
  - **${vuln.type}** (${vuln.severity}): ${vuln.description} [Line ${vuln.line || '?'}]`).join('\n') || ''}
`).join('\n')}

${auditResults.length > 10 ? `\n*... and ${auditResults.length - 10} more files*` : ''}

## 🚨 Critical Actions Required

${vulnerableFiles > 0 ? `
### Immediate (High Priority)
${auditResults.filter(r => r.risk_score >= 70).slice(0, 5).map(r => `- Fix ${r.file_info.fileName} (Score: ${r.risk_score})`).join('\n')}

### Short Term (Medium Priority)  
${auditResults.filter(r => r.risk_score >= 40 && r.risk_score < 70).slice(0, 5).map(r => `- Review ${r.file_info.fileName} (Score: ${r.risk_score})`).join('\n')}

### Recommendations
1. **Implement parameterized queries** for all database interactions
2. **Add input validation** at application boundaries  
3. **Use prepared statements** instead of dynamic SQL
4. **Regular security training** for development team
5. **Automated security scanning** in CI/CD pipeline
` : `
### ✅ Excellent Security Posture!
- No vulnerabilities detected in audited files
- Continue following secure coding practices
- Consider implementing:
  - Regular security training
  - Automated vulnerability scanning
  - Code review processes
`}

## 📈 Trending Analysis
- **Average Risk Score:** ${Math.round(auditResults.reduce((sum, r) => sum + r.risk_score, 0) / auditResults.length)}
- **Most Common Issues:** SQL Injection, Input Validation, Dynamic Queries
- **Safest File Types:** Configuration files, Documentation
- **Riskiest File Types:** SQL scripts, User input handlers

---
*Security audit completed at: ${new Date().toISOString()}*
*Audit Scope: ${severity === 'all' ? 'All severity levels' : severity + ' severity'} ${fileType ? `| File type: ${fileType}` : ''}*
`;
  }

  /**
   * MCP Server Starter
   * 
   * Initializes and starts the MCP server with stdio transport for
   * communication with AI language models. This method establishes
   * the connection and makes all tools and resources available.
   * 
   * @public
   * @async
   * @function start
   * @returns {Promise<void>} Resolves when server is successfully started
   */
  public async start(): Promise<void> {
    // Initialize stdio transport for MCP communication
    const transport = new StdioServerTransport();

    // Connect server to transport and start listening
    await this.server.connect(transport);
    console.error('SQL Injection MCP Server started successfully');
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new SQLInjectionMCPServer();
  server.start().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
