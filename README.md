# SQL Injection Detection Microservices Platform

A comprehensive TypeScript-based microservices platform demonstrating **Model Context Protocol (MCP) server** capabilities and **LangChain RAG** for advanced SQL injection detection and security analysis.

## 🚀 Key Features

### 🔧 MCP Server Implementation
- **Intelligent Orchestrator**: Smart routing between static analysis and AI-powered deep scans
- **Two-Tier Analysis**: Fast pattern matching (<100ms) + AI enhancement when needed (<3s)
- **Resources**: Access to security patterns, knowledge base, and vulnerability examples
- **Tools**: SQL analysis, pattern detection, secure query generation, batch processing
- **Prompts**: Guided security analysis, vulnerability explanations, best practices
- **Transport**: JSON-RPC over stdio for AI model integration

### 🧠 LangChain RAG Integration
- **Vector Store**: Security knowledge embeddings with semantic search
- **OpenAI Integration**: GPT-powered analysis and recommendations (optional)
- **Context Retrieval**: Intelligent security advice based on patterns and examples
- **File Processing**: Upload and analyze source code files for vulnerabilities

### 🛡️ Security Analysis Engine
- **Pattern Detection**: 50+ SQL injection patterns with severity scoring
- **Vulnerability Scanning**: Real-time threat identification with smart routing
- **Secure Query Generation**: Automated parameterized query suggestions
- **Knowledge Base**: 100+ security rules and best practices
- **Risk Assessment**: Comprehensive scoring and remediation guidance

### 🏗️ Microservices Architecture
- **Service Orchestration**: Intelligent routing with health management and fallbacks
- **Independent Services**: Scalable, maintainable microservice design
- **Secure Communication**: HTTP clients with retry logic, authentication, and circuit breakers
- **Health Monitoring**: Built-in health checks and status endpoints
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Database Integration**: PostgreSQL with Prisma ORM
- **Error Handling**: Comprehensive logging and error management

## 🏗️ Refactored Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Server (stdio)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Resources     │  │      Tools      │  │     Prompts     │ │
│  │ • Patterns      │  │ • SQL Analysis  │  │ • Security      │ │
│  │ • Rules         │  │ • Security Scan │  │   Review        │ │
│  │ • Knowledge     │  │ • Pattern Search│  │ • Vulnerability │ │
│  │ • Examples      │  │ • File Upload   │  │   Assessment    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │    MCP Analysis Orchestrator    │
         │  • Intelligent Routing Logic   │
         │  • Two-Tier Analysis Strategy  │  
         │  • Service Health Management   │
         │  • Error Handling & Fallbacks  │
         └────────────┬─────────────┬──────┘
                      │             │
              ┌───────▼────────┐   ┌▼────────────────┐
              │  Static API    │   │  RAG Service    │
              │  (Port 3001)   │   │  (Port 3002)    │
              │                │   │                 │
              │ • Fast Analysis│   │ • AI Analysis   │
              │ • Pattern Match│   │ • Vector Search │
              │ • <100ms Response│   │ • <3s Deep Scan │
              │ • Rule Engine  │   │ • File Processing│
              └────────────────┘   └─────────────────┘
                      │                       │
                      └───────────┬───────────┘
                                  │
                     ┌────────────▼────────────┐
                     │    PostgreSQL Database  │
                     │        (Port 5432)      │
                     │                         │
                     │ • Vulnerability Data    │
                     │ • Security Patterns     │
                     │ • Analysis History      │
                     │ • Vector Embeddings     │
                     └─────────────────────────┘
```

## 📦 Tech Stack

- **Framework**: NestJS (Microservices)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **AI/ML**: LangChain + OpenAI GPT
- **Protocol**: Model Context Protocol (MCP)
- **Infrastructure**: Docker + Kubernetes
- **Automation**: N8N Workflow Engine
- **Testing**: Jest + Supertest
- **Monitoring**: Grafana + Prometheus
- **Documentation**: Swagger/OpenAPI

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (currently tested with v22)
- Docker & Docker Compose
- PostgreSQL 15+ (or Docker)
- OpenAI API Key (optional for RAG features)

### Installation & Development Setup

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd test_sqli
npm install
```

2. **Environment Configuration**
```bash
# Copy the environment template
cp env.template .env

# Edit .env with your values (minimum required):
# DATABASE_URL="postgresql://postgres:secure_db_password_123@localhost:5432/sqli_detection?schema=public"
# OPENAI_API_KEY=your_openai_api_key_here (optional for RAG service)
```

3. **Database Setup (Choose Option A or B)**

