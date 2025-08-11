#!/bin/bash

# N8N Webhook Test Script

echo "🔗 Testing N8N Webhook Endpoints"
echo "================================"
echo ""

N8N_BASE="http://localhost:5678"

echo "📝 Testing available webhook endpoints..."
echo ""

# Test different possible webhook URL patterns
WEBHOOK_PATTERNS=(
    "webhook-test/simple-demo"
    "webhook/simple-demo"
    "webhook-test/sql-detection"
    "webhook/sql-detection"
)

for pattern in "${WEBHOOK_PATTERNS[@]}"; do
    echo "🔍 Testing: $N8N_BASE/$pattern"
    
    # Test POST first (expected)
    echo "   POST:"
    response=$(curl -s -X POST "$N8N_BASE/$pattern" \
        -H "Content-Type: application/json" \
        -d '{"query": "test"}' 2>&1)
    
    if echo "$response" | grep -q '"code":404'; then
        echo "      ❌ Not found"
    elif echo "$response" | grep -q '"message":"The requested webhook'; then
        echo "      ⚠️  Workflow not active or wrong method"
    elif echo "$response" | grep -q '"message":"Workflow was started"'; then
        echo "      ✅ Active and responding"
    elif echo "$response" | grep -q 'error'; then
        echo "      ⚠️  Error: $(echo "$response" | head -1)"
    else
        echo "      ✅ Active and responding"
        echo "      📊 Response preview: $(echo "$response" | head -c 100)..."
    fi
    
    # Test GET as fallback
    echo "   GET:"
    response=$(curl -s -X GET "$N8N_BASE/$pattern" \
        -H "Content-Type: application/json" 2>&1)
    
    if echo "$response" | grep -q '"code":404'; then
        echo "      ❌ Not found"
    elif echo "$response" | grep -q '"message":"Workflow was started"'; then
        echo "      ✅ Active (GET method)"
    elif echo "$response" | grep -q 'error'; then
        echo "      ⚠️  Error: $(echo "$response" | head -1)"
    else
        echo "      ✅ Response: $(echo "$response" | head -c 100)..."
    fi
    echo ""
done

echo "💡 Webhook Status Guide:"
echo "   ❌ Not found = Workflow not imported/activated"
echo "   🔄 Test mode = Works once per 'Execute Workflow' click"
echo "   ✅ Production = Continuously active"
echo ""
echo "� Important: Test webhooks (/webhook-test/) only work ONCE"
echo "   after clicking 'Execute Workflow' in N8N interface!"
echo ""
echo "🛠️ To fix:"
echo "   1. Open N8N: $N8N_BASE"
echo "   2. Import workflows from n8n/workflows/"
echo "   3. **ACTIVATE** each workflow (toggle switch)"
echo "   4. Use PRODUCTION URLs: /webhook/ (not /webhook-test/)"
echo ""
echo "📖 See detailed guide: n8n/WEBHOOK_TROUBLESHOOTING.md"
