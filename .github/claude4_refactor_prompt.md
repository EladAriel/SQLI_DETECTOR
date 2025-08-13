# Claude 4 Agent Instructions: Refactor SQL Injection Detection Platform

## Context
You are tasked with refactoring the SQLI_DETECTOR repository (https://github.com/EladAriel/SQLI_DETECTOR) to follow enterprise-grade secure API guidelines, microservices best practices, and cloud-native principles. The current architecture has three services that need proper separation of concerns and security hardening.

## Current Architecture Analysis
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ MCP Server      │ │ NestJS API      │ │ LangChain RAG   │
│ (stdio)         │ │ (Port 3001)     │ │ (Port 3002)     │
│                 │ │                 │ │                 │
│ • Resources     │ │ • REST API      │ │ • Vector Store  │
│ • Tools         │◄──►│ • Validation    │◄──►│ • OpenAI GPT    │
│ • Prompts       │ │ • Swagger       │ │ • Embeddings    │
│ • JSON-RPC      │ │ • Health Check  │ │ • File Upload   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## CRITICAL REQUIREMENTS TO IMPLEMENT

### 1. SECURE API GUIDELINES (Zero Trust Architecture)

#### Authentication & Authorization
```typescript
// Implement in ALL services
interface SecurityConfig {
  authentication: {
    jwt: {
      secret: string;
      expiresIn: string;
      issuer: string;
    };
    apiKey: {
      required: boolean;
      headerName: string;
    };
  };
  authorization: {
    rbac: boolean;
    permissions: string[];
  };
}
```

**Requirements:**
- ✅ JWT-based authentication for all API endpoints
- ✅ API key authentication for service-to-service communication
- ✅ RBAC (Role-Based Access Control) with permissions: `security:read`, `security:write`, `security:admin`
- ✅ Rate limiting per user/API key (not just IP)
- ✅ Request signing for inter-service communication

#### Input Validation & Sanitization
```typescript
// Implement strict validation schemas
interface SqlAnalysisRequest {
  query: string;           // Max 10KB, SQL syntax validation
  context?: string;        // Max 1KB, alphanumeric + spaces
  severity_threshold?: number; // 1-10 range
  metadata?: {
    source_ip?: string;    // IP validation
    user_agent?: string;   // Header validation
    session_id?: string;   // UUID validation
  };
}
```

**Requirements:**
- ✅ Input validation using Joi/Zod schemas on ALL endpoints
- ✅ SQL query size limits (prevent DoS)
- ✅ Content-Type enforcement
- ✅ CORS policy configuration
- ✅ Request body size limits

#### Security Headers & HTTPS
```typescript
// Add to all services
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
```

### 2. MICROSERVICES BEST PRACTICES

#### Service Communication Security
```typescript
// Implement mutual TLS for inter-service communication
interface ServiceConfig {
  tls: {
    enabled: boolean;
    certPath: string;
    keyPath: string;
    caPath: string;
  };
  mesh: {
    serviceName: string;
    namespace: string;
    retries: number;
    timeout: number;
  };
}
```

**Requirements:**
- ✅ Service mesh integration (Istio/Linkerd compatible)
- ✅ Circuit breaker pattern for all external calls
- ✅ Retry logic with exponential backoff
- ✅ Bulkhead pattern for resource isolation
- ✅ Health checks with proper HTTP status codes

#### Data Consistency & Transactions
```typescript
// Implement proper transaction management
interface DatabaseTransaction {
  isolation: 'READ_COMMITTED' | 'SERIALIZABLE';
  timeout: number;
  retries: number;
}
```

**Requirements:**
- ✅ Database transactions for multi-table operations
- ✅ Event sourcing for audit trails
- ✅ Eventual consistency between services
- ✅ Saga pattern for distributed transactions

### 3. CLOUD-NATIVE GUIDELINES

#### Container & Kubernetes Optimization
```yaml
# Implement proper resource limits
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi" 
    cpu: "500m"
    
# Add proper health checks
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  
readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

**Requirements:**
- ✅ 12-factor app compliance
- ✅ Stateless service design
- ✅ Horizontal pod autoscaling (HPA)
- ✅ Vertical pod autoscaling (VPA)
- ✅ Pod disruption budgets
- ✅ Network policies for service isolation

#### Observability & Monitoring
```typescript
// Implement comprehensive metrics
interface ServiceMetrics {
  business: {
    sql_injections_detected: number;
    false_positives: number;
    analysis_accuracy: number;
  };
  technical: {
    request_duration: number;
    database_connections: number;
    memory_usage: number;
    cpu_usage: number;
  };
}
```

**Requirements:**
- ✅ Prometheus metrics export
- ✅ Distributed tracing (Jaeger/Zipkin)
- ✅ Structured logging (JSON format)
- ✅ Error tracking and alerting
- ✅ SLA/SLO monitoring

### 4. SPECIFIC REFACTORING TASKS

#### Task 1: Secure the Static Data API (Port 3001)
```typescript
// Current issues to fix:
// 1. No authentication on pattern endpoints
// 2. No input validation on SQL queries
// 3. No rate limiting per user
// 4. Missing audit logging

// Implement:
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('security:read')
@RateLimit({ max: 100, windowMs: 900000 }) // 100 requests per 15 min
@Post('analyze')
async analyzeQuery(@Body() request: SqlAnalysisRequest, @User() user: AuthenticatedUser) {
  // Validation, sanitization, analysis, audit logging
}
```

#### Task 2: Fix MCP Server Integration
```typescript
// Current problem: MCP server doesn't properly orchestrate services
// Fix the logic flow:

async function handleMCPToolCall(toolName: string, args: any): Promise<any> {
  // 1. Validate MCP request
  const validation = await this.validateMCPRequest(toolName, args);
  if (!validation.valid) throw new MCPError(validation.error);
  
  // 2. Route to appropriate service with auth
  switch (toolName) {
    case 'analyze_sql_query':
      // Call Static API first (fast)
      const staticResult = await this.staticApiClient.analyze(args.query);
      
      // If high confidence, return
      if (staticResult.confidence > 0.9) return staticResult;
      
      // Otherwise, call RAG service for deeper analysis
      const ragResult = await this.ragServiceClient.analyze({
        query: args.query,
        context: staticResult,
        use_ai: true
      });
      
      return this.combineResults(staticResult, ragResult);
      
    case 'search_knowledge_base':
      return await this.ragServiceClient.search(args);
      
    default:
      throw new MCPError(`Unknown tool: ${toolName}`);
  }
}
```

#### Task 3: Implement RAG File Processing Pipeline
```typescript
// Fix the file upload → RAG pipeline
interface FileProcessingPipeline {
  upload: (file: Buffer, metadata: FileMetadata) => Promise<string>;
  extract: (fileId: string) => Promise<string[]>;
  embed: (chunks: string[]) => Promise<Embedding[]>;
  store: (embeddings: Embedding[]) => Promise<void>;
  updatePatterns: (newPatterns: Pattern[]) => Promise<void>;
}

// Implement secure file processing:
@Post('files/upload')
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Validate file type and scan for malware
    const allowedTypes = ['application/pdf', 'text/plain', 'application/json'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Invalid file type'), false);
    }
  }
}))
async uploadSecurityFile(@UploadedFile() file: Express.Multer.File) {
  // 1. Virus scan
  // 2. Extract text content
  // 3. Generate embeddings
  // 4. Store in vector database
  // 5. Extract new SQL injection patterns
  // 6. Notify Static API of new patterns
  // 7. Update MCP resources
}
```

### 5. IMPLEMENTATION PRIORITIES

#### Priority 1: Security Hardening (Week 1)
1. **Add JWT authentication to all APIs**
2. **Implement API key authentication for MCP server**
3. **Add input validation and sanitization**
4. **Enable HTTPS/TLS for all services**
5. **Add security headers middleware**

#### Priority 2: Microservices Reliability (Week 2)
1. **Implement circuit breakers for service calls**
2. **Add retry logic with exponential backoff**
3. **Create proper health check endpoints**
4. **Add graceful shutdown handling**
5. **Implement service discovery**

#### Priority 3: Cloud Readiness (Week 3)
1. **Containerize all services with multi-stage builds**
2. **Create Kubernetes manifests with proper resource limits**
3. **Add horizontal pod autoscaling**
4. **Implement distributed tracing**
5. **Add Prometheus metrics and Grafana dashboards**

#### Priority 4: Data Pipeline (Week 4)
1. **Fix RAG file processing pipeline**
2. **Implement proper vector database schema**
3. **Add pattern extraction from uploaded files**
4. **Create automated pattern updates**
5. **Add audit trail for all data changes**

### 6. SPECIFIC CODE CHANGES REQUIRED

#### Fix 1: MCP Server Service Communication
```typescript
// apps/mcp-server/src/service-clients/
export class SecureServiceClient {
  private apiKey: string;
  private baseUrl: string;
  private circuitBreaker: CircuitBreaker;
  