**Option A: Using Docker (Recommended)**
```bash
# Start PostgreSQL with Docker
npm run db:docker:up

# Wait for database to be ready, then initialize
npm run db:docker:shell
# In psql shell, run: \q to exit

# Reset and initialize database with sample data
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS sqli_detection; CREATE DATABASE sqli_detection;"
docker-compose exec postgres psql -U postgres -d sqli_detection -f /docker-entrypoint-initdb.d/init.sql
```

**Option B: Local PostgreSQL**
```bash
# Create database
createdb -U postgres sqli_detection

# Initialize with sample data
psql -U postgres -d sqli_detection -f infrastructure/database/init.sql
```

4. **Start Individual Services for Development**

```bash
# Terminal 1: Start SQL Detection API (Port 3001)
npm run api:start

# Terminal 2: Start LangChain RAG Service (Port 3002)
npm run rag:start

# Terminal 3: Start MCP Server (stdio transport)
npm run mcp:start
```

### Verification Steps

1. **Check API Service**
```bash
curl http://localhost:3001/api/v1/health
# Expected: {"status":"ok","timestamp":"..."}
```

2. **Check RAG Service**
```bash
curl http://localhost:3002/api/v1/health
# Expected: {"status":"ok","timestamp":"..."}
```

3. **Check Database Connection**
```bash
npm run db:status
# Expected: postgres is ready
```

4. **View API Documentation**
- API Docs: http://localhost:3001/api/docs
- RAG Docs: http://localhost:3002/api/docs

### Current Service Status

✅ **Detection API (Port 3001)**: Fully functional with health checks, SQL analysis, and comprehensive security scanning

✅ **RAG Service (Port 3002)**: Running in basic mode with health endpoint and API documentation. Full database integration temporarily disabled to ensure reliable startup.

🔄 **MCP Server**: Ready to start with `npm run mcp:start` (stdio transport)

## 🔍 Quick Usage Examples

### Analyze SQL Query for Vulnerabilities
```bash
# Using the Detection API
curl -X POST http://localhost:3001/api/v1/detection/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM users WHERE id = '\''1'\'' OR '\''1'\''='\''1'\''",
    "context": "user_input"
  }'
```

### Get Security Patterns
```bash
# List all known SQL injection patterns
curl http://localhost:3001/api/v1/detection/patterns
```

### RAG-Powered Analysis
```bash
# Use AI-powered analysis with context
curl -X POST http://localhost:3002/api/v1/rag/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM products WHERE category = $1",
    "context_type": "security_review"
  }'
```

### Upload File for Analysis
```bash
# Upload a source code file for vulnerability scanning
curl -X POST http://localhost:3002/api/v1/files/upload \
  -F "file=@vulnerable_code.js" \
  -F "fileType=javascript"
```

### Production Deployment

```bash
# Build all services
npm run build

# Start all services
npm start

# Or use Docker Compose
docker-compose up -d

# Or use Kubernetes
kubectl apply -f infrastructure/k8s/
```

## 🔧 API Endpoints

### Detection API (Port 3001)
```http
# SQL Injection Detection
POST   /api/v1/detection/analyze     # Analyze SQL query
GET    /api/v1/detection/patterns    # Get security patterns
GET    /api/v1/detection/history     # Analysis history
POST   /api/v1/detection/batch       # Batch analysis

# Pattern Analysis
POST   /api/v1/analysis/patterns     # Pattern management
GET    /api/v1/analysis/rules        # Detection rules
GET    /api/v1/analysis/knowledge    # Security knowledge

# Security Scanning
POST   /api/v1/security/scan         # Security scan
GET    /api/v1/security/reports      # Security reports
POST   /api/v1/security/remediate    # Remediation suggestions

# Health & Monitoring
GET    /api/v1/health                # Health check
GET    /api/v1/metrics               # Prometheus metrics
```

### LangChain RAG API (Port 3002)
```http
# RAG Operations
POST   /api/v1/rag/analyze           # RAG-powered SQL analysis
POST   /api/v1/rag/query             # Query knowledge base
GET    /api/v1/rag/embeddings        # Vector embeddings info

# File Processing
POST   /api/v1/files/upload          # Upload files for analysis
GET    /api/v1/files/list            # List processed files
DELETE /api/v1/files/:id             # Delete file

# Health & Monitoring
GET    /api/v1/health                # Health check
```

### MCP Server (stdio transport)
```json
# List available resources
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "id": 1
}

# Analyze SQL query using MCP tools
{
  "jsonrpc": "2.0", 
  "method": "tools/call",
  "params": {
    "name": "analyze_sql_query",
    "arguments": {
      "query": "SELECT * FROM users WHERE id = 1"
    }
  },
  "id": 2
}

# Get security prompts
{
  "jsonrpc": "2.0",
  "method": "prompts/list",
  "id": 3
}
```

