import { SecureServiceClient, RagServiceClient, AnalysisRequest, ServiceResponse } from './service-client';

/**
 * MCP Tool Response Interface (compatible with MCP SDK)
 */
export interface MCPToolResponse {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    [key: string]: unknown; // Index signature to satisfy MCP SDK requirements
}

/**
 * Analysis Result Interface
 */
export interface AnalysisResult {
    isVulnerable: boolean;
    confidence: number;
    source: 'static' | 'rag' | 'combined';
    staticAnalysis?: any;
    ragAnalysis?: any;
    recommendations: string[];
    timestamp: string;
}

/**
 * MCP Analysis Orchestrator
 * 
 * Intelligent routing and orchestration service for SQL injection detection.
 * Implements a two-tier analysis approach:
 * 1. Fast static analysis first (sub-100ms)
 * 2. Deep AI analysis for complex cases (sub-3s)
 * 
 * This service acts as the brain of the MCP server, making intelligent
 * decisions about when to use static vs AI analysis based on confidence levels.
 */
export class MCPAnalysisOrchestrator {
    // Remove NestJS Logger to prevent stdout pollution
    // private readonly logger = new Logger(MCPAnalysisOrchestrator.name);
    private staticApiClient: SecureServiceClient;
    private ragServiceClient: RagServiceClient;

    // Configuration thresholds
    private readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
    private readonly LOW_CONFIDENCE_THRESHOLD = 0.3;
    private readonly STATIC_API_TIMEOUT = 5000;
    private readonly RAG_SERVICE_TIMEOUT = 30000;

    constructor() {
        // Initialize service clients with configuration
        const staticApiConfig = {
            baseUrl: process.env.SQLI_API_URL || 'http://localhost:3001',
            timeout: this.STATIC_API_TIMEOUT,
            retries: 2,
            apiKey: process.env.STATIC_API_KEY
        };

        const ragServiceConfig = {
            baseUrl: process.env.RAG_SERVICE_URL || 'http://localhost:3002',
            timeout: this.RAG_SERVICE_TIMEOUT,
            retries: 2,
            apiKey: process.env.RAG_API_KEY
        };

        this.staticApiClient = new SecureServiceClient(staticApiConfig);
        this.ragServiceClient = new RagServiceClient(ragServiceConfig);

        // Use stderr for MCP server logging to avoid breaking JSON-RPC protocol
        console.error('MCP Analysis Orchestrator initialized');
    }

    /**
     * Intelligent SQL Query Analysis
     * 
     * Implements the core logic for routing analysis requests:
     * 1. Always try static analysis first (fast)
     * 2. If high confidence, return static result
     * 3. If low confidence or vulnerable, enhance with RAG
     * 4. Combine results for comprehensive analysis
     */
    async analyzeQuery(query: string, databaseType?: string): Promise<MCPToolResponse> {
        const startTime = Date.now();
        console.error(`🔍 Starting analysis for query: ${query.substring(0, 50)}...`);

        try {
            // Step 1: Fast static analysis
            const staticResult = await this.performStaticAnalysis(query, databaseType);
            const staticTime = Date.now() - startTime;

            console.error(`⚡ Static analysis completed in ${staticTime}ms`);

            // Step 2: Determine if RAG analysis is needed
            const needsRagAnalysis = this.shouldUseRagAnalysis(staticResult);

            if (!needsRagAnalysis) {
                console.error(`✅ High confidence static result, skipping RAG analysis`);
                return this.formatStaticResponse(staticResult, staticTime);
            }

            // Step 3: Enhance with RAG analysis
            console.error(`🤖 Performing RAG analysis for deeper insights`);
            const ragResult = await this.performRagAnalysis(query, staticResult, databaseType);
            const totalTime = Date.now() - startTime;

            console.error(`✅ Combined analysis completed in ${totalTime}ms`);

            // Step 4: Combine and return results
            return this.formatCombinedResponse(staticResult, ragResult, totalTime);

        } catch (error) {
            console.error(`❌ Analysis failed: ${error.message}`);
            return this.formatErrorResponse(error, Date.now() - startTime);
        }
    }

    /**
     * Comprehensive Security Scan
     * 
     * Performs multi-vector security analysis using both services
     */
    async performSecurityScan(payload: string, scanType = 'comprehensive'): Promise<MCPToolResponse> {
        const startTime = Date.now();
        console.error(`🛡️ Starting security scan: ${scanType}`);

        try {
            // Run both analyses in parallel for comprehensive scanning
            const [staticResult, ragResult] = await Promise.allSettled([
                this.staticApiClient.performSecurityScan({
                    content: payload,
                    context_type: 'security_scan'
                }),
                this.ragServiceClient.performAnalysis({
                    query: payload,
                    context_type: 'security_scan',
                    use_ai: true
                })
            ]);

            const totalTime = Date.now() - startTime;

            return this.formatSecurityScanResponse(
                staticResult.status === 'fulfilled' ? staticResult.value : null,
                ragResult.status === 'fulfilled' ? ragResult.value : null,
                totalTime
            );

        } catch (error) {
            console.error(`❌ Security scan failed: ${error.message}`);
            return this.formatErrorResponse(error, Date.now() - startTime);
        }
    }

