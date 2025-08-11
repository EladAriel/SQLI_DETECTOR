import { Injectable, Logger } from '@nestjs/common';
import { SecurityKnowledgeBase } from '../../../shared/security-knowledge-base';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private readonly knowledgeBase: SecurityKnowledgeBase;

  constructor() {
    this.knowledgeBase = new SecurityKnowledgeBase();
  }

  async getPatterns(severity?: string) {
    this.logger.log(`Retrieving patterns${severity ? ' with severity: ' + severity : ''}`);
    
    if (severity) {
      return await this.knowledgeBase.getPatternsBySeverity(severity as any);
    }
    return await this.knowledgeBase.getCommonPatterns();
  }

  async getDetectionRules(databaseType?: string) {
    this.logger.log(`Retrieving detection rules${databaseType ? ' for database: ' + databaseType : ''}`);
    
    if (databaseType) {
      return await this.knowledgeBase.getRulesByDatabaseType(databaseType);
    }
    return await this.knowledgeBase.getDetectionRules();
  }

  async getSecurityKnowledge(category?: string) {
    this.logger.log(`Retrieving security knowledge${category ? ' for category: ' + category : ''}`);
    
    if (category) {
      return await this.knowledgeBase.getKnowledgeByCategory(category);
    }
    return await this.knowledgeBase.getSecurityKnowledge();
  }

  async getVulnerableExamples() {
    this.logger.log('Retrieving vulnerable code examples');
    return await this.knowledgeBase.getVulnerableExamples();
  }

  async searchPatterns(query: string) {
    this.logger.log(`Searching patterns with query: ${query}`);
    return await this.knowledgeBase.searchPatterns(query);
  }

  async getPatternById(id: string) {
    this.logger.log(`Retrieving pattern by ID: ${id}`);
    const pattern = await this.knowledgeBase.getPatternById(id);
    
    if (!pattern) {
      throw new Error(`Pattern with ID ${id} not found`);
    }
    
    return pattern;
  }

  async getKnowledgeCategories() {
    this.logger.log('Retrieving knowledge categories');
    const knowledge = await this.knowledgeBase.getSecurityKnowledge();
    const categories = [...new Set(knowledge.map(item => item.category))];
    
    return categories.map(category => ({
      name: category,
      count: knowledge.filter(item => item.category === category).length
    }));
  }

  async getAnalyticsData() {
    this.logger.log('Retrieving analytics data');
    
    const patterns = await this.knowledgeBase.getCommonPatterns();
    const rules = await this.knowledgeBase.getDetectionRules();
    const knowledge = await this.knowledgeBase.getSecurityKnowledge();
    const examples = await this.knowledgeBase.getVulnerableExamples();

    const severityDistribution = patterns.reduce((acc, pattern) => {
      acc[pattern.severity] = (acc[pattern.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const databaseSupport = rules.reduce((acc, rule) => {
      rule.database_types.forEach(db => {
        acc[db] = (acc[db] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        total_patterns: patterns.length,
        total_rules: rules.length,
        total_knowledge_items: knowledge.length,
        total_examples: examples.length
      },
      severity_distribution: severityDistribution,
      database_support: databaseSupport,
      rule_confidence_avg: rules.reduce((sum, rule) => sum + rule.confidence, 0) / rules.length,
      false_positive_rate_avg: rules.reduce((sum, rule) => sum + rule.false_positive_rate, 0) / rules.length
    };
  }
}