## 🔄 N8N Workflow Automation

The project includes **N8N workflow automation** to visually demonstrate the complete LangChain RAG process for SQL injection detection.

### N8N Integration Features

- **Visual Workflow**: Step-by-step process visualization
- **Real-time Processing**: Live analysis with intermediate results
- **Dual Detection**: Combines AI-powered RAG with traditional pattern matching
- **Performance Monitoring**: Execution time and accuracy metrics
- **Comprehensive Reporting**: Detailed analysis reports with recommendations

### Quick N8N Setup

```bash
# Setup and start N8N with all dependencies
npm run n8n:demo

# Or manual setup
npm run n8n:setup
npm run n8n:start

# Access N8N interface
# http://localhost:5678
```

### N8N Workflow Endpoints

```http
# Main SQL Injection Detection Workflow
POST http://localhost:5678/webhook/sql-detection
Content-Type: application/json
{
  "query": "SELECT * FROM users WHERE id = '1' OR '1'='1'",
  "max_sources": 5,
  "include_scores": true,
  "context_type": "all"
}

# Simple Demo Workflow  
POST http://localhost:5678/webhook/simple-demo
Content-Type: application/json
{
  "query": "SELECT name FROM products WHERE category = 'electronics'"
}
```

### N8N Workflow Process

The main workflow demonstrates these steps:

1. **Input Validation** - Validates and processes SQL query input
2. **RAG Analysis** - Calls LangChain RAG service for intelligent analysis  
3. **Process Results** - Extracts vulnerability information and risk levels
4. **Traditional Detection** - Runs pattern-based detection for comparison
5. **Combine Analysis** - Merges both analysis methods with confidence scoring
6. **Security Advice** - Gets detailed remediation guidance (if vulnerable)
7. **Final Report** - Generates comprehensive analysis report

### N8N Management Commands

```bash
# Start N8N workflow engine
npm run n8n:start

# Stop N8N
npm run n8n:stop

# View N8N logs
npm run n8n:logs

# Test N8N workflows
npm run n8n:test

# Reset N8N (clean restart)
npm run n8n:reset
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Test coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🔧 Troubleshooting

### Common Issues & Solutions

**1. "npm run api:start" does nothing**
```bash
# Check if .env file exists
ls -la .env

# If missing, copy from template
cp env.template .env

# Ensure DATABASE_URL is set in .env
echo "DATABASE_URL=postgresql://postgres:secure_db_password_123@localhost:5432/sqli_detection?schema=public" >> .env
```

**2. Database connection errors**
```bash
# Check if PostgreSQL is running
npm run db:status

# Start PostgreSQL with Docker
npm run db:docker:up

# Reset database if corrupted
npm run db:docker:reset

# If RAG service hangs during startup, temporarily disable DB initialization:
# Edit apps/langchain-rag/src/unified-vector-store.service.ts
# Comment out: await this.initializeKnowledgeBase();
```

**3. Prisma client issues**
```bash
# If you get Prisma generation errors on Windows:
# Close all terminals and VS Code
# Restart VS Code as administrator
npm run prisma:generate

# Alternative: Temporarily disable database features in RAG service
# The services can run in basic mode without full database integration
```

**3. Missing dependencies**
```bash
# Reinstall node modules
rm -rf node_modules package-lock.json
npm install

# Check TypeScript compilation
npm run build
```

**4. Port already in use**
```bash
# Check what's using the port
netstat -ano | findstr :3001

# Kill processes on specific ports
# Windows
netstat -ano | findstr :3001
# Note the PID and then:
taskkill /PID <PID_NUMBER> /F

# Or use our helper script (create this file):
# kill-port.bat
@echo off
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%1') do (
    taskkill /PID %%a /F 2>nul
)

# Usage: cmd.exe /c kill-port.bat 3001

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

**5. OpenAI API errors (RAG service)**
```bash
# Ensure OPENAI_API_KEY is set in .env
grep OPENAI_API_KEY .env

# RAG service will work in limited mode without OpenAI
# But some features require a valid API key
```

### Development Tools

**Available NPM Scripts:**
```bash
# Service management
npm run mcp:start          # Start MCP server
npm run api:start          # Start Detection API
npm run rag:start          # Start RAG service

# Development helpers
npm run dev:status         # Check all service status
npm run dev:kill-api       # Kill processes on port 3001
npm run dev:kill-rag       # Kill processes on port 3002

# Database management
npm run db:docker:up       # Start PostgreSQL
npm run db:docker:down     # Stop PostgreSQL
npm run db:docker:reset    # Reset database
npm run db:status          # Check database status

# Development
npm run build              # Build TypeScript
npm run dev                # Start in development mode
npm test                   # Run tests
```

