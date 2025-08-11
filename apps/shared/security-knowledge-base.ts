/**
 * Security Pattern Interface
 * 
 * Defines the structure for security attack patterns and their characteristics.
 * Used to catalog known attack vectors and their associated metadata.
 */
export interface SecurityPattern {
  id: string;                      // Unique identifier for the pattern
  name: string;                    // Human-readable name of the attack pattern
  description: string;             // Detailed description of the attack
  pattern: string;                 // Regex pattern for detection
  severity: 'critical' | 'high' | 'medium' | 'low'; // Risk severity level
  examples: string[];              // Example attack payloads
  mitigation: string[];            // Recommended mitigation strategies
}

/**
 * Detection Rule Interface
 * 
 * Represents a security detection rule with confidence metrics.
 * Used by the detection engine to identify potential threats.
 */
export interface DetectionRule {
  id: string;                      // Unique rule identifier
  name: string;                    // Rule name for reference
  description: string;             // Description of what the rule detects
  rule_type: 'regex' | 'semantic' | 'heuristic'; // Type of detection logic
  pattern: string;                 // Detection pattern or logic
  confidence: number;              // Confidence score (0-1)
  false_positive_rate: number;     // Expected false positive rate
  database_types: string[];        // Applicable database systems
}

/**
 * Security Knowledge Item Interface
 * 
 * Contains educational security information including best practices,
 * code examples, and reference materials for developers.
 */
export interface SecurityKnowledgeItem {
  id: string;                      // Unique knowledge item identifier
  category: string;                // Security category (e.g., Input Validation)
  title: string;                   // Title of the knowledge item
  description: string;             // Detailed description
  best_practices: string[];        // List of recommended practices
  code_examples: CodeExample[];    // Practical code examples
  references: string[];            // External reference links
}

/**
 * Code Example Interface
 * 
 * Provides before/after code examples showing vulnerable and secure
 * implementations for educational purposes.
 */
export interface CodeExample {
  language: string;                // Programming language
  framework?: string;              // Optional framework specification
  vulnerable_code: string;         // Example of vulnerable code
  secure_code: string;             // Secure alternative implementation
  explanation: string;             // Explanation of the security improvement
}

/**
 * Vulnerable Example Interface
 * 
 * Represents a specific vulnerability example with exploitation
 * scenarios and remediation guidance.
 */
export interface VulnerableExample {
  id: string;                      // Unique example identifier
  title: string;                   // Title of the vulnerability example
  description: string;             // Detailed description
  vulnerability_type: string;      // Type of vulnerability demonstrated
  code: string;                    // Vulnerable code snippet
  exploitation_scenario: string;   // How the vulnerability can be exploited
  fix: string;                     // Code fix for the vulnerability
  prevention_measures: string[];   // Additional prevention measures
}

/**
 * Security Knowledge Base
 * 
 * Comprehensive repository of security patterns, detection rules, and educational
 * content for SQL injection and related security vulnerabilities. This class serves
 * as the central knowledge store for the security detection system.
 * 
 * Features:
 * - Catalog of known attack patterns with detection signatures
 * - Detection rules with confidence scoring and false positive rates
 * - Educational content with code examples and best practices
 * - Vulnerable code examples with secure alternatives
 * - Query methods for retrieving specific security information
 * 
 * @class SecurityKnowledgeBase
 */
