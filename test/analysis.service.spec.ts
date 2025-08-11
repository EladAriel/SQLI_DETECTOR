import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from '../apps/sqli-detection-api/src/analysis/analysis.service';

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalysisService],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPatterns', () => {
    it('should return patterns', async () => {
      const patterns = await service.getPatterns();
      
      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should return patterns by severity', async () => {
      const patterns = await service.getPatterns('high');
      
      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('getDetectionRules', () => {
    it('should return detection rules', async () => {
      const rules = await service.getDetectionRules();
      
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
    });

    it('should return rules by database type', async () => {
      const rules = await service.getDetectionRules('mysql');
      
      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
    });
  });

  describe('getSecurityKnowledge', () => {
    it('should return security knowledge', async () => {
      const knowledge = await service.getSecurityKnowledge();
      
      expect(knowledge).toBeDefined();
      expect(Array.isArray(knowledge)).toBe(true);
    });

    it('should return knowledge by category', async () => {
      const knowledge = await service.getSecurityKnowledge('sql-injection');
      
      expect(knowledge).toBeDefined();
      expect(Array.isArray(knowledge)).toBe(true);
    });
  });

  describe('getVulnerableExamples', () => {
    it('should return vulnerable examples', async () => {
      const examples = await service.getVulnerableExamples();
      
      expect(examples).toBeDefined();
      expect(Array.isArray(examples)).toBe(true);
    });
  });

  describe('searchPatterns', () => {
    it('should search patterns', async () => {
      const results = await service.searchPatterns('union');
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
