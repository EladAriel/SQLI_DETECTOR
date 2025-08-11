#!/bin/bash

# Simple demo test script for the LangChain RAG SQL Injection Detection

echo "🎯 LangChain RAG SQL Injection Detection - Simple Demo Test"
echo "=========================================================="
echo ""

# Configuration
DETECTION_API="http://localhost:3001/api/v1/detection"
RAG_API="http://localhost:3002/api/v1/rag"
N8N_URL="http://localhost:5678"

echo "🔍 Testing SQL Injection Detection with both AI and Traditional methods"
echo ""

# Test query - classic SQL injection
SQL_QUERY="SELECT * FROM users WHERE id = '1' OR '1'='1'"
echo "📝 Test Query: $SQL_QUERY"
echo ""

# Test 1: Traditional Detection API
echo "🔧 Testing Traditional Pattern-Based Detection..."
DETECTION_RESULT=$(curl -s -X POST "$DETECTION_API/analyze-query" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$SQL_QUERY\"}")

echo "📊 Traditional Detection Result:"
echo "$DETECTION_RESULT" | jq '{
  vulnerable: .data.isVulnerable,
  score: .data.score,
  patterns: .data.detectedPatterns | length,
  risk_factors: .data.riskFactors | length
}' 2>/dev/null || echo "$DETECTION_RESULT"
echo ""

# Test 2: LangChain RAG Analysis
echo "🧠 Testing LangChain RAG AI-Powered Analysis..."
RAG_RESULT=$(curl -s -X POST "$RAG_API/analyze-sql" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$SQL_QUERY\", \"max_sources\": 3}")

echo "📊 RAG Analysis Result:"
echo "$RAG_RESULT" | jq '{
  status: .status,
  answer_preview: .data.answer[:100] + "...",
  sources_count: .data.sources | length,
  timestamp: .data.timestamp
}' 2>/dev/null || echo "$RAG_RESULT"
echo ""

# Test 3: Safe Query
echo "✅ Testing with a Safe Query..."
SAFE_QUERY="SELECT name FROM products WHERE category = 'electronics'"
echo "📝 Safe Query: $SAFE_QUERY"
echo ""

SAFE_DETECTION=$(curl -s -X POST "$DETECTION_API/analyze-query" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$SAFE_QUERY\"}")

echo "📊 Safe Query Detection:"
echo "$SAFE_DETECTION" | jq '{
  vulnerable: .data.isVulnerable,
  score: .data.score,
  patterns: .data.detectedPatterns | length
}' 2>/dev/null || echo "$SAFE_DETECTION"
echo ""

# Test 4: N8N Status
echo "🔄 Checking N8N Workflow Engine..."
N8N_STATUS=$(curl -s "$N8N_URL" 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✅ N8N is running and accessible at $N8N_URL"
  echo "🎯 Webhook endpoints available:"
  echo "   Main Workflow: POST $N8N_URL/webhook/sql-detection"
  echo "   Demo Workflow: POST $N8N_URL/webhook/simple-demo"
else
  echo "❌ N8N is not accessible"
fi
echo ""

# Test 5: Service Health Summary
echo "📋 Service Health Summary:"
echo "─────────────────────────"

# Check Detection API
if curl -s "$DETECTION_API/../health" >/dev/null 2>&1; then
  echo "✅ Detection API (Port 3001) - Running"
else
  echo "❌ Detection API (Port 3001) - Not responding"
fi

# Check RAG API
if curl -s "$RAG_API/../health" >/dev/null 2>&1; then
  echo "✅ RAG API (Port 3002) - Running"
else
  echo "❌ RAG API (Port 3002) - Not responding"
fi

# Check PostgreSQL
if docker-compose exec postgres pg_isready -U postgres >/dev/null 2>&1; then
  echo "✅ PostgreSQL (Port 5432) - Running"
else
  echo "❌ PostgreSQL (Port 5432) - Not responding"
fi

# Check N8N
if curl -s "$N8N_URL" >/dev/null 2>&1; then
  echo "✅ N8N (Port 5678) - Running"
else
  echo "❌ N8N (Port 5678) - Not responding"
fi

echo ""
echo "🎉 Demo test completed!"
echo ""
echo "💡 Next Steps:"
echo "   1. Open N8N interface: $N8N_URL"
echo "   2. Import workflows from n8n/workflows/ directory"
echo "   3. Test with: curl -X POST $N8N_URL/webhook/simple-demo -H 'Content-Type: application/json' -d '{}'"
echo "   4. View execution logs in N8N interface"
echo ""
echo "📚 API Documentation:"
echo "   Detection API: http://localhost:3001/api/docs"
echo "   RAG API: http://localhost:3002/api/docs"