export class SecurityKnowledgeBase {
  private commonPatterns: SecurityPattern[] = [
    {
      id: 'sqli-union-based',
      name: 'UNION-based SQL Injection',
      description: 'Injection technique using UNION statements to extract data from database',
      pattern: 'UNION\\s+(ALL\\s+)?SELECT',
      severity: 'high',
      examples: [
        "' UNION SELECT username, password FROM users--",
        "1' UNION ALL SELECT null, version(), null--",
        "' UNION SELECT 1,2,3,4,5,6,7,8,9,10--"
      ],
      mitigation: [
        'Use parameterized queries',
        'Implement input validation',
        'Apply least privilege principle',
        'Use stored procedures where appropriate'
      ]
    },
    {
      id: 'sqli-boolean-blind',
      name: 'Boolean-based Blind SQL Injection',
      description: 'Injection technique that relies on boolean responses to extract data',
      pattern: '(AND|OR)\\s+(\\d+\\s*=\\s*\\d+|\\\'\\w+\\\'\\s*=\\s*\\\'\\w+\\\')',
      severity: 'medium',
      examples: [
        "' AND 1=1--",
        "' OR 'a'='a'--",
        "' AND (SELECT COUNT(*) FROM users) > 0--"
      ],
      mitigation: [
        'Use parameterized queries',
        'Implement proper error handling',
        'Avoid exposing database errors to users'
      ]
    },
    {
      id: 'sqli-time-based',
      name: 'Time-based Blind SQL Injection',
      description: 'Injection technique that uses time delays to infer information',
      pattern: '(SLEEP|WAITFOR\\s+DELAY|BENCHMARK)\\s*\\(',
      severity: 'medium',
      examples: [
        "'; WAITFOR DELAY '00:00:05'--",
        "' OR SLEEP(5)--",
        "'; SELECT BENCHMARK(5000000, MD5(1))--"
      ],
      mitigation: [
        'Use parameterized queries',
        'Implement query timeouts',
        'Monitor database performance for anomalies'
      ]
    },
    {
      id: 'sqli-error-based',
      name: 'Error-based SQL Injection',
      description: 'Injection technique that leverages database error messages',
      pattern: '(CAST|CONVERT|EXTRACTVALUE|UPDATEXML)\\s*\\(',
      severity: 'high',
      examples: [
        "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version()), 0x7e))--",
        "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--"
      ],
      mitigation: [
        'Implement proper error handling',
        'Don\'t expose database errors to users',
        'Use parameterized queries'
      ]
    },
    {
      id: 'sqli-stacked-queries',
      name: 'Stacked Queries SQL Injection',
      description: 'Injection technique using multiple SQL statements',
      pattern: ';\\s*(DROP|DELETE|INSERT|UPDATE|CREATE)\\s+',
      severity: 'critical',
      examples: [
        "'; DROP TABLE users--",
        "'; INSERT INTO admin_users VALUES ('hacker', 'password')--",
        "'; UPDATE users SET password='hacked' WHERE id=1--"
      ],
      mitigation: [
        'Disable multiple statement execution',
        'Use database user with minimal privileges',
        'Implement strict input validation'
      ]
    }
  ];

  private detectionRules: DetectionRule[] = [
    {
      id: 'rule-001',
      name: 'SQL Keywords Detection',
      description: 'Detects common SQL keywords in user input',
      rule_type: 'regex',
      pattern: '\\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\\b',
      confidence: 0.8,
      false_positive_rate: 0.15,
      database_types: ['mysql', 'postgresql', 'mssql', 'oracle', 'sqlite']
    },
    {
      id: 'rule-002',
      name: 'Quote Manipulation',
      description: 'Detects quote-based injection attempts',
      rule_type: 'regex',
      pattern: '\\\'(\\s)*(OR|AND)\\s*\\\'\\s*=\\s*\\\'',
      confidence: 0.9,
      false_positive_rate: 0.05,
      database_types: ['mysql', 'postgresql', 'mssql', 'oracle', 'sqlite']
    },
    {
      id: 'rule-003',
      name: 'Comment Injection',
      description: 'Detects SQL comment injection patterns',
      rule_type: 'regex',
      pattern: '(--|#|\\/\\*[\\s\\S]*?\\*\\/)',
      confidence: 0.7,
      false_positive_rate: 0.2,
      database_types: ['mysql', 'postgresql', 'mssql', 'oracle']
    },
    {
      id: 'rule-004',
      name: 'Function-based Injection',
      description: 'Detects database function-based injection attempts',
      rule_type: 'regex',
      pattern: '(CONCAT|SUBSTRING|ASCII|CHAR|LENGTH|SLEEP|BENCHMARK|LOAD_FILE)',
      confidence: 0.85,
      false_positive_rate: 0.1,
      database_types: ['mysql', 'postgresql', 'mssql']
    },
    {
      id: 'rule-005',
      name: 'UNION Attack Detection',
      description: 'Detects UNION-based SQL injection attempts',
      rule_type: 'regex',
      pattern: 'UNION\\s+(ALL\\s+)?SELECT',
      confidence: 0.95,
      false_positive_rate: 0.02,
      database_types: ['mysql', 'postgresql', 'mssql', 'oracle', 'sqlite']
    }
  ];