    /**
     * Knowledge Base Search
     * 
     * Routes knowledge base queries to the appropriate service
     */
    async searchKnowledgeBase(query: string, contextType = 'all'): Promise<MCPToolResponse> {
        const startTime = Date.now();
        console.error(`📚 Searching knowledge base: ${query.substring(0, 30)}...`);

        try {
            // For knowledge searches, prefer RAG service but fallback to static
            let result = await this.ragServiceClient.queryKnowledgeBase({
                query,
                context_type: contextType
            });

            // Fallback to static API if RAG fails
            if (result.status === 'error') {
                console.error(`RAG search failed, falling back to static API`);
                result = await this.staticApiClient.analyzeQuery({
                    query: query,
                    context_type: 'security_knowledge'
                });
            }

            const totalTime = Date.now() - startTime;
            return this.formatKnowledgeResponse(result, totalTime);

        } catch (error) {
            console.error(`❌ Knowledge search failed: ${error.message}`);
            return this.formatErrorResponse(error, Date.now() - startTime);
        }
    }

    /**
     * Pattern Similarity Search
     * 
     * Find similar attack patterns using vector search
     */
    async searchSimilarPatterns(pattern: string, k = 5): Promise<MCPToolResponse> {
        const startTime = Date.now();
        console.error(`🔎 Searching for patterns similar to: ${pattern.substring(0, 30)}...`);

        try {
            const result = await this.ragServiceClient.searchSimilarPatterns({ pattern, max_results: k });
            const totalTime = Date.now() - startTime;

            return this.formatPatternSearchResponse(result, totalTime);

        } catch (error) {
            console.error(`❌ Pattern search failed: ${error.message}`);
            return this.formatErrorResponse(error, Date.now() - startTime);
        }
    }

    /**
     * File Upload and Analysis
     * 
     * Handles file processing through the RAG service
     */
    async processUploadedFile(fileName: string, content: string, fileType: string): Promise<MCPToolResponse> {
        const startTime = Date.now();
        console.error(`📁 Processing uploaded file: ${fileName}`);

        try {
            // Upload to RAG service for processing
            const uploadResult = await this.ragServiceClient.uploadFile({
                fileName,
                content,
                fileType
            });

            if (uploadResult.status === 'error') {
                throw new Error(`File upload failed: ${uploadResult.error}`);
            }

            // Analyze the uploaded content
            const analysisResult = await this.staticApiClient.analyzeQuery({
                query: content,
                context_type: 'uploaded_file'
            });

            const totalTime = Date.now() - startTime;
            return this.formatFileAnalysisResponse(uploadResult, analysisResult, totalTime);

        } catch (error) {
            console.error(`❌ File processing failed: ${error.message}`);
            return this.formatErrorResponse(error, Date.now() - startTime);
        }
    }

