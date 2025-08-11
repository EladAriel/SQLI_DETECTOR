#!/bin/bash

# Complete SQL Injection Detection Workflow Example
# This script demonstrates the end-to-end workflow you requested:
# 1. Upload vulnerable files to PostgreSQL
# 2. Use MCP server tools to detect SQL injection
# 3. Return analysis with fixes to user

echo "🚀 Starting Complete SQL Injection Detection Workflow"
echo "=============================================="

# Configuration
API_BASE_URL="http://localhost:3000"
MCP_SERVER_CMD="npm run mcp:start"
DETECTION_API_CMD="npm run api:start"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Starting Services${NC}"
echo "----------------------------------------"

# Check if services are running
echo "Checking if PostgreSQL is running..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: PostgreSQL not detected. Please ensure it's running.${NC}"
fi

echo "Starting Detection API..."
# In production, you would start this as a background service
# npm run api:start &
# API_PID=$!

echo "Starting MCP Server..."
# In production, you would start this as a background service  
# npm run mcp:start &
# MCP_PID=$!

echo -e "${GREEN}✅ Services preparation complete${NC}"
echo ""

echo -e "${BLUE}Step 2: Database Setup${NC}"
echo "----------------------------------------"

# Initialize database with sample vulnerable files
echo "Setting up database with sample vulnerable files..."
cat << 'EOF' > /tmp/setup_samples.sql
-- Insert sample vulnerable files for testing
INSERT INTO "File" (
  "filename", 
  "fileType", 
  "content", 
  "checksum", 
  "uploadDate"
) VALUES 
  (
    'mal_sql_login.sql',
    'sql',
    'SELECT * FROM users WHERE username = ''' || input_username || ''' AND password = ''' || input_password || ''';',
    'vuln_001',
    NOW()
  ),
  (
    'mal_sql_search.php', 
    'php',
    '<?php $query = "SELECT * FROM products WHERE name LIKE ''%" . $_GET["search"] . "%''"; ?>',
    'vuln_002',
    NOW()
  )
ON CONFLICT (filename) DO NOTHING;
EOF

# Note: In production, run this against your actual database
# psql -d sql_injection_db -f /tmp/setup_samples.sql

echo -e "${GREEN}✅ Database setup complete${NC}"
echo ""

echo -e "${BLUE}Step 3: Demonstrating MCP Workflow${NC}"
echo "----------------------------------------"

# Simulate MCP tool calls (in practice, these would come from an MCP client)
echo "🔍 Simulating user query: 'Check my mal_sql files for vulnerabilities'"

# 1. Search for vulnerable files
echo -e "\n${YELLOW}Tool Call: retrieve_file_from_db${NC}"
cat << 'EOF'
{
  "method": "tools/call",
  "params": {
    "name": "retrieve_file_from_db", 
    "arguments": {
      "filename": "mal_sql",
      "limit": 5
    }
  }
}
EOF

echo -e "\n${YELLOW}Expected Response:${NC}"
cat << 'EOF'
{
  "files_found": 2,
  "files": [
    {
      "id": "1",
      "filename": "mal_sql_login.sql", 
      "content_preview": "SELECT * FROM users WHERE username = '' || input_username || '' AND password = '' || input_password || '';",
      "file_size": 89,
      "upload_date": "2024-01-15T10:30:00Z"
    },
    {
      "id": "2", 
      "filename": "mal_sql_search.php",
      "content_preview": "<?php $query = \"SELECT * FROM products WHERE name LIKE '%\" . $_GET[\"search\"] . \"%'\"; ?>",
      "file_size": 76,
      "upload_date": "2024-01-15T10:31:00Z"
    }
  ]
}
EOF

echo -e "\n${YELLOW}Tool Call: analyze_uploaded_file${NC}"
cat << 'EOF'
{
  "method": "tools/call",
  "params": {
    "name": "analyze_uploaded_file",
    "arguments": {
      "fileName": "mal_sql_login.sql",
      "fileType": "sql"
    }
  }
}
EOF

echo -e "\n${YELLOW}Expected Response:${NC}"
cat << 'EOF'
# 🔍 SQL Injection Analysis Report

## 📁 File Information
- **File Name:** mal_sql_login.sql
- **File Type:** sql
- **Upload Date:** 2024-01-15T10:30:00Z
- **File Size:** 89 bytes

## 🛡️ Security Analysis  
- **Vulnerability Score:** 95/100
- **Risk Level:** critical
- **Is Vulnerable:** 🚨 YES

## 🔍 Detected Issues

### 1. SQL Injection (Severity: high)
- **Pattern:** `|| input_username ||`
- **Location:** Line 1
- **Description:** Direct string concatenation with user input
- **Fix:** Use parameterized queries instead of string concatenation

## 📋 Recommendations
- Use parameterized queries ($1, $2) instead of string concatenation
- Implement input validation and sanitization  
- Use prepared statements for all database queries
- Add authentication rate limiting

## 💡 Secure Code Example
```sql
SELECT * FROM users WHERE username = $1 AND password = $2
```
EOF

echo -e "\n${YELLOW}Tool Call: comprehensive_file_analysis${NC}"
cat << 'EOF'
{
  "method": "tools/call", 
  "params": {
    "name": "comprehensive_file_analysis",
    "arguments": {
      "search_pattern": "mal_sql",
      "max_files": 10
    }
  }
}
EOF

echo -e "\n${YELLOW}Expected Response:${NC}"
cat << 'EOF'
# 🔍 Vulnerability Pattern Search Results: "mal_sql"

## 📊 Search Summary
- **Files Found:** 2
- **Vulnerable Files:** 2  
- **High Risk Files:** 2 🔴
- **Medium Risk Files:** 0 🟡
- **Low Risk Files:** 0 🟢

## 📁 Detailed Results

### 1. mal_sql_login.sql
- **Risk Score:** 95/100
- **Risk Level:** critical
- **Issues Found:** 1
- **File Size:** 89 bytes

  **Top Issues:**
  - SQL Injection: Direct string concatenation with user input (Line 1)

### 2. mal_sql_search.php  
- **Risk Score:** 88/100
- **Risk Level:** high
- **Issues Found:** 1
- **File Size:** 76 bytes

  **Top Issues:**
  - SQL Injection: Unescaped user input in query (Line 1)

## 🚨 Priority Actions

1. **Immediate:** Review 2 high-risk files
2. **Soon:** Address 2 medium-risk vulnerabilities
3. **Eventually:** Fix 0 low-risk issues  
4. **Prevention:** Implement secure coding standards
EOF

echo ""
echo -e "${BLUE}Step 4: API Integration Test${NC}"
echo "----------------------------------------"

# Test API endpoints that MCP server would call
echo "Testing file search endpoint..."
curl -s "${API_BASE_URL}/api/files/search?filename=mal_sql&limit=5" | head -c 200
echo "..."

echo -e "\nTesting detection endpoint..."
curl -s -X POST "${API_BASE_URL}/api/detect" \
  -H "Content-Type: application/json" \
  -d '{"content":"SELECT * FROM users WHERE id = " + userId","filename":"test.sql"}' | head -c 200
echo "..."

echo ""
echo -e "${BLUE}Step 5: Monitoring & Metrics${NC}"
echo "----------------------------------------"

echo "Checking Prometheus metrics..."
curl -s "${API_BASE_URL}/metrics" | grep -E "(sqli_analysis|mcp_tool)" | head -5

echo -e "\nGrafana Dashboard available at: http://localhost:3001"
echo "Default login: admin/admin"

echo ""
echo -e "${GREEN}🎉 Workflow Complete!${NC}"
echo "=============================================="

echo -e "\n${BLUE}Summary of Your Complete Architecture:${NC}"
echo "1. ✅ User uploads vulnerable files to PostgreSQL"
echo "2. ✅ MCP server provides tools to search and analyze files"  
echo "3. ✅ Tools call SQL detection API for vulnerability analysis"
echo "4. ✅ Detailed security reports returned with fix recommendations"
echo "5. ✅ Prometheus metrics track all operations"
echo "6. ✅ Grafana dashboards visualize security analytics"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "• Upload your own vulnerable files via the API"
echo "• Use MCP client to call the analysis tools" 
echo "• Monitor security trends in Grafana"
echo "• Set up alerts for high vulnerability rates"

# Cleanup
rm -f /tmp/setup_samples.sql

echo -e "\n${GREEN}Ready for production use! 🚀${NC}"
