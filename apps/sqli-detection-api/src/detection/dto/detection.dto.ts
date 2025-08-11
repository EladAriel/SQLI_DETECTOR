import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyzeQueryDto {
  @ApiProperty({
    description: 'SQL query to analyze for injection vulnerabilities',
    example: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
    maxLength: 5000
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  query: string;

  @ApiPropertyOptional({
    description: 'Database type for more accurate analysis',
    enum: ['mysql', 'postgresql', 'sqlite', 'mssql'],
    example: 'mysql'
  })
  @IsOptional()
  @IsEnum(['mysql', 'postgresql', 'sqlite', 'mssql'])
  database_type?: 'mysql' | 'postgresql' | 'sqlite' | 'mssql';
}

export class SecurityScanDto {
  @ApiProperty({
    description: 'Payload to scan for security vulnerabilities',
    example: "'; DROP TABLE users; --",
    maxLength: 10000
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  payload: string;

  @ApiPropertyOptional({
    description: 'Type of security scan to perform',
    enum: ['input_validation', 'sql_injection', 'xss', 'comprehensive'],
    example: 'comprehensive'
  })
  @IsOptional()
  @IsEnum(['input_validation', 'sql_injection', 'xss', 'comprehensive'])
  scan_type?: 'input_validation' | 'sql_injection' | 'xss' | 'comprehensive';
}

export class BatchAnalyzeDto {
  @ApiProperty({
    description: 'Array of SQL queries to analyze',
    example: [
      "SELECT * FROM users WHERE id = 1",
      "SELECT * FROM users WHERE name = 'admin' OR '1'='1'"
    ],
    maxItems: 50
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  queries: string[];

  @ApiPropertyOptional({
    description: 'Database type for more accurate analysis',
    enum: ['mysql', 'postgresql', 'sqlite', 'mssql'],
    example: 'mysql'
  })
  @IsOptional()
  @IsEnum(['mysql', 'postgresql', 'sqlite', 'mssql'])
  database_type?: 'mysql' | 'postgresql' | 'sqlite' | 'mssql';
}

export class GenerateSecureQueryDto {
  @ApiProperty({
    description: 'Vulnerable SQL query to secure',
    example: "SELECT * FROM users WHERE id = '" + "' + userId + '",
    maxLength: 5000
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  vulnerable_query: string;

  @ApiPropertyOptional({
    description: 'Parameters to use in the secure query',
    example: { userId: 123, userName: 'john_doe' }
  })
  @IsOptional()
  parameters?: Record<string, any>;
}
