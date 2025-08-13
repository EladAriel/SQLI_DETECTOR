import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Service Configuration Interface
 */
export interface ServiceConfig {
    baseUrl: string;
    timeout?: number;
    retries?: number;
    apiKey?: string;
}

/**
 * Service Response Interface
 */
export interface ServiceResponse<T = any> {
    status: 'success' | 'error';
    data?: T;
    error?: string;
    timestamp: string;
    response_time?: number;
}

/**
 * Analysis Request Interface
 */
export interface AnalysisRequest {
    query?: string;
    payload?: string;
    content?: string;
    database_type?: string;
    scan_type?: string;
    context?: any;
    context_type?: string;
    max_sources?: number;
    fileName?: string;
    fileType?: string;
    metadata?: any;
    pattern?: string;
    k?: number;
    use_ai?: boolean;
}

/**
 * Secure Service Client
 * 
 * Provides secure, reliable communication between microservices with:
 * - Authentication via API keys
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 * - Request/response logging
 * - Timeout management
 */
export class SecureServiceClient {
    protected logger: Console;
    private readonly client: AxiosInstance;
    private readonly config: ServiceConfig;

    constructor(config: ServiceConfig) {
        this.config = {
            timeout: 10000,
            retries: 3,
            ...config
        };

        // Initialize logger
        this.logger = console;

        // Initialize Axios client with base configuration
        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MCP-Server/1.0.0',
                ...(this.config.apiKey && {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'X-API-Key': this.config.apiKey
                })
            }
        });

        // Add request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                this.logger.log(`🚀 Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                this.logger.error(`❌ Request Error: ${error.message}`);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for logging and error handling
        this.client.interceptors.response.use(
            (response) => {
                this.logger.log(`✅ Response: ${response.status} from ${response.config.url}`);
                return response;
            },
            (error) => {
                this.logger.error(`❌ Response Error: ${error.response?.status} ${error.message}`);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Generic API request with retry logic
     */
    protected async makeRequest<T>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        data?: any,
        attempt = 1
    ): Promise<ServiceResponse<T>> {
        try {
            const response: AxiosResponse<T> = await this.client.request({
                method,
                url: endpoint,
                data,
            });

            return {
                status: 'success',
                data: response.data,
                timestamp: new Date().toISOString(),
                response_time: response.headers['x-response-time']
            };

        } catch (error: any) {
            this.logger.error(`Attempt ${attempt} failed for ${method} ${endpoint}: ${error.message}`);

            if (attempt < this.config.retries! && this.shouldRetry(error)) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                await this.delay(delay);
                return this.makeRequest(method, endpoint, data, attempt + 1);
            }

            return {
                status: 'error',
                error: error.response?.statusText || error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Determine if request should be retried
     */
    private shouldRetry(error: any): boolean {
        if (!error.response) return true; // Network errors
        const status = error.response.status;
        return status >= 500 || status === 429; // Server errors or rate limiting
    }

    /**
     * Delay utility for retry logic
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Health check endpoint
     */
    async healthCheck(): Promise<ServiceResponse<{ status: string }>> {
        return this.makeRequest('GET', '/api/v1/health');
    }

    /**
     * Query analysis via Static API
     */
    async analyzeQuery(request: AnalysisRequest): Promise<ServiceResponse> {
        this.logger.log(`Analyzing query with Static API`);
        return this.makeRequest('POST', '/api/v1/detection/analyze-query', request);
    }

    /**
     * Security scanning via Static API
     */
    async performSecurityScan(request: AnalysisRequest): Promise<ServiceResponse> {
        this.logger.log(`Performing security scan`);
        return this.makeRequest('POST', '/api/v1/detection/security-scan', request);
    }

    /**
     * Batch analysis
     */
    async batchAnalyze(request: { queries: string[] }): Promise<ServiceResponse> {
        this.logger.log(`Performing batch analysis for ${request.queries.length} queries`);
        return this.makeRequest('POST', '/api/v1/detection/batch-analyze', request);
    }
}

/**
 * RAG Service Client
 * 
 * Specialized client for communicating with the LangChain RAG service
 */
export class RagServiceClient extends SecureServiceClient {
    /**
     * RAG-powered query analysis
     */
    async performAnalysis(request: AnalysisRequest): Promise<ServiceResponse> {
        this.logger.log(`Performing RAG analysis`);
        return this.makeRequest('POST', '/api/v1/rag/analyze-sql', request);
    }

    /**
     * Query the knowledge base
     */
    async queryKnowledgeBase(request: { query: string; context_type?: string; max_results?: number }): Promise<ServiceResponse> {
        this.logger.log(`Querying knowledge base`);
        // Transform request to match RAG service SemanticSearchDto format
        const searchRequest = {
            query: request.context_type && request.context_type !== 'all'
                ? `${request.context_type} ${request.query}`
                : request.query,
            max_results: request.max_results || 5,
            include_scores: true
        };
        return this.makeRequest('POST', '/api/v1/rag/semantic-search', searchRequest);
    }

    /**
     * Search for similar patterns
     */
    async searchSimilarPatterns(request: { pattern: string; max_results?: number }): Promise<ServiceResponse> {
        this.logger.log(`Searching for similar patterns`);
        // Transform request to match RAG service SemanticSearchDto format
        const searchRequest = {
            query: request.pattern,
            max_results: request.max_results || 5,
            include_scores: true
        };
        return this.makeRequest('POST', '/api/v1/rag/semantic-search', searchRequest);
    }

    /**
     * Upload file for analysis
     */
    async uploadFile(fileData: { fileName: string; content: string; fileType: string }): Promise<ServiceResponse> {
        this.logger.log(`Uploading file: ${fileData.fileName}`);
        return this.makeRequest('POST', '/api/v1/files/upload-text', fileData);
    }

    /**
     * Get embeddings info
     */
    async getEmbeddingsInfo(): Promise<ServiceResponse> {
        return this.makeRequest('GET', '/api/v1/rag/embeddings');
    }
}
