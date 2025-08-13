import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { SQLInjectionDetector } from '../shared/sql-injection-detector';
import { SecurityKnowledgeBase } from '../shared/security-knowledge-base';
import { SharedSecureTemplateLoader } from '../shared/shared-secure-template-loader';
import { MCPAnalysisOrchestrator } from './src/services/analysis-orchestrator';
import { SecureServiceClient, RagServiceClient } from './src/services/service-client';

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

  // Analysis orchestrator for intelligent service routing
  private orchestrator: MCPAnalysisOrchestrator;

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
    this.orchestrator = new MCPAnalysisOrchestrator();

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
    // Intelligent SQL Query Analyzer - Routes between Static API and RAG service
    this.server.registerTool(
      'analyze_sql_query',
      {
        title: 'Intelligent SQL Query Analyzer',
        description: 'Analyze SQL queries using intelligent routing between static analysis and AI-powered deep analysis',
        inputSchema: {
          query: z.string().describe('The SQL query to analyze'),
          database_type: z.enum(['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle']).optional().describe('Database type for context-specific analysis'),
        },
      },
      async ({ query, database_type }) => {
        return this.orchestrator.analyzeQuery(query, database_type);
      }
    );

    // Comprehensive Security Scanner
    this.server.registerTool(
      'security_scan',
      {
        title: 'Multi-Vector Security Scanner',
        description: 'Perform comprehensive security scanning for SQL injection, XSS, and input validation vulnerabilities',
        inputSchema: {
          payload: z.string().describe('The input payload to scan for vulnerabilities'),
          scan_type: z.enum(['sql_injection', 'xss', 'input_validation', 'comprehensive']).optional().describe('Type of security scan to perform'),
        },
      },
      async ({ payload, scan_type = 'comprehensive' }) => {
        return this.orchestrator.performSecurityScan(payload, scan_type);
      }
    );

    // Knowledge Base Search
    this.server.registerTool(
      'search_knowledge_base',
      {
        title: 'Security Knowledge Base Search',
        description: 'Search the security knowledge base for patterns, examples, and best practices',
        inputSchema: {
          query: z.string().describe('Search query for security knowledge'),
          context_type: z.enum(['patterns', 'knowledge', 'examples', 'rules', 'all']).optional().describe('Type of knowledge to search for'),
        },
      },
      async ({ query, context_type = 'all' }) => {
        return this.orchestrator.searchKnowledgeBase(query, context_type);
      }
    );

    // Pattern Similarity Search
    this.server.registerTool(
      'find_similar_patterns',
      {
        title: 'Attack Pattern Similarity Search',
        description: 'Find attack patterns similar to the provided input using vector similarity search',
        inputSchema: {
          pattern: z.string().describe('Attack pattern or code snippet to find similarities for'),
          max_results: z.number().optional().describe('Maximum number of similar patterns to return (default: 5)'),
        },
      },
      async ({ pattern, max_results = 5 }) => {
        return this.orchestrator.searchSimilarPatterns(pattern, max_results);
      }
    );

    // File Upload and Processing
    this.server.registerTool(
      'upload_and_analyze_file',
      {
        title: 'File Upload and Security Analysis',
        description: 'Upload a file to the RAG service and perform comprehensive security analysis',
        inputSchema: {
          fileName: z.string().describe('Name of the file to upload'),
          content: z.string().describe('File content to analyze'),
          fileType: z.enum(['sql', 'js', 'ts', 'php', 'java', 'py', 'cpp', 'rb', 'go']).describe('Programming language or file type'),
        },
      },
      async ({ fileName, content, fileType }) => {
        return this.orchestrator.processUploadedFile(fileName, content, fileType);
      }
    );

    // Service Health Check
    this.server.registerTool(
      'health_check',
      {
        title: 'Services Health Check',
        description: 'Check the health and connectivity of all backend services',
        inputSchema: {},
      },
      async () => {
        return this.orchestrator.checkServicesHealth();
      }
    );

    // Legacy compatibility tool - Simple local analysis
    this.server.registerTool(
      'local_analyze_query',
      {
        title: 'Local SQL Analysis (Legacy)',
        description: 'Perform basic SQL injection analysis using local patterns only',
        inputSchema: {
          query: z.string().describe('The SQL query to analyze locally'),
          database_type: z.enum(['mysql', 'postgresql', 'sqlite', 'mssql']).optional().describe('Database type'),
        },
      },
      async ({ query, database_type }) => {
        try {
          const analysis = await this.detector.analyzeQuery(query, database_type);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                analysis_type: 'local_only',
                query: query,
                database_type: database_type || 'unknown',
                is_vulnerable: analysis.isVulnerable,
                vulnerability_score: analysis.score,
                detected_patterns: analysis.detectedPatterns,
                risk_factors: analysis.riskFactors,
                recommendations: analysis.recommendations,
                secure_alternative: analysis.secureAlternative,
                source: 'local_detector',
                timestamp: new Date().toISOString(),
              }, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error: `Local analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date().toISOString(),
              }, null, 2),
            }],
          };
        }
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