    /**
     * Health Check for All Services
     */
    async checkServicesHealth(): Promise<MCPToolResponse> {
        console.error(`🏥 Checking services health`);

        try {
            const [staticHealth, ragHealth] = await Promise.allSettled([
                this.staticApiClient.healthCheck(),
                this.ragServiceClient.healthCheck()
            ]);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        services: {
                            static_api: {
                                status: staticHealth.status === 'fulfilled' && staticHealth.value.status === 'success' ? 'healthy' : 'unhealthy',
                                response_time: staticHealth.status === 'fulfilled' ? 'OK' : 'ERROR'
                            },
                            rag_service: {
                                status: ragHealth.status === 'fulfilled' && ragHealth.value.status === 'success' ? 'healthy' : 'unhealthy',
                                response_time: ragHealth.status === 'fulfilled' ? 'OK' : 'ERROR'
                            }
                        },
                        overall_status:
                            staticHealth.status === 'fulfilled' && ragHealth.status === 'fulfilled' ? 'healthy' : 'degraded',
                        timestamp: new Date().toISOString()
                    }, null, 2)
                }]
            };

        } catch (error) {
            return this.formatErrorResponse(error, 0);
        }
    }

    // Private helper methods

    private async performStaticAnalysis(query: string, databaseType?: string): Promise<ServiceResponse> {
        return this.staticApiClient.analyzeQuery({
            query,
            context_type: 'query_analysis',
            ...(databaseType && { database_type: databaseType })
        });
    }

    private async performRagAnalysis(query: string, staticResult: ServiceResponse, databaseType?: string): Promise<ServiceResponse> {
        return this.ragServiceClient.performAnalysis({
            query,
            context_type: 'enhanced_analysis',
            use_ai: true,
            ...(databaseType && { database_type: databaseType })
        });
    }

    private shouldUseRagAnalysis(staticResult: ServiceResponse): boolean {
        if (staticResult.status === 'error') return true;

        const data = staticResult.data;
        if (!data) return true;

        // Use RAG if:
        // 1. Static analysis found vulnerabilities (need detailed explanation)
        // 2. Confidence is below threshold (need second opinion)
        // 3. Complex patterns detected (need AI interpretation)

        const isVulnerable = data.isVulnerable || data.is_vulnerable;
        const confidence = data.confidence || data.vulnerability_score / 100 || 0;
        const hasComplexPatterns = data.detectedPatterns?.length > 2 || data.detected_patterns?.length > 2;

        return isVulnerable || confidence < this.HIGH_CONFIDENCE_THRESHOLD || hasComplexPatterns;
    }

    private formatStaticResponse(result: ServiceResponse, executionTime: number): MCPToolResponse {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    analysis_type: 'static',
                    execution_time_ms: executionTime,
                    result: result.data || result,
                    confidence: result.data?.confidence || result.data?.vulnerability_score || 0,
                    source: 'static_api',
                    timestamp: new Date().toISOString()
                }, null, 2)
            }]
        };
    }

    private formatCombinedResponse(staticResult: ServiceResponse, ragResult: ServiceResponse, executionTime: number): MCPToolResponse {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    analysis_type: 'combined',
                    execution_time_ms: executionTime,
                    static_analysis: staticResult.data || staticResult,
                    rag_analysis: ragResult.data || ragResult,
                    confidence: Math.max(
                        staticResult.data?.confidence || 0,
                        ragResult.data?.confidence || 0
                    ),
                    recommendations: [
                        ...(staticResult.data?.recommendations || []),
                        ...(ragResult.data?.recommendations || [])
                    ],
                    source: 'combined',
                    timestamp: new Date().toISOString()
                }, null, 2)
            }]
        };
    }

    private formatSecurityScanResponse(staticResult: ServiceResponse | null, ragResult: ServiceResponse | null, executionTime: number): MCPToolResponse {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    scan_type: 'comprehensive_security',
                    execution_time_ms: executionTime,
                    static_scan: staticResult?.data || staticResult,
                    rag_scan: ragResult?.data || ragResult,
                    overall_risk: this.calculateOverallRisk(staticResult, ragResult),
                    timestamp: new Date().toISOString()
                }, null, 2)
            }]
        };
    }

    private formatKnowledgeResponse(result: ServiceResponse, executionTime: number): MCPToolResponse {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    search_type: 'knowledge_base',
                    execution_time_ms: executionTime,
                    results: result.data || result,
                    source: 'knowledge_base',
                    timestamp: new Date().toISOString()
                }, null, 2)
            }]
        };
    }

    private formatPatternSearchResponse(result: ServiceResponse, executionTime: number): MCPToolResponse {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    search_type: 'pattern_similarity',
                    execution_time_ms: executionTime,
                    similar_patterns: result.data || result,
                    source: 'vector_search',
                    timestamp: new Date().toISOString()
                }, null, 2)
            }]
        };
    }

    private formatFileAnalysisResponse(uploadResult: ServiceResponse, analysisResult: ServiceResponse, executionTime: number): MCPToolResponse {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    process_type: 'file_analysis',
                    execution_time_ms: executionTime,
                    upload_result: uploadResult.data || uploadResult,
                    analysis_result: analysisResult.data || analysisResult,
                    source: 'file_processing',
                    timestamp: new Date().toISOString()
                }, null, 2)
            }]
        };
    }

    private formatErrorResponse(error: any, executionTime: number): MCPToolResponse {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    status: 'error',
                    error: error.message || 'Unknown error occurred',
                    execution_time_ms: executionTime,
                    timestamp: new Date().toISOString()
                }, null, 2)
            }]
        };
    }

    private calculateOverallRisk(staticResult: ServiceResponse | null, ragResult: ServiceResponse | null): string {
        const staticRisk = staticResult?.data?.risk_score || staticResult?.data?.vulnerability_score || 0;
        const ragRisk = ragResult?.data?.risk_score || ragResult?.data?.vulnerability_score || 0;

        const maxRisk = Math.max(staticRisk, ragRisk);

        if (maxRisk >= 70) return 'HIGH';
        if (maxRisk >= 40) return 'MEDIUM';
        return 'LOW';
    }
}
