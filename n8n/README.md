# N8N Workflows for LangChain RAG SQL Injection Detection

This directory contains N8N workflow configurations that demonstrate the complete LangChain RAG process for SQL injection detection.

## 🎯 Overview

The N8N workflows provide a visual representation of the SQL injection detection process, showing each step from input validation to final security recommendations.

## 📁 Structure

```
n8n/
├── workflows/
│   ├── langchain-rag-sql-detection.json    # Main comprehensive workflow
│   └── simple-rag-demo.json                # Simple demo workflow
├── credentials/                             # N8N credentials (if needed)
├── docker-compose.n8n.yml                  # N8N Docker setup
└── env.template                            # Environment configuration template
```

## 🔄 Workflows

### 1. Main LangChain RAG SQL Detection Workflow

**File:** `workflows/langchain-rag-sql-detection.json`

**Process Flow:**
1. **Input Validation** - Validates and processes SQL query input
2. **RAG Analysis** - Calls LangChain RAG service for intelligent analysis
3. **Process RAG Results** - Extracts vulnerability information and risk levels
4. **Traditional Detection** - Runs pattern-based detection for comparison
5. **Combine Results** - Merges both analysis methods
6. **Security Advice** - Gets detailed remediation guidance (if vulnerable)
7. **Final Report** - Generates comprehensive analysis report

**Key Features:**
- ✅ Real-time vulnerability detection
- 📊 Risk level assessment (HIGH/MEDIUM/LOW/NONE)
- 🔗 Comparison between AI and traditional methods
- 📚 Source attribution from knowledge base
- 🛡️ Actionable security recommendations
- ⚡ Performance metrics and timing

### 2. Simple RAG Demo Workflow

**File:** `workflows/simple-rag-demo.json`

**Process Flow:**
1. **Demo Input** - Accepts query or uses random demo queries
2. **RAG Analysis** - Performs basic LangChain analysis
3. **Format Results** - Creates simplified demo report

**Key Features:**
- 🎯 Quick demonstration of RAG capabilities
- 🎲 Random sample queries for testing
- 📋 Simplified output format
- ⚡ Fast execution for demos

## 🚀 Setup Instructions

### 1. Prerequisites

Ensure your main services are running:
```bash
# Start the main project services
npm run api:start          # SQL Detection API on :3001
npm run rag:start          # LangChain RAG service on :3002
npm run postgres:start     # PostgreSQL database
```

### 2. Start N8N

```bash
# Copy environment template
cp n8n/env.template n8n/.env

# Start N8N with Docker
cd n8n
docker-compose -f docker-compose.n8n.yml up -d

# Or install and run N8N locally
npm install -g n8n
n8n start
```

### 3. Import Workflows

1. Open N8N interface: http://localhost:5678
2. Go to **Workflows** → **Import from File**
3. Import both workflow JSON files:
   - `langchain-rag-sql-detection.json`
   - `simple-rag-demo.json`

### 4. Configure Webhooks

The workflows create webhook endpoints:
- **Main Workflow:** `POST http://localhost:5678/webhook/sql-detection`
- **Demo Workflow:** `POST http://localhost:5678/webhook/simple-demo`

## 🧪 Testing the Workflows

### Test the Main Workflow

```bash
# Test with SQL injection payload
curl -X POST http://localhost:5678/webhook/sql-detection \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM users WHERE id = '\''1'\'' OR '\''1'\''='\''1'\''",
    "max_sources": 5,
    "include_scores": true,
    "context_type": "all"
  }'

# Test with safe query
curl -X POST http://localhost:5678/webhook/sql-detection \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT name FROM products WHERE category = '\''electronics'\''",
    "max_sources": 3
  }'
```

### Test the Demo Workflow

```bash
# Quick demo with random query
curl -X POST http://localhost:5678/webhook/simple-demo \
  -H "Content-Type: application/json" \
  -d '{}'

# Demo with specific query
curl -X POST http://localhost:5678/webhook/simple-demo \
  -H "Content-Type: application/json" \
  -d '{
    "query": "UPDATE users SET password = '\''hacked'\'' WHERE 1=1; --"
  }'
```

## 📊 Workflow Output Examples

### Main Workflow Response
```json
{
  "metadata": {
    "analysis_id": "analysis_1691234567890_abc123def",
    "timestamp": "2025-08-11T12:00:00.000Z",
    "processing_time_ms": 2847
  },
  "vulnerability_assessment": {
    "is_vulnerable": true,
    "risk_level": "HIGH",
    "confidence": "HIGH",
    "detection_methods": {
      "rag_detection": true,
      "traditional_detection": true,
      "methods_agree": true
    }
  },
  "rag_insights": {
    "analysis_summary": "This query contains a classic SQL injection pattern using OR '1'='1' which always evaluates to true...",
    "sources_consulted": 4,
    "relevant_patterns": [...]
  },
  "recommendations": [
    "🚨 Potential SQL injection vulnerability detected",
    "🛡️ Use parameterized queries/prepared statements",
    "🔍 Validate and sanitize all user inputs"
  ]
}
```

### Demo Workflow Response
```json
{
  "demo_results": {
    "query_analyzed": "SELECT * FROM users WHERE id = '1' OR '1'='1'",
    "vulnerability_detected": true,
    "rag_answer": "This query contains SQL injection...",
    "sources_found": 3,
    "analysis_summary": {
      "risk_assessment": "🚨 HIGH RISK",
      "recommendation": "Use parameterized queries and input validation"
    }
  }
}
```

## 🔧 Workflow Customization

### Modifying Analysis Parameters

Edit the workflow nodes to adjust:
- **Max Sources:** Number of knowledge base sources to consult
- **Context Type:** Focus on specific pattern types (patterns, knowledge, examples, rules)
- **Timeout Values:** Adjust for your API response times
- **Risk Thresholds:** Customize risk level calculations

### Adding New Steps

You can extend the workflows by adding nodes for:
- 📧 Email notifications for high-risk findings
- 📊 Database logging of analysis results
- 🔄 Automatic retesting with variations
- 📈 Metrics collection and reporting
- 🔗 Integration with security tools

### Error Handling

Both workflows include error handling that:
- ✅ Logs detailed error information
- 🔄 Provides graceful fallbacks
- 📨 Returns structured error responses
- 🔍 Helps with debugging

## 📈 Monitoring & Debugging

### N8N Execution View
- View real-time execution progress
- Inspect data flow between nodes
- Debug failed executions
- Monitor performance metrics

### Logs and Metrics
- N8N execution logs
- API response times
- Error rates and patterns
- Workflow success metrics

## 🎯 Use Cases

1. **Security Training:** Visual demonstration of detection process
2. **API Testing:** Automated testing of RAG endpoints
3. **Performance Analysis:** Measuring detection accuracy and speed
4. **Integration Demos:** Showing how to integrate with existing systems
5. **Continuous Monitoring:** Automated security scanning workflows

## 🔗 Integration with Main Project

The N8N workflows integrate seamlessly with:
- **LangChain RAG Service** (Port 3002)
- **SQL Detection API** (Port 3001) 
- **PostgreSQL Database** (Port 5432)
- **Knowledge Base** (Vector embeddings)
- **Security Patterns** (Detection rules)

This provides a complete visual workflow for understanding and demonstrating the entire SQL injection detection process using AI-powered analysis.
