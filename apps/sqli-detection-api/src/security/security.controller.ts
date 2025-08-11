import { 
  Controller, 
  Get, 
  Put,
  Param,
  Body,
  HttpStatus,
  Logger,
  HttpException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiBody
} from '@nestjs/swagger';
import { SecurityService } from './security.service';

@ApiTags('security')
@Controller('security')
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  constructor(private readonly securityService: SecurityService) {}

  @Get('report')
  @ApiOperation({ 
    summary: 'Get security report',
    description: 'Retrieves comprehensive security status and threat assessment'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Security report retrieved successfully'
  })
  async getSecurityReport() {
    try {
      const report = await this.securityService.getSecurityReport();
      
      return {
        status: 'success',
        data: report,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving security report: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve security report',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('metrics')
  @ApiOperation({ 
    summary: 'Get security metrics',
    description: 'Retrieves security-related performance metrics and statistics'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Security metrics retrieved successfully'
  })
  async getSecurityMetrics() {
    try {
      const metrics = await this.securityService.getSecurityMetrics();
      
      return {
        status: 'success',
        data: metrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving security metrics: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve security metrics',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('alerts')
  @ApiOperation({ 
    summary: 'Get security alerts',
    description: 'Retrieves current security alerts and incidents'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Security alerts retrieved successfully'
  })
  async getAlerts() {
    try {
      const alerts = await this.securityService.getAlerts();
      
      return {
        status: 'success',
        data: alerts,
        count: alerts.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving security alerts: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve security alerts',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('alerts/:id/status')
  @ApiOperation({ 
    summary: 'Update alert status',
    description: 'Updates the status of a specific security alert'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Alert identifier',
    example: 'alert-001'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'resolved', 'investigating'],
          example: 'resolved'
        }
      },
      required: ['status']
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Alert status updated successfully'
  })
  async updateAlertStatus(
    @Param('id') alertId: string, 
    @Body() body: { status: 'active' | 'resolved' | 'investigating' }
  ) {
    try {
      const result = await this.securityService.updateAlertStatus(alertId, body.status);
      
      this.logger.log(`Alert ${alertId} status updated to ${body.status}`);
      
      return {
        status: 'success',
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error updating alert status: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to update alert status',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('configuration')
  @ApiOperation({ 
    summary: 'Get configuration status',
    description: 'Retrieves system configuration and health status'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Configuration status retrieved successfully'
  })
  async getConfigurationStatus() {
    try {
      const config = await this.securityService.getConfigurationStatus();
      
      return {
        status: 'success',
        data: config,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving configuration status: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve configuration status',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
