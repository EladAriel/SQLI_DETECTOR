import { Test, TestingModule } from '@nestjs/testing';
import { DetectionService } from '../apps/sqli-detection-api/src/detection/detection.service';
import { AnalyzeQueryDto, SecurityScanDto } from '../apps/sqli-detection-api/src/detection/dto/detection.dto';

describe('DetectionService', () => {
  let service: DetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DetectionService],
    }).compile();

    service = module.get<DetectionService>(DetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeQuery', () => {
    it('should detect SQL injection in basic OR attack', async () => {
      const queryDto: AnalyzeQueryDto = {
        query: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
        database_type: 'mysql'
      };

      const result = await service.analyzeQuery(queryDto);

      expect(result.isVulnerable).toBe(true);
      expect(result.score).toBeGreaterThan(20);
      expect(result.detectedPatterns).toBeDefined();
      expect(result.riskFactors).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should not flag secure parameterized query', async () => {
      const queryDto: AnalyzeQueryDto = {
        query: "SELECT * FROM users WHERE id = ?",
        database_type: 'mysql'
      };

      const result = await service.analyzeQuery(queryDto);

      expect(result.isVulnerable).toBe(false);
      expect(result.score).toBeLessThanOrEqual(20);
    });

    it('should detect UNION-based injection', async () => {
      const queryDto: AnalyzeQueryDto = {
        query: "SELECT name FROM products WHERE id = 1 UNION SELECT password FROM users",
        database_type: 'postgresql'
      };

      const result = await service.analyzeQuery(queryDto);

      expect(result.isVulnerable).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.detectedPatterns.some(p => p.includes('UNION'))).toBe(true);
    });

    it('should detect time-based blind injection', async () => {
      const queryDto: AnalyzeQueryDto = {
        query: "SELECT * FROM users WHERE id = 1; WAITFOR DELAY '00:00:05'",
        database_type: 'mssql'
      };

      const result = await service.analyzeQuery(queryDto);

      expect(result.isVulnerable).toBe(true);
      expect(result.detectedPatterns.some(p => p.includes('WAITFOR'))).toBe(true);
    });
  });

  describe('performSecurityScan', () => {
    it('should detect multiple vulnerability types in comprehensive scan', async () => {
      const scanDto: SecurityScanDto = {
        payload: "'; DROP TABLE users; <script>alert('xss')</script>",
        scan_type: 'comprehensive'
      };

      const result = await service.performSecurityScan(scanDto);

      expect(result.vulnerabilities.length).toBeGreaterThan(0);
      expect(result.vulnerabilities.some(v => v.type === 'SQL Injection')).toBe(true);
      expect(result.vulnerabilities.some(v => v.type === 'Cross-Site Scripting (XSS)')).toBe(true);
      expect(result.risk_score).toBeGreaterThan(50);
    });

    it('should focus on SQL injection in targeted scan', async () => {
      const scanDto: SecurityScanDto = {
        payload: "1' OR 1=1 --",
        scan_type: 'sql_injection'
      };

      const result = await service.performSecurityScan(scanDto);

      expect(result.scan_type).toBe('sql_injection');
      expect(result.vulnerabilities.some(v => v.type === 'SQL Injection')).toBe(true);
    });
  });

  describe('generateSecureQuery', () => {
    it('should convert vulnerable query to secure parameterized version', async () => {
      const vulnerableQuery = "SELECT * FROM users WHERE email = 'user@example.com' AND status = 'active'";
      
      const result = await service.generateSecureQuery(vulnerableQuery);

      expect(result.original).toBe(vulnerableQuery);
      expect(result.secure).not.toBe(vulnerableQuery);
      expect(result.secure).toContain('$');
      expect(result.parameters).toBeDefined();
      expect(result.explanation).toBeDefined();
    });
  });

  describe('batchAnalyze', () => {
    it('should analyze multiple queries and return summary', async () => {
      const queries = [
        "SELECT * FROM users WHERE id = ?",
        "SELECT * FROM users WHERE id = '1' OR '1'='1'",
        "SELECT name FROM products WHERE category = 'electronics'"
      ];

      const results = await service.batchAnalyze(queries);

      expect(results).toHaveLength(3);
      expect(results[0].isVulnerable).toBe(false);
      expect(results[1].isVulnerable).toBe(true);
    });
  });

  describe('getDetectionStats', () => {
    it('should return detection statistics', async () => {
      const stats = await service.getDetectionStats();

      expect(stats).toBeDefined();
      expect(stats.total_scans).toBeDefined();
      expect(stats.vulnerable_queries).toBeDefined();
      expect(stats.avg_risk_score).toBeDefined();
      expect(stats.last_scan_time).toBeDefined();
    });
  });
});
