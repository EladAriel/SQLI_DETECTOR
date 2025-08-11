import { 
  Controller, 
  Get, 
  Query, 
  Param, 
  HttpStatus,
  Logger,
  HttpException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
  private readonly logger = new Logger(AnalysisController.name);

  constructor(private readonly analysisService: AnalysisService) {}

  @Get('patterns')
  @ApiOperation({ 
    summary: 'Get SQL injection patterns',
    description: 'Retrieves known SQL injection patterns, optionally filtered by severity'
  })
  @ApiQuery({ 
    name: 'severity', 
    required: false, 
    enum: ['critical', 'high', 'medium', 'low'],
    description: 'Filter patterns by severity level'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Patterns retrieved successfully'
  })
  async getPatterns(@Query('severity') severity?: string) {
    try {
      const patterns = await this.analysisService.getPatterns(severity);
      
      return {
        status: 'success',
        data: patterns,
        count: patterns.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving patterns: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve patterns',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('patterns/:id')
  @ApiOperation({ 
    summary: 'Get specific pattern by ID',
    description: 'Retrieves detailed information about a specific SQL injection pattern'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Pattern identifier',
    example: 'sqli-union-based'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Pattern retrieved successfully'
  })
  async getPatternById(@Param('id') id: string) {
    try {
      const pattern = await this.analysisService.getPatternById(id);
      
      return {
        status: 'success',
        data: pattern,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving pattern ${id}: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: `Pattern with ID ${id} not found`,
          error: error.message
        },
        HttpStatus.NOT_FOUND
      );
    }
  }

  @Get('patterns/search')
  @ApiOperation({ 
    summary: 'Search patterns',
    description: 'Search for patterns by name, description, or examples'
  })
  @ApiQuery({ 
    name: 'q', 
    required: true, 
    description: 'Search query',
    example: 'union'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search results retrieved successfully'
  })
  async searchPatterns(@Query('q') query: string) {
    try {
      if (!query || query.trim().length < 2) {
        throw new HttpException(
          {
            status: 'error',
            message: 'Search query must be at least 2 characters long'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      const patterns = await this.analysisService.searchPatterns(query);
      
      return {
        status: 'success',
        data: patterns,
        query: query,
        count: patterns.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error searching patterns: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to search patterns',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('rules')
  @ApiOperation({ 
    summary: 'Get detection rules',
    description: 'Retrieves detection rules, optionally filtered by database type'
  })
  @ApiQuery({ 
    name: 'database_type', 
    required: false, 
    enum: ['mysql', 'postgresql', 'mssql', 'oracle', 'sqlite'],
    description: 'Filter rules by database type'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Detection rules retrieved successfully'
  })
  async getDetectionRules(@Query('database_type') databaseType?: string) {
    try {
      const rules = await this.analysisService.getDetectionRules(databaseType);
      
      return {
        status: 'success',
        data: rules,
        count: rules.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving detection rules: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve detection rules',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('knowledge')
  @ApiOperation({ 
    summary: 'Get security knowledge base',
    description: 'Retrieves security knowledge items, optionally filtered by category'
  })
  @ApiQuery({ 
    name: 'category', 
    required: false, 
    description: 'Filter by knowledge category',
    example: 'Input Validation'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Security knowledge retrieved successfully'
  })
  async getSecurityKnowledge(@Query('category') category?: string) {
    try {
      const knowledge = await this.analysisService.getSecurityKnowledge(category);
      
      return {
        status: 'success',
        data: knowledge,
        count: knowledge.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving security knowledge: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve security knowledge',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('knowledge/categories')
  @ApiOperation({ 
    summary: 'Get knowledge categories',
    description: 'Retrieves all available knowledge categories with counts'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Categories retrieved successfully'
  })
  async getKnowledgeCategories() {
    try {
      const categories = await this.analysisService.getKnowledgeCategories();
      
      return {
        status: 'success',
        data: categories,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving categories: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve categories',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('examples')
  @ApiOperation({ 
    summary: 'Get vulnerable code examples',
    description: 'Retrieves examples of vulnerable code and their secure alternatives'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Examples retrieved successfully'
  })
  async getVulnerableExamples() {
    try {
      const examples = await this.analysisService.getVulnerableExamples();
      
      return {
        status: 'success',
        data: examples,
        count: examples.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving examples: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve examples',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('analytics')
  @ApiOperation({ 
    summary: 'Get analytics data',
    description: 'Retrieves analytics and statistics about the knowledge base'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Analytics data retrieved successfully'
  })
  async getAnalyticsData() {
    try {
      const analytics = await this.analysisService.getAnalyticsData();
      
      return {
        status: 'success',
        data: analytics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error retrieving analytics: ${error.message}`, error.stack);
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to retrieve analytics',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
