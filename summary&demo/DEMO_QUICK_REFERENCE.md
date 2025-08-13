# Demo Quick Reference Card

## 🚀 Pre-Demo Startup Commands
```bash
# 1. Start PostgreSQL
npm run task:postgres:start

# 2. Start Static API (Terminal 1)
npm run api:start

# 3. Start RAG Service (Terminal 2)  
npm run rag:start

# 4. Start MCP Server (Terminal 3)
npm run mcp:start

# 5. Health Check
curl http://localhost:3001/health && curl http://localhost:3002/health
```

## 🎯 Core Demo Queries

### Tier 1: Fast Static (<100ms)
```sql
-- Simple injection
SELECT * FROM users WHERE id = '1 OR 1=1 --'

-- Union attack
SELECT name FROM products WHERE id = 1 UNION SELECT password FROM users
```

### Tier 2: AI-Enhanced (<3s)
```sql
-- Obfuscated injection
SELECT * FROM users WHERE name = CONCAT('admin', CHAR(39), ' OR ', CHAR(39), '1')

-- Time-based blind
SELECT * FROM products WHERE id = 1 AND SLEEP(5)
```

## 📋 MCP Tools to Demonstrate
- `analyze_sql_query` - Core analysis tool
- `upload_and_analyze_file` - File processing
- `batch_analyze_queries` - Smart batching
- `search_security_patterns` - Knowledge search
- `generate_secure_query` - Remediation

## 🔧 Key Architecture Points
- **MCPAnalysisOrchestrator**: Intelligent routing brain
- **Two-Tier Strategy**: Static first, AI when needed
- **Performance**: <100ms static, <3s AI-enhanced
- **Smart Routing**: Query complexity analysis
- **Fallback Strategy**: Graceful error handling

## 📊 Demo Success Metrics
- Response times under targets
- Accurate vulnerability detection
- Intelligent routing decisions
- Comprehensive analysis reports
- Secure code recommendations

## 🚨 Backup Plans
- Pre-loaded sample outputs
- Simple injection demos if services fail
- Architecture slides if tech issues
- Manual tool demonstrations
