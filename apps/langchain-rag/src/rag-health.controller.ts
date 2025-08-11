import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class RagHealthController {
    @Get()
    @ApiOperation({ summary: 'RAG Service health check' })
    @ApiResponse({ status: 200, description: 'Health check passed' })
    getHealth() {
        return {
            status: 'ok',
            service: 'langchain-rag',
            timestamp: new Date().toISOString(),
            message: 'RAG Service is running'
        };
    }
}