  private securityKnowledge: SecurityKnowledgeItem[] = [
    {
      id: 'sk-001',
      category: 'Input Validation',
      title: 'Comprehensive Input Validation Strategies',
      description: 'Best practices for validating and sanitizing user input to prevent injection attacks',
      best_practices: [
        'Implement whitelist-based validation',
        'Validate data type, length, format, and range',
        'Sanitize input by removing or encoding special characters',
        'Use regular expressions for pattern matching',
        'Implement server-side validation (never rely solely on client-side)',
        'Log validation failures for security monitoring'
      ],
      code_examples: [
        {
          language: 'typescript',
          framework: 'nestjs',
          vulnerable_code: `
// Vulnerable: No input validation
@Get('/user/:id')
async getUser(@Param('id') userId: string) {
  const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
  return this.database.query(query);
}`,
          secure_code: `
// Secure: With input validation and parameterized query
@Get('/user/:id')
async getUser(@Param('id', ParseIntPipe) userId: number) {
  if (userId <= 0 || userId > 999999) {
    throw new BadRequestException('Invalid user ID');
  }
  return this.userRepository.findOne({ where: { id: userId } });
}`,
          explanation: 'The secure version validates the input type, range, and uses ORM with parameterized queries'
        }
      ],
      references: [
        'https://owasp.org/www-project-proactive-controls/',
        'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html'
      ]
    },
    {
      id: 'sk-002',
      category: 'Parameterized Queries',
      title: 'Implementing Secure Database Queries',
      description: 'How to implement parameterized queries across different database technologies',
      best_practices: [
        'Always use parameterized queries or prepared statements',
        'Never concatenate user input directly into SQL strings',
        'Use ORM frameworks that provide built-in protection',
        'Implement query result limiting to prevent data exposure',
        'Use stored procedures with proper input validation'
      ],
      code_examples: [
        {
          language: 'typescript',
          framework: 'prisma',
          vulnerable_code: `
// Vulnerable: String concatenation
const user = await prisma.$queryRaw\`
  SELECT * FROM users WHERE email = '\${email}' AND password = '\${password}'
\`;`,
          secure_code: `
// Secure: Parameterized query with Prisma
const user = await prisma.user.findFirst({
  where: {
    email: email,
    password: await bcrypt.hash(password, 10)
  }
});`,
          explanation: 'Use Prisma ORM methods instead of raw queries, and always hash passwords'
        }
      ],
      references: [
        'https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access',
        'https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html'
      ]
    },
    {
      id: 'sk-003',
      category: 'Access Control',
      title: 'Database Access Control and Privilege Management',
      description: 'Implementing proper access controls and following the principle of least privilege',
      best_practices: [
        'Create separate database users for different application components',
        'Grant minimum necessary privileges to database users',
        'Use connection pooling with proper authentication',
        'Implement role-based access control (RBAC)',
        'Regularly audit database user privileges',
        'Use database-specific security features'
      ],
      code_examples: [
        {
          language: 'sql',
          vulnerable_code: `
-- Vulnerable: Application using DBA account
GRANT ALL PRIVILEGES ON *.* TO 'app_user'@'%' IDENTIFIED BY 'password';`,
          secure_code: `
-- Secure: Limited privileges for application user
CREATE USER 'app_read'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT ON app_db.users TO 'app_read'@'localhost';
GRANT INSERT, UPDATE ON app_db.user_sessions TO 'app_read'@'localhost';
FLUSH PRIVILEGES;`,
          explanation: 'Create specific users with only the privileges they need for their function'
        }
      ],
      references: [
        'https://dev.mysql.com/doc/refman/8.0/en/privilege-system.html',
        'https://www.postgresql.org/docs/current/user-manag.html'
      ]
    }
  ];

