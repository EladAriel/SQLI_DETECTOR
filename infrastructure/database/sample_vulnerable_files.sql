-- SQL Injection Detection Database Initialization
-- This script creates sample vulnerable files for testing the MCP server workflow

-- Connect to the database (uncomment if needed)
-- \c sql_injection_db;

-- Insert sample vulnerable SQL files for testing
INSERT INTO "File" (
  "filename", 
  "fileType", 
  "content", 
  "checksum", 
  "uploadDate", 
  "createdAt", 
  "updatedAt"
) VALUES 
  -- Vulnerable Login Query
  (
    'mal_sql_login.sql',
    'sql',
    'SELECT * FROM users WHERE username = ''' || input_username || ''' AND password = ''' || input_password || ''';
-- This is a classic SQL injection vulnerability
-- An attacker could inject: '' OR ''1''=''1'' --
-- Making the query: SELECT * FROM users WHERE username = '''' OR ''1''=''1'' --'' AND password = ''''',
    'vuln_001_login',
    NOW(),
    NOW(),
    NOW()
  ),
  
  -- Vulnerable Search Function
  (
    'mal_sql_search.php',
    'php',
    '<?php
// Vulnerable search functionality
$search_term = $_GET["search"];
$query = "SELECT * FROM products WHERE name LIKE ''%" . $search_term . "%'' OR description LIKE ''%" . $search_term . "%''";
$result = mysqli_query($connection, $query);

// This allows SQL injection through the search parameter
// Example attack: search='' UNION SELECT username,password FROM users --
?>',
    'vuln_002_search',
    NOW(),
    NOW(),
    NOW()
  ),

  -- Vulnerable Dynamic Query Builder
  (
    'mal_sql_dynamic.js',
    'js',
    'function getUserData(userId, sortBy, filterBy) {
    // Dangerous dynamic query building
    let query = "SELECT * FROM user_profiles WHERE user_id = " + userId;
    
    if (filterBy) {
        query += " AND " + filterBy;
    }
    
    if (sortBy) {
        query += " ORDER BY " + sortBy;
    }
    
    return db.query(query);
}

// This function is vulnerable to SQL injection in all parameters
// userId: getUserData("1; DROP TABLE users; --")
// filterBy: getUserData(1, null, "1=1 UNION SELECT * FROM admin_users")
// sortBy: getUserData(1, "name; UPDATE users SET admin=1; --")',
    'vuln_003_dynamic',
    NOW(),
    NOW(),
    NOW()
  ),

  -- Vulnerable Stored Procedure Call
  (
    'mal_sql_procedure.sql',
    'sql',
    'CREATE PROCEDURE GetUserOrders(@UserId VARCHAR(50), @Status VARCHAR(50))
AS
BEGIN
    DECLARE @SQL NVARCHAR(4000)
    SET @SQL = ''SELECT * FROM orders WHERE user_id = '''''' + @UserId + '''''' AND status = '''''' + @Status + ''''''''
    EXEC sp_executesql @SQL
END

-- Usage that enables injection:
-- EXEC GetUserOrders ''1''; DROP TABLE orders; --'', ''active''
-- The dynamic SQL construction makes this vulnerable',
    'vuln_004_procedure',
    NOW(),
    NOW(),
    NOW()
  ),

  -- Vulnerable Admin Panel
  (
    'mal_sql_admin.py',
    'py',
    'import sqlite3

def admin_query(user_input, table_name):
    """
    Vulnerable admin function that allows dynamic table queries
    """
    conn = sqlite3.connect(''database.db'')
    cursor = conn.cursor()
    
    # DANGEROUS: Direct string concatenation
    query = f"SELECT * FROM {table_name} WHERE data LIKE ''%{user_input}%''"
    
    try:
        cursor.execute(query)
        results = cursor.fetchall()
        return results
    except Exception as e:
        return f"Error: {e}"
    finally:
        conn.close()

# This function is vulnerable to:
# 1. Table name injection: table_name = "users; DROP TABLE logs; --"
# 2. Data injection: user_input = "'' UNION SELECT password FROM users --"',
    'vuln_005_admin',
    NOW(),
    NOW(),
    NOW()
  ),

  -- Secure Example (for comparison)
  (
    'secure_example.sql',
    'sql',
    '-- SECURE: Parameterized query example
SELECT u.id, u.username, u.email 
FROM users u 
WHERE u.username = $1 
  AND u.password_hash = $2 
  AND u.active = true
  AND u.created_at > $3;

-- SECURE: Using prepared statements
PREPARE user_search (text, text, timestamp) AS
  SELECT * FROM users 
  WHERE username = $1 
    AND email = $2 
    AND created_at > $3;

-- SECURE: Input validation and sanitization
-- All user inputs should be validated before use
-- Use allowlists for dynamic elements like column names
-- Always use parameterized queries or prepared statements',
    'secure_example_001',
    NOW(),
    NOW(),
    NOW()
  ),

  -- Complex Vulnerable Application Code
  (
    'mal_sql_complex.ts',
    'ts',
    'interface SearchFilters {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: ''ASC'' | ''DESC'';
}

class ProductService {
    async searchProducts(searchTerm: string, filters: SearchFilters) {
        // VULNERABLE: Building query with string concatenation
        let query = `SELECT p.*, c.name as category_name 
                     FROM products p 
                     LEFT JOIN categories c ON p.category_id = c.id 
                     WHERE p.name LIKE ''%${searchTerm}%''`;
        
        if (filters.category) {
            // VULNERABLE: Direct filter injection
            query += ` AND c.name = ''${filters.category}''`;
        }
        
        if (filters.minPrice) {
            query += ` AND p.price >= ${filters.minPrice}`;
        }
        
        if (filters.maxPrice) {
            query += ` AND p.price <= ${filters.maxPrice}`;
        }
        
        if (filters.sortBy) {
            // EXTREMELY VULNERABLE: Direct column name injection
            query += ` ORDER BY ${filters.sortBy}`;
            
            if (filters.sortOrder) {
                query += ` ${filters.sortOrder}`;
            }
        }
        
        return this.db.query(query);
    }
}

// Attack examples:
// searchTerm: "'' UNION SELECT username,password FROM admin_users --"
// filters.category: "electronics'' OR ''1''=''1'' --"
// filters.sortBy: "price; DROP TABLE products; --"',
    'vuln_006_complex',
    NOW(),
    NOW(),
    NOW()
  );

-- Insert corresponding file chunks for RAG functionality
INSERT INTO "FileChunk" (
  "fileId",
  "chunkIndex", 
  "content",
  "embedding",
  "createdAt"
) 
SELECT 
  f.id,
  0 as chunkIndex,
  SUBSTRING(f.content, 1, 1000) as content,
  '[0.1, 0.2, 0.3, 0.4, 0.5]' as embedding,
  NOW() as createdAt
FROM "File" f 
WHERE f.filename LIKE 'mal_sql_%' OR f.filename = 'secure_example.sql';

-- Insert security patterns for detection
INSERT INTO "SecurityPattern" (
  "name",
  "description", 
  "pattern",
  "severity",
  "category",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'Direct String Concatenation',
    'SQL query built using direct string concatenation with user input',
    '(SELECT|INSERT|UPDATE|DELETE).*(\+|\|\||concat).*(\$|\?|input|param)',
    'high',
    'sql_injection',
    NOW(),
    NOW()
  ),
  (
    'Dynamic Column Names',
    'Dynamic column or table names without proper validation',
    'ORDER BY.*(\$|\?|input|param)|FROM.*(\$|\?|input|param)',
    'high', 
    'sql_injection',
    NOW(),
    NOW()
  ),
  (
    'UNION Attack Pattern',
    'Potential UNION-based SQL injection attack',
    'UNION.*SELECT|SELECT.*UNION',
    'high',
    'sql_injection', 
    NOW(),
    NOW()
  ),
  (
    'Comment Injection',
    'SQL comments used to bypass authentication or logic',
    '--.*(\''|\\")|\/\*.*\*\/.*(\''|\\")]',
    'medium',
    'sql_injection',
    NOW(),
    NOW()
  );

-- Create sample vulnerability detections
INSERT INTO "VulnerabilityDetection" (
  "fileId",
  "vulnerabilityType",
  "description",
  "severity", 
  "line",
  "recommendation",
  "createdAt"
)
SELECT 
  f.id,
  'SQL Injection',
  'Direct string concatenation with user input detected',
  'high',
  1,
  'Use parameterized queries or prepared statements instead of string concatenation',
  NOW()
FROM "File" f 
WHERE f.filename LIKE 'mal_sql_%';

-- Display summary of inserted data
SELECT 
  'Files' as Type,
  COUNT(*) as Count,
  STRING_AGG(filename, ', ') as Examples
FROM "File"
WHERE filename LIKE 'mal_sql_%' OR filename = 'secure_example.sql'

UNION ALL

SELECT 
  'Security Patterns' as Type,
  COUNT(*) as Count,
  STRING_AGG(name, ', ') as Examples  
FROM "SecurityPattern"

UNION ALL

SELECT 
  'Vulnerability Detections' as Type,
  COUNT(*) as Count,
  STRING_AGG(vulnerabilityType, ', ') as Examples
FROM "VulnerabilityDetection";

-- Instructions for use:
-- 1. Run this script after setting up your PostgreSQL database
-- 2. Ensure your Prisma schema matches the table structure
-- 3. Test the MCP server tools with these sample files
-- 4. Use filenames like 'mal_sql_login.sql' in MCP tool calls

COMMENT ON TABLE "File" IS 'Contains sample vulnerable and secure code files for SQL injection detection testing';
COMMENT ON TABLE "SecurityPattern" IS 'Patterns used to detect various types of security vulnerabilities';
COMMENT ON TABLE "VulnerabilityDetection" IS 'Records of detected vulnerabilities in analyzed files';
