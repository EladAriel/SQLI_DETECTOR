# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a TypeScript microservices project that demonstrates:

1. **MCP (Model Context Protocol) Server** with resources, tools, and prompts
2. **LangChain RAG** integration for SQL injection detection
3. **Microservices architecture** using NestJS
4. **Infrastructure** with Docker, Kubernetes, and N8N
5. **Monitoring** with Grafana
6. **Testing** with Jest
7. **Database** with Prisma and PostgreSQL

## Project Structure
- `/apps/` - Microservices applications
  - `/mcp-server/` - MCP server implementation
  - `/sqli-detection-api/` - SQL injection detection API
  - `/langchain-rag/` - LangChain RAG service
- `/libs/` - Shared libraries and utilities
- `/infrastructure/` - Docker, Kubernetes, and deployment configurations
- `/monitoring/` - Grafana dashboards and monitoring setup

## Key Technologies
- **Backend**: NestJS, Prisma, PostgreSQL
- **MCP**: Model Context Protocol SDK
- **AI/ML**: LangChain, OpenAI
- **Testing**: Jest, Supertest
- **Infrastructure**: Docker, Kubernetes
- **Workflow**: N8N
- **Monitoring**: Grafana
- **Communication**: JSON-RPC

## MCP Server Features
The MCP server implements:
- **Resources**: Access to SQL injection patterns, detection rules, and security knowledge base
- **Tools**: SQL query analysis, injection detection, security scanning
- **Prompts**: Security-focused prompt templates for AI interactions

You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt
SDK reference: https://github.com/modelcontextprotocol/create-python-server

## Development Guidelines
- Follow microservices patterns
- Implement proper error handling and logging
- Use TypeScript strict mode
- Write comprehensive tests
- Document API endpoints
- Follow security best practices