  private vulnerableExamples: VulnerableExample[] = [
    {
      id: 've-001',
      title: 'Login Bypass via SQL Injection',
      description: 'Classic authentication bypass using SQL injection in login form',
      vulnerability_type: 'SQL Injection - Authentication Bypass',
      code: `
// Vulnerable login function
async function authenticateUser(username: string, password: string): Promise<User | null> {
  const query = \`
    SELECT * FROM users 
    WHERE username = '\${username}' AND password = '\${password}'
  \`;
  
  const result = await database.query(query);
  return result.rows[0] || null;
}`,
      exploitation_scenario: `
An attacker can bypass authentication by entering:
Username: admin
Password: ' OR '1'='1' --

This creates the query:
SELECT * FROM users WHERE username = 'admin' AND password = '' OR '1'='1' --'

The OR '1'='1' condition is always true, and the -- comments out the rest.`,
      fix: `
// Secure login function using parameterized queries
async function authenticateUser(username: string, password: string): Promise<User | null> {
  // Input validation
  if (!username || !password || username.length > 100 || password.length > 200) {
    return null;
  }
  
  // Use parameterized query
  const user = await userRepository.findOne({
    where: { username }
  });
  
  if (user && await bcrypt.compare(password, user.passwordHash)) {
    return user;
  }
  
  return null;
}`,
      prevention_measures: [
        'Use parameterized queries or ORM methods',
        'Implement proper input validation',
        'Hash passwords using bcrypt or similar',
        'Add rate limiting for login attempts',
        'Log failed authentication attempts',
        'Use multi-factor authentication'
      ]
    },
    {
      id: 've-002',
      title: 'Data Extraction via UNION Injection',
      description: 'Extracting sensitive data using UNION-based SQL injection',
      vulnerability_type: 'SQL Injection - Data Extraction',
      code: `
// Vulnerable search function
async function searchProducts(searchTerm: string): Promise<Product[]> {
  const query = \`
    SELECT id, name, description, price 
    FROM products 
    WHERE name LIKE '%\${searchTerm}%'
  \`;
  
  const result = await database.query(query);
  return result.rows;
}`,
      exploitation_scenario: `
An attacker can extract user data by entering:
searchTerm: laptop' UNION SELECT id, username, email, password FROM users--

This creates the query:
SELECT id, name, description, price FROM products WHERE name LIKE '%laptop' UNION SELECT id, username, email, password FROM users--%'

The UNION allows extraction of user credentials.`,
      fix: `
// Secure search function
async function searchProducts(searchTerm: string): Promise<Product[]> {
  // Input validation and sanitization
  if (!searchTerm || searchTerm.length > 50) {
    return [];
  }
  
  // Remove special characters except alphanumeric and spaces
  const sanitizedTerm = searchTerm.replace(/[^a-zA-Z0-9\\s]/g, '');
  
  // Use parameterized query
  return await productRepository.find({
    where: {
      name: Like(\`%\${sanitizedTerm}%\`)
    },
    select: ['id', 'name', 'description', 'price'] // Only select needed fields
  });
}`,
      prevention_measures: [
        'Use parameterized queries',
        'Implement strict input validation',
        'Sanitize search terms',
        'Limit query results',
        'Use database views to restrict data access',
        'Monitor for suspicious query patterns'
      ]
    },
    {
      id: 've-003',
      title: 'Database Destruction via Stacked Queries',
      description: 'Malicious database operations using stacked query injection',
      vulnerability_type: 'SQL Injection - Database Manipulation',
      code: `
// Vulnerable user update function
async function updateUserProfile(userId: string, profileData: any): Promise<void> {
  const query = \`
    UPDATE users 
    SET name = '\${profileData.name}', 
        email = '\${profileData.email}' 
    WHERE id = \${userId}
  \`;
  
  await database.query(query);
}`,
      exploitation_scenario: `
An attacker can execute destructive operations:
profileData.name: "hacker'; DROP TABLE users; --"

This creates the query:
UPDATE users SET name = 'hacker'; DROP TABLE users; --', email = '...' WHERE id = 1

The stacked query allows execution of the DROP TABLE command.`,
      fix: `
// Secure user update function
async function updateUserProfile(userId: number, profileData: UpdateUserDto): Promise<void> {
  // Input validation using DTO validation
  const validationErrors = await validate(profileData);
  if (validationErrors.length > 0) {
    throw new ValidationException(validationErrors);
  }
  
  // Use ORM with built-in protection
  await userRepository.update(userId, {
    name: profileData.name,
    email: profileData.email
  });
}`,
      prevention_measures: [
        'Disable multiple statement execution in database configuration',
        'Use ORM methods instead of raw queries',
        'Implement comprehensive input validation',
        'Use database transactions for data integrity',
        'Apply principle of least privilege for database users',
        'Regular database backups and monitoring'
      ]
    }
  ];

