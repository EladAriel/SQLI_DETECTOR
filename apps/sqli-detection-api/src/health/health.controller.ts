import { Controller, Get } from '@nestjs/common';
import { 
  HealthCheckService, 
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Health check passed' })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { 
        thresholdPercent: 0.9, 
        path: process.platform === 'win32' ? 'C:\\' : '/' 
      }),
    ]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  readiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        detection_engine: 'ready',
        knowledge_base: 'ready',
        analysis_service: 'ready'
      }
    };
  }
}