  constructor(config: ServiceConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });
  }
  
  async analyze(query: string): Promise<AnalysisResult> {
    return this.circuitBreaker.fire({
      method: 'POST',
      url: '/api/v1/detection/analyze',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query }),
      timeout: 10000
    });
  }
}
```

#### Fix 2: Static API Data Sources
```typescript
// apps/nestjs-api/src/external-feeds/
export class ExternalFeedService {
  async updatePatternsFromFeed(feedUrl: string): Promise<void> {
    // 1. Validate feed URL against allowlist
    // 2. Fetch with timeout and size limits
    // 3. Validate pattern format
    // 4. Check for malicious patterns
    // 5. Backup existing patterns
    // 6. Update database atomically
    // 7. Invalidate cache
    // 8. Notify MCP server of changes
  }
  
  async validatePattern(pattern: string): Promise<boolean> {
    // Pattern security validation logic
  }
}
```

#### Fix 3: RAG Service File Processing
```typescript
// apps/langchain-rag/src/file-processing/
export class SecureFileProcessor {
  async processUploadedFile(file: Buffer, metadata: FileMetadata): Promise<void> {
    // 1. Malware scanning
    // 2. File type validation
    // 3. Content extraction
    // 4. Chunk into semantic segments
    // 5. Generate embeddings
    // 6. Store in vector database
    // 7. Extract new SQL injection patterns
    // 8. Update static API patterns
    // 9. Refresh MCP resources
  }
}
```

## EXECUTION INSTRUCTIONS FOR CLAUDE 4

### Step 1: Analyze Current Implementation
- Review all TypeScript files in `apps/` directory
- Identify security vulnerabilities in current API endpoints
- Document microservices communication flows
- Map data flow between services

### Step 2: Implement Security Layer
- Add JWT middleware to all NestJS controllers
- Implement API key validation for inter-service calls
- Add input validation decorators using class-validator
- Secure all database queries with parameterization
- Add audit logging for all security-sensitive operations

### Step 3: Fix MCP Server Logic
- Repair JSON-RPC message handling in MCP server
- Implement proper tool orchestration between Static API and RAG service
- Add error handling and timeout management
- Create secure communication channels between services
- Fix resource and prompt registration

### Step 4: Enhance RAG Pipeline
- Implement secure file upload with virus scanning
- Fix vector embedding generation and storage
- Add pattern extraction from uploaded documents
- Create automated workflow to update Static API patterns
- Implement chunking strategy for large documents

### Step 5: Cloud-Native Optimization
- Add Kubernetes manifests with proper resource limits
- Implement readiness and liveness probes
- Add Prometheus metrics endpoints
- Create horizontal pod autoscaling configuration
- Add network policies for service isolation

### Step 6: Database Schema Optimization
```sql
-- Add these tables/improvements:
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    service_name VARCHAR(50) NOT NULL,
    permissions TEXT[] NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(50) NOT NULL,
    user_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    payload JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);