**Port Management Helper:**
```bash
# Make the script executable
chmod +x dev-ports.sh

# Check service status
./dev-ports.sh status

# Kill processes on specific port
./dev-ports.sh kill 3001

# Check what's using a port
./dev-ports.sh check 3001
```

## 🔍 MCP Server Capabilities

### Resources
- `security-patterns`: SQL injection attack patterns
- `knowledge-base`: Security best practices and guidelines
- `vulnerability-examples`: Real-world vulnerable code examples
- `detection-rules`: Pattern matching and heuristic rules

### Tools
- `analyze_sql_query`: Comprehensive SQL injection analysis
- `detect_patterns`: Pattern-based vulnerability detection
- `generate_secure_query`: Secure query alternatives
- `batch_analyze`: Bulk query analysis
- `explain_vulnerability`: Detailed vulnerability explanations

### Prompts
- `security_analysis`: Step-by-step security analysis guide
- `vulnerability_explanation`: Interactive vulnerability tutorial
- `best_practices`: Security implementation guidelines
- `remediation_steps`: Fix recommendation workflow

## 🤖 LangChain RAG Features

### Vector Store Integration
```typescript
// Example: Semantic security search
const results = await ragService.analyzeSQLQuery({
  query: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
  context_type: "patterns",
  max_sources: 5
});
```

### Intelligent Analysis
- **Context-Aware**: Retrieves relevant security knowledge
- **Pattern Matching**: Semantic similarity to known attacks
- **Recommendation Engine**: AI-powered remediation suggestions
- **Explainable AI**: Detailed reasoning for security decisions

## 📊 Monitoring & Observability

### Grafana Dashboards
- SQL Injection Detection Metrics
- API Performance & Latency
- MCP Server Usage Statistics
- LangChain RAG Analytics

### Prometheus Metrics
```
sql_injection_detections_total
api_requests_duration_seconds
mcp_server_requests_total
rag_query_embeddings_total
database_connections_active
```

## 🔄 N8N Automation Workflows

### Security Incident Response
1. **Detection Trigger**: SQL injection detected
2. **Threat Analysis**: Automated pattern analysis
3. **Alert Generation**: Slack/Email notifications
4. **Report Creation**: PDF security reports
5. **Remediation**: Auto-generate secure queries

### Continuous Monitoring
1. **Log Analysis**: Parse application logs
2. **Pattern Updates**: Update security patterns
3. **Knowledge Sync**: Refresh RAG knowledge base
4. **Health Checks**: Monitor service status

## 🐳 Docker Deployment

```bash
# Build and run all services
docker-compose up -d

# Scale specific services
docker-compose up -d --scale detection-api=3

# View logs
docker-compose logs -f detection-api
docker-compose logs -f mcp-server
```

## ☸️ Kubernetes Deployment

```bash
# Apply all manifests
kubectl apply -f infrastructure/k8s/

# Check deployment status
kubectl get pods -l app=sql-injection-platform

# Scale deployments
kubectl scale deployment detection-api --replicas=5

# View logs
kubectl logs -f deployment/detection-api
```

## 🔧 Configuration

### Environment Variables
See `env.template` for complete configuration options.

### Key Configurations
- **Database**: PostgreSQL connection settings
- **OpenAI**: API key for LangChain integration
- **MCP**: Server host and port configuration
- **Security**: JWT secrets and API keys
- **Monitoring**: Grafana and Prometheus settings

## 📚 Documentation

### API Documentation
- **Detection API Swagger**: http://localhost:3001/api/docs
- **RAG Service Swagger**: http://localhost:3002/api/docs
- **OpenAPI Specs**: Available at `/api-json` on each service

### Service Health Checks
- **Detection API Health**: http://localhost:3001/api/v1/health
- **RAG Service Health**: http://localhost:3002/api/v1/health
- **Database Status**: `npm run db:status`

### Architecture Documentation
- **MCP Protocol**: Model Context Protocol for AI tool integration
- **LangChain Integration**: RAG implementation for security knowledge
- **Security Patterns**: SQL injection detection algorithms
- **Microservices**: Independent, scalable service architecture

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- 📧 Email: support@example.com
- 💬 Discord: [Project Discord](https://discord.gg/example)
- 📖 Docs: [Full Documentation](https://docs.example.com)
- 🐛 Issues: [GitHub Issues](https://github.com/example/repo/issues)

## 🏆 Acknowledgments

- **Model Context Protocol**: For the innovative protocol specification
- **LangChain**: For the powerful RAG framework
- **NestJS**: For the robust microservices framework
- **OWASP**: For security patterns and best practices
- **OpenAI**: For GPT integration capabilities