  /**
   * Common Security Patterns Accessor
   * 
   * Retrieves the complete collection of security patterns from the knowledge base.
   * These patterns represent known attack vectors and their detection signatures.
   * 
   * @async
   * @function getCommonPatterns
   * @returns {Promise<SecurityPattern[]>} Complete array of security patterns
   */
  public async getCommonPatterns(): Promise<SecurityPattern[]> {
    return this.commonPatterns;
  }

  /**
   * Detection Rules Accessor
   * 
   * Retrieves all detection rules used by the security scanner.
   * These rules include confidence scores and false positive rates
   * for accurate threat assessment.
   * 
   * @async
   * @function getDetectionRules
   * @returns {Promise<DetectionRule[]>} Complete array of detection rules
   */
  public async getDetectionRules(): Promise<DetectionRule[]> {
    return this.detectionRules;
  }

  /**
   * Security Knowledge Accessor
   * 
   * Retrieves educational security content including best practices,
   * code examples, and reference materials for developer guidance.
   * 
   * @async
   * @function getSecurityKnowledge
   * @returns {Promise<SecurityKnowledgeItem[]>} Complete array of security knowledge items
   */
  public async getSecurityKnowledge(): Promise<SecurityKnowledgeItem[]> {
    return this.securityKnowledge;
  }

  /**
   * Vulnerable Examples Accessor
   * 
   * Retrieves practical examples of vulnerable code with exploitation
   * scenarios and remediation guidance for educational purposes.
   * 
   * @async
   * @function getVulnerableExamples
   * @returns {Promise<VulnerableExample[]>} Complete array of vulnerable code examples
   */
  public async getVulnerableExamples(): Promise<VulnerableExample[]> {
    return this.vulnerableExamples;
  }

  /**
   * Pattern Lookup by ID
   * 
   * Retrieves a specific security pattern by its unique identifier.
   * Used for detailed pattern information and reference lookup.
   * 
   * @async
   * @function getPatternById
   * @param {string} id - Unique pattern identifier to search for
   * @returns {Promise<SecurityPattern | undefined>} The matching pattern or undefined if not found
   */
  public async getPatternById(id: string): Promise<SecurityPattern | undefined> {
    return this.commonPatterns.find(pattern => pattern.id === id);
  }

  /**
   * Detection Rule Lookup by ID
   * 
   * Retrieves a specific detection rule by its unique identifier.
   * Used for rule configuration and performance analysis.
   * 
   * @async
   * @function getRuleById
   * @param {string} id - Unique rule identifier to search for
   * @returns {Promise<DetectionRule | undefined>} The matching rule or undefined if not found
   */
  public async getRuleById(id: string): Promise<DetectionRule | undefined> {
    return this.detectionRules.find(rule => rule.id === id);
  }

