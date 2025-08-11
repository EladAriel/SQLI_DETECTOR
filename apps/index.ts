import { Logger } from '@nestjs/common';

const logger = new Logger('Bootstrap');

async function startServices() {
  try {
    logger.log('Starting SQL Injection Detection Microservices...');

    // Import and start services
    const { SQLInjectionMCPServer } = await import('./mcp-server/index');

    // Start MCP Server
    logger.log('Starting MCP Server...');
    const mcpServer = new SQLInjectionMCPServer();
    await mcpServer.start();

    logger.log('All services started successfully!');
    logger.log('Available services:');
    logger.log('- MCP Server: stdio transport');
    logger.log('- SQL Detection API: http://localhost:3001');
    logger.log('- LangChain RAG: http://localhost:3002');

  } catch (error) {
    logger.error('Failed to start services:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Graceful shutdown...');
  logger.log('Graceful shutdown initiated via SIGINT...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Graceful shutdown...');
  logger.log('Graceful shutdown initiated via SIGTERM...');
  process.exit(0);
});

startServices();