```

### Step 7: Configuration Management
- Move all secrets to environment variables
- Implement configuration validation on startup
- Add different configs for dev/staging/prod environments
- Use Kubernetes secrets for sensitive data
- Implement configuration hot-reloading

## DELIVERABLES EXPECTED:

### 1. Refactored Services
- **Static API (3001)**: Secure, maintainable, external-feed compatible
- **RAG Service (3002)**: Proper file processing pipeline + AI analysis
- **MCP Server**: Fixed communication logic with proper error handling

### 2. Security Implementation
- Authentication/authorization on all endpoints
- Input validation and sanitization
- Secure inter-service communication
- Audit logging and monitoring

### 3. Cloud Infrastructure
- Production-ready Kubernetes manifests
- Docker images with security scanning
- CI/CD pipeline with security gates
- Monitoring and alerting setup

### 4. Documentation Updates
- API documentation with security requirements
- Deployment guides for different environments
- Security architecture documentation
- Troubleshooting guides

## SUCCESS CRITERIA:
✅ All APIs require authentication  
✅ MCP server properly orchestrates both services  
✅ File upload triggers RAG processing and pattern updates  
✅ Services can be deployed independently  
✅ Zero security vulnerabilities in static analysis  
✅ Sub-100ms response time for static detection  
✅ Sub-3s response time for AI analysis  
✅ 99.9% uptime with proper error handling  

## FILES TO PRIORITIZE:
1. `apps/mcp-server/src/index.ts` - Fix MCP communication logic
2. `apps/nestjs-api/src/` - Add security middleware and validation
3. `apps/langchain-rag/src/` - Fix file processing pipeline
4. `infrastructure/k8s/` - Production-ready manifests
5. `.env.template` - Complete configuration options

Start with security implementation first, then fix the MCP server communication logic, and finally optimize the RAG file processing pipeline. Each service should maintain its distinct responsibility while communicating securely.