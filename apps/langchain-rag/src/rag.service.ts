import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from 'langchain/document';
import { UnifiedVectorStoreService } from './unified-vector-store.service';
import { SharedSecureTemplateLoader } from '../../shared/shared-secure-template-loader';

/**
 * RAG Response Interface
 * 
 * Standardized response format for Retrieval-Augmented Generation operations.
 * Provides comprehensive information about the AI analysis including sources,
 * metadata, and confidence scores.
 */
export interface RAGResponse {
  /** The AI-generated answer based on retrieved context */
  answer: string;
  /** Source documents used for context with metadata and scores */
  sources: Array<{
    content: string;
    metadata: Record<string, any>;
    score?: number;
  }>;
  /** Original user query that was processed */
  query: string;
  /** Response generation timestamp */
  timestamp: string;
}

/**
 * Query Analysis Request Interface
 * 
 * Request parameters for SQL query analysis using RAG methodology.
 * Allows fine-tuning of context retrieval and response generation.
 */
export interface QueryAnalysisRequest {
  /** SQL query or security question to analyze */
  query: string;
  /** Maximum number of source documents to retrieve (default: 5) */
  max_sources?: number;
  /** Whether to include relevance scores in response */
  include_scores?: boolean;
  /** Type of context to retrieve for analysis */
  context_type?: 'patterns' | 'knowledge' | 'examples' | 'rules' | 'all';
}

/**
 * Retrieval-Augmented Generation (RAG) Service
 * 
 * Advanced AI service that combines vector database retrieval with large language
 * model generation for intelligent SQL security analysis. This service provides
 * context-aware responses by retrieving relevant security patterns and knowledge
 * before generating AI responses.
 * 
 * Key Capabilities:
 * - SQL query vulnerability analysis with context
 * - Security advice generation based on knowledge base
 * - Vulnerability explanation with relevant examples
 * - Multi-modal context retrieval and processing
 * - Fallback prompt management for reliability
 * 
 * Architecture:
 * - LangChain integration for AI orchestration
 * - OpenAI GPT models for text generation
 * - Vector store for semantic similarity search
 * - Secure template loading for prompt management
 * - Comprehensive error handling and logging
 * 
 * @class RagService
 * @injectable
 */
@Injectable()
export class RagService {
  /** Logger instance for service monitoring and debugging */
  private readonly logger = new Logger(RagService.name);

  /** OpenAI language model instance for text generation */
  private llm: ChatOpenAI;

  /** Specialized prompt for SQL security analysis */
  private sqlAnalysisPrompt: PromptTemplate;

  /** Prompt template for security advice generation */
  private securityAdvicePrompt: PromptTemplate;

  /** Prompt template for vulnerability explanations */
  private vulnerabilityExplanationPrompt: PromptTemplate;

  /**
   * Service Constructor
   * 
   * Initializes the RAG service with language model configuration and prompt
   * templates. Sets up OpenAI client with environment-based configuration
   * and loads secure prompt templates for various analysis types.
   * 
   * @param {UnifiedVectorStoreService} vectorStoreService - Vector database service for context retrieval
   */
  constructor(private vectorStoreService: UnifiedVectorStoreService) {
    // Initialize OpenAI language model with environment configuration
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY || 'demo-key',
      modelName: process.env.LLM_MODEL || 'gpt-4.1',
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.2'),
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048'),
    });

    // Initialize minimal prompts first for immediate service availability
    this.initializeMinimalPrompts();

    // Load secure templates asynchronously to replace minimal prompts
    this.initializeFallbackPrompts().catch(error => {
      this.logger.error(`Failed to initialize fallback templates: ${error.message}`);
    });
  }

  /**
   * Secure Template Initializer
   * 
   * Loads prompt templates from secure template files for production use.
   * This method attempts to load specialized prompts for different analysis
   * types and falls back to minimal prompts if loading fails.
   * 
   * @async
   * @private
   * @method initializeFallbackPrompts
   */
  private async initializeFallbackPrompts() {
    this.logger.log('Loading prompt templates from secure template files');

    try {
      // Load SQL analysis template from secure file system
      const sqlAnalysisTemplate = await SharedSecureTemplateLoader.loadTemplate(
        'apps/langchain-rag/prompts',
        'sql_analysis_prompt',
        {}
      );
      this.sqlAnalysisPrompt = PromptTemplate.fromTemplate(sqlAnalysisTemplate);

      // Load security advice template for guidance generation
      const securityAdviceTemplate = await SharedSecureTemplateLoader.loadTemplate(
        'apps/langchain-rag/prompts',
        'security_advice_prompt',
        {}
      );
      this.securityAdvicePrompt = PromptTemplate.fromTemplate(securityAdviceTemplate);

      // Load vulnerability explanation template for educational content
      const vulnerabilityExplanationTemplate = await SharedSecureTemplateLoader.loadTemplate(
        'apps/langchain-rag/prompts',
        'vulnerability_explanation_prompt',
        {}
      );
      this.vulnerabilityExplanationPrompt = PromptTemplate.fromTemplate(vulnerabilityExplanationTemplate);

      this.logger.log('All prompt templates loaded successfully from secure files');
    } catch (error) {
      this.logger.error(`Failed to load templates from files: ${error.message}`);
      // Keep minimal prompts as fallback (already set in constructor)
    }
  }

  /**
   * Minimal Prompt Initializer
   * 
   * Sets up basic prompt templates as a last resort fallback when secure
   * template loading fails. These minimal prompts ensure service availability
   * even in degraded scenarios.
   * 
   * @private
   * @method initializeMinimalPrompts
   */
  private initializeMinimalPrompts() {
    this.logger.warn('Using minimal hardcoded prompts as absolute last resort');

    // Basic SQL analysis prompt template
    this.sqlAnalysisPrompt = PromptTemplate.fromTemplate(`
Analyze SQL query for security issues.
Context: {{context}}
Query: {{query}}
Analysis:`);

    // Basic security advice prompt template
    this.securityAdvicePrompt = PromptTemplate.fromTemplate(`
Provide security advice.
Context: {{context}}
Question: {{query}}
Advice:`);

    // Basic vulnerability explanation prompt template
    this.vulnerabilityExplanationPrompt = PromptTemplate.fromTemplate(`
Explain security concept.
Context: {{context}}
Concept: {{query}}
Explanation:`);
  }

  /**
   * SQL Query Security Analyzer
   * 
   * Performs comprehensive security analysis of SQL queries using RAG methodology.
   * Retrieves relevant security patterns and knowledge from the vector database
   * and combines them with AI analysis for detailed vulnerability assessment.
   * 
   * Process Flow:
   * 1. Retrieve relevant security context from vector store
   * 2. Combine context with specialized SQL analysis prompt
   * 3. Generate AI-powered security analysis
   * 4. Format response with sources and metadata
   * 
   * @async
   * @method analyzeSQLQuery
   * @param {QueryAnalysisRequest} request - Analysis request with query and parameters
   * @returns {Promise<RAGResponse>} Comprehensive analysis with sources and recommendations
   */
  async analyzeSQLQuery(request: QueryAnalysisRequest): Promise<RAGResponse> {
    try {
      // Log analysis request with truncated query for security
      this.logger.log(`Analyzing SQL query: ${request.query.substring(0, 50)}...`);

      // Retrieve relevant context from vector database
      const relevantDocs = await this.getRelevantContext(
        request.query,
        request.max_sources || 5,
        request.context_type
      );

      // Combine retrieved documents into coherent context
      const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');

      // Create the LangChain analysis chain with prompt and model
      const chain = RunnableSequence.from([
        this.sqlAnalysisPrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      // Generate AI-powered analysis using retrieved context
      const answer = await chain.invoke({
        context,
        query: request.query,
      });

      // Format source documents for response
      const sources = relevantDocs.map(doc => ({
        content: doc.pageContent.substring(0, 200) + '...',
        metadata: doc.metadata,
      }));

      return {
        answer,
        sources,
        query: request.query,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Log analysis errors and return error response
      this.logger.error(`Error analyzing SQL query: ${error.message}`);
      return this.getErrorResponse(request.query, error.message);
    }
  }

  /**
   * Security Advice Generator
   * 
   * Provides comprehensive security advice and best practices based on user
   * queries and relevant security knowledge. Uses RAG to retrieve contextual
   * information and generate personalized security recommendations.
   * 
   * @async
   * @method getSecurityAdvice
   * @param {QueryAnalysisRequest} request - Security advice request with query parameters
   * @returns {Promise<RAGResponse>} Contextual security advice with supporting sources
   */
  async getSecurityAdvice(request: QueryAnalysisRequest): Promise<RAGResponse> {
    try {
      // Log security advice request with truncated query
      this.logger.log(`Providing security advice for: ${request.query.substring(0, 50)}...`);

      // Retrieve relevant security knowledge and best practices
      const relevantDocs = await this.getRelevantContext(
        request.query,
        request.max_sources || 5,
        request.context_type
      );

      // Combine retrieved knowledge into coherent context
      const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');

      // Create LangChain advice generation chain
      const chain = RunnableSequence.from([
        this.securityAdvicePrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      // Generate contextual security advice
      const answer = await chain.invoke({
        context,
        query: request.query,
      });

      // Format supporting sources for transparency
      const sources = relevantDocs.map(doc => ({
        content: doc.pageContent.substring(0, 200) + '...',
        metadata: doc.metadata,
      }));

      return {
        answer,
        sources,
        query: request.query,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Log advice generation errors
      this.logger.error(`Error providing security advice: ${error.message}`);
      return this.getErrorResponse(request.query, error.message);
    }
  }

  /**
   * Vulnerability Explanation Service
   * 
   * Provides detailed explanations of security vulnerabilities, attack vectors,
   * and mitigation strategies. Uses contextual knowledge retrieval to offer
   * comprehensive educational content about security concepts.
   * 
   * @async
   * @method explainVulnerability
   * @param {QueryAnalysisRequest} request - Vulnerability explanation request
   * @returns {Promise<RAGResponse>} Detailed vulnerability explanation with examples
   */
  async explainVulnerability(request: QueryAnalysisRequest): Promise<RAGResponse> {
    try {
      // Log vulnerability explanation request
      this.logger.log(`Explaining vulnerability: ${request.query.substring(0, 50)}...`);

      // Retrieve relevant vulnerability patterns and educational content
      const relevantDocs = await this.getRelevantContext(
        request.query,
        request.max_sources || 5,
        request.context_type
      );

      // Combine educational content into comprehensive context
      const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');

      // Create explanation generation chain
      const chain = RunnableSequence.from([
        this.vulnerabilityExplanationPrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      // Generate detailed vulnerability explanation
      const answer = await chain.invoke({
        context,
        query: request.query,
      });

      // Format educational sources for reference
      const sources = relevantDocs.map(doc => ({
        content: doc.pageContent.substring(0, 200) + '...',
        metadata: doc.metadata,
      }));

      return {
        answer,
        sources,
        query: request.query,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Log explanation generation errors
      this.logger.error(`Error explaining vulnerability: ${error.message}`);
      return this.getErrorResponse(request.query, error.message);
    }
  }

  /**
   * Semantic Search Service
   * 
   * Performs vector-based semantic similarity search across the security
   * knowledge base. This method enables direct access to the retrieval
   * capabilities for custom search operations and debugging.
   * 
   * @async
   * @method semanticSearch
   * @param {string} query - Search query for semantic matching
   * @param {number} [maxResults=5] - Maximum number of results to return
   * @param {boolean} [includeScores=false] - Whether to include similarity scores
   * @returns {Promise<Object>} Search results with documents, metadata, and scores
   */
  async semanticSearch(
    query: string,
    maxResults: number = 5,
    includeScores: boolean = false
  ): Promise<{
    results: Array<{
      content: string;
      metadata: Record<string, any>;
      score?: number;
    }>;
    query: string;
    count: number;
  }> {
    try {
      // Log semantic search request
      this.logger.log(`Performing semantic search: ${query.substring(0, 50)}...`);

      // Execute vector similarity search against knowledge base
      const searchResults = await this.vectorStoreService.similaritySearch(query, {
        k: maxResults,
        includeScores,
        contextType: 'all'
      });

      // Format search results for consistent response structure
      const results = searchResults.map(result => ({
        content: result.document.pageContent,
        metadata: result.document.metadata,
        score: result.score
      }));

      return {
        results,
        query,
        count: results.length,
      };
    } catch (error) {
      // Log search errors and return empty results
      this.logger.error(`Error in semantic search: ${error.message}`);
      return {
        results: [],
        query,
        count: 0,
      };
    }
  }

  /**
   * Context Retrieval Helper
   * 
   * Internal method for retrieving relevant context documents from the vector
   * database based on query and context type. This method enhances search
   * queries and filters results for optimal context retrieval.
   * 
   * @async
   * @private
   * @method getRelevantContext
   * @param {string} query - Original user query for context retrieval
   * @param {number} maxSources - Maximum number of context documents to retrieve
   * @param {string} [contextType] - Specific context type filter
   * @returns {Promise<Document[]>} Relevant context documents for RAG processing
   */
  private async getRelevantContext(
    query: string,
    maxSources: number, // k value
    contextType?: string
  ): Promise<Document[]> {
    // Start with the original query
    let searchQuery = query;

    // Enhance search query with context type for better relevance
    if (contextType && contextType !== 'all') {
      searchQuery = `${contextType} ${query}`;
    }

    // Execute similarity search against vector database
    const searchResults = await this.vectorStoreService.similaritySearch(searchQuery, {
      k: maxSources,
      contextType: contextType as any
    });

    // Convert search results to LangChain Document format
    const documents = searchResults.map(result => result.document);

    // Apply additional filtering based on context type
    if (contextType && contextType !== 'all') {
      return documents.filter(doc =>
        doc.metadata.type === contextType ||
        doc.pageContent.toLowerCase().includes(contextType)
      );
    }

    return documents;
  }

  /**
   * Error Response Generator
   * 
   * Creates standardized error responses for failed RAG operations.
   * Ensures consistent error handling and user-friendly error messages
   * while maintaining response structure compatibility.
   * 
   * @private
   * @method getErrorResponse
   * @param {string} query - Original query that caused the error
   * @param {string} errorMessage - Technical error message for logging
   * @returns {RAGResponse} Standardized error response with user-friendly message
   */
  private getErrorResponse(query: string, errorMessage: string): RAGResponse {
    return {
      answer: `I apologize, but I encountered an error while processing your query. Error: ${errorMessage}. Please try again or rephrase your question.`,
      sources: [],
      query,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Service Status Monitor
   * 
   * Provides comprehensive status information about the RAG service including
   * vector store health, model configuration, and operational metrics.
   * This method is essential for service monitoring and debugging.
   * 
   * @async
   * @method getServiceStatus
   * @returns {Promise<Object>} Service status with health and configuration information
   */
  async getServiceStatus(): Promise<{
    status: string;
    vector_store_documents: number;
    llm_model: string;
    embeddings_model: string;
    last_updated: string;
  }> {
    try {
      // Get vector store health and document count
      const vectorStoreStatus = await this.vectorStoreService.getServiceStatus();

      return {
        status: vectorStoreStatus.status,
        vector_store_documents: vectorStoreStatus.total_documents,
        llm_model: 'gpt-4.1',
        embeddings_model: 'text-embedding-3-large',
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      // Log status check errors and return degraded status
      this.logger.error(`Error getting service status: ${error.message}`);
      return {
        status: 'error',
        vector_store_documents: 0,
        llm_model: 'gpt-4.1',
        embeddings_model: 'text-embedding-3-large',
        last_updated: new Date().toISOString(),
      };
    }
  }
}