  /**
   * Knowledge Item Lookup by ID
   * 
   * Retrieves a specific security knowledge item by its unique identifier.
   * Used for accessing detailed educational content and best practices.
   * 
   * @async
   * @function getKnowledgeById
   * @param {string} id - Unique knowledge item identifier to search for
   * @returns {Promise<SecurityKnowledgeItem | undefined>} The matching knowledge item or undefined if not found
   */
  public async getKnowledgeById(id: string): Promise<SecurityKnowledgeItem | undefined> {
    return this.securityKnowledge.find(item => item.id === id);
  }

  /**
   * Vulnerable Example Lookup by ID
   * 
   * Retrieves a specific vulnerable code example by its unique identifier.
   * Used for accessing detailed vulnerability demonstrations and fixes.
   * 
   * @async
   * @function getExampleById
   * @param {string} id - Unique example identifier to search for
   * @returns {Promise<VulnerableExample | undefined>} The matching example or undefined if not found
   */
  public async getExampleById(id: string): Promise<VulnerableExample | undefined> {
    return this.vulnerableExamples.find(example => example.id === id);
  }

  /**
   * Pattern Search Engine
   * 
   * Searches through security patterns using a text query against
   * pattern names, descriptions, and examples. Provides fuzzy search
   * capability for finding relevant attack patterns.
   * 
   * @async
   * @function searchPatterns
   * @param {string} query - Search query to match against pattern content
   * @returns {Promise<SecurityPattern[]>} Array of patterns matching the search query
   */
  public async searchPatterns(query: string): Promise<SecurityPattern[]> {
    const lowercaseQuery = query.toLowerCase();
    // Search across pattern name, description, and examples for comprehensive results
    return this.commonPatterns.filter(pattern =>
      pattern.name.toLowerCase().includes(lowercaseQuery) ||
      pattern.description.toLowerCase().includes(lowercaseQuery) ||
      pattern.examples.some(example => example.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Severity-Based Pattern Filter
   * 
   * Filters security patterns by their severity level to prioritize
   * security responses and focus on the most critical threats.
   * 
   * @async
   * @function getPatternsBySeverity
   * @param {string} severity - Severity level to filter by (critical, high, medium, low)
   * @returns {Promise<SecurityPattern[]>} Array of patterns with the specified severity level
   */
  public async getPatternsBySeverity(severity: 'critical' | 'high' | 'medium' | 'low'): Promise<SecurityPattern[]> {
    return this.commonPatterns.filter(pattern => pattern.severity === severity);
  }

  /**
   * Database-Specific Rule Filter
   * 
   * Filters detection rules by database type to ensure only applicable
   * rules are used for specific database management systems.
   * 
   * @async
   * @function getRulesByDatabaseType
   * @param {string} databaseType - Database type to filter rules for (mysql, postgresql, etc.)
   * @returns {Promise<DetectionRule[]>} Array of rules applicable to the specified database type
   */
  public async getRulesByDatabaseType(databaseType: string): Promise<DetectionRule[]> {
    return this.detectionRules.filter(rule =>
      rule.database_types.includes(databaseType.toLowerCase())
    );
  }

  /**
   * Category-Based Knowledge Filter
   * 
   * Filters security knowledge items by category to provide targeted
   * educational content for specific security domains.
   * 
   * @async
   * @function getKnowledgeByCategory
   * @param {string} category - Security category to filter by (Input Validation, etc.)
   * @returns {Promise<SecurityKnowledgeItem[]>} Array of knowledge items in the specified category
   */
  public async getKnowledgeByCategory(category: string): Promise<SecurityKnowledgeItem[]> {
    return this.securityKnowledge.filter(item =>
      item.category.toLowerCase() === category.toLowerCase()
    );
  }
}
