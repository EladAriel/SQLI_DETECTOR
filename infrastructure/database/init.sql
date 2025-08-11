-- SQL Injection Detection Database Initialization
-- This file is automatically executed when PostgreSQL container starts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables for file storage and analysis
CREATE TABLE IF NOT EXISTS "File" (
    id SERIAL PRIMARY KEY,
    "fileName" VARCHAR(255) NOT NULL,
    "fileType" VARCHAR(50) NOT NULL,
    "filePath" VARCHAR(500),
    "content" TEXT NOT NULL,
    "checksum" VARCHAR(64) NOT NULL UNIQUE,
    "uploadDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for file chunks (for RAG)
CREATE TABLE IF NOT EXISTS "FileChunk" (
    id SERIAL PRIMARY KEY,
    "fileId" INTEGER REFERENCES "File"(id) ON DELETE CASCADE,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT DEFAULT NULL, -- JSON string for embeddings
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("fileId", "chunkIndex")
);

-- Create table for security patterns
CREATE TABLE IF NOT EXISTS "SecurityPattern" (
    id SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "pattern" TEXT NOT NULL,
    "severity" VARCHAR(20) DEFAULT 'medium',
    "category" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for vulnerability detections
CREATE TABLE IF NOT EXISTS "VulnerabilityDetection" (
    id SERIAL PRIMARY KEY,
    "fileId" INTEGER REFERENCES "File"(id) ON DELETE CASCADE,
    "vulnerabilityType" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "severity" VARCHAR(20) DEFAULT 'medium',
    "line" INTEGER,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample vulnerable files for testing
INSERT INTO "File" ("fileName", "fileType", "filePath", "content", "checksum") VALUES
('mal_sql_login.sql', 'sql', '/samples/mal_sql_login.sql', 
 'SELECT * FROM users WHERE username = '''' + input_username + '''' AND password = '''' + input_password + '''';
-- This is a classic SQL injection vulnerability
-- An attacker could inject: '''' OR ''''1''''=''''1'''' --', 
 'vuln_001_login'),
 
('mal_sql_search.php', 'php', '/samples/mal_sql_search.php',
 '<?php
// Vulnerable search functionality
$search_term = $_GET["search"];
$query = "SELECT * FROM products WHERE name LIKE ''%" . $search_term . "%''";
$result = mysqli_query($connection, $query);

// This allows SQL injection through the search parameter
// Example attack: search='' UNION SELECT username,password FROM users --
?>', 'vuln_002_search'),

('mal_sql_dynamic.js', 'js', '/samples/mal_sql_dynamic.js',
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

// This function is vulnerable to SQL injection in all parameters', 'vuln_003_dynamic'),

('mal_sql_complex.ts', 'ts', '/samples/mal_sql_complex.ts',
 'interface SearchFilters {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
}

class ProductService {
    async searchProducts(searchTerm: string, filters: SearchFilters) {
        // VULNERABLE: Building query with string concatenation
        let query = `SELECT p.*, c.name as category_name 
                     FROM products p 
                     WHERE p.name LIKE ''%${searchTerm}%''`;
        
        if (filters.category) {
            query += ` AND c.name = ''${filters.category}''`;
        }
        
        if (filters.sortBy) {
            query += ` ORDER BY ${filters.sortBy}`;
        }
        
        return this.db.query(query);
    }
}', 'vuln_004_complex'),

('secure_example.sql', 'sql', '/samples/secure_example.sql',
 '-- SECURE: Parameterized query example
SELECT u.id, u.username, u.email 
FROM users u 
WHERE u.username = $1 
  AND u.password_hash = $2 
  AND u.active = true;

-- SECURE: Using prepared statements
PREPARE user_search (text, text) AS
  SELECT * FROM users 
  WHERE username = $1 
    AND email = $2;', 'secure_example_001');

-- Insert sample security patterns
INSERT INTO "SecurityPattern" ("name", "description", "pattern", "severity", "category") VALUES
('Direct String Concatenation', 'SQL query built using direct string concatenation with user input', 
 '(SELECT|INSERT|UPDATE|DELETE).*(\+|\|\||concat).*(\$|\?|input|param)', 'high', 'sql_injection'),

('Dynamic Column Names', 'Dynamic column or table names without proper validation',
 'ORDER BY.*(\$|\?|input|param)|FROM.*(\$|\?|input|param)', 'high', 'sql_injection'),

('UNION Attack Pattern', 'Potential UNION-based SQL injection attack',
 'UNION.*SELECT|SELECT.*UNION', 'high', 'sql_injection'),

('Comment Injection', 'SQL comments used to bypass authentication or logic',
 '--.*(\''|\\")|\/\*.*\*\/.*(\''|\\")', 'medium', 'sql_injection'),

('Quote Injection', 'Unescaped quotes in SQL queries',
 '[''"].*\+.*[''"]|[''"].*\$\{.*\}.*[''"]', 'critical', 'sql_injection');

-- Insert corresponding file chunks for RAG functionality
INSERT INTO "FileChunk" ("fileId", "chunkIndex", "content", "embedding") 
SELECT 
  f.id,
  0 as chunkIndex,
  SUBSTRING(f.content, 1, 1000) as content,
  '[0.1, 0.2, 0.3, 0.4, 0.5]' as embedding
FROM "File" f 
WHERE f."fileName" LIKE 'mal_sql_%' OR f."fileName" = 'secure_example.sql';

-- Insert sample vulnerability detections
INSERT INTO "VulnerabilityDetection" ("fileId", "vulnerabilityType", "description", "severity", "line", "recommendation")
SELECT 
  f.id,
  'SQL Injection',
  'Direct string concatenation with user input detected',
  'high',
  1,
  'Use parameterized queries or prepared statements instead of string concatenation'
FROM "File" f 
WHERE f."fileName" LIKE 'mal_sql_%';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_filename ON "File"("fileName");
CREATE INDEX IF NOT EXISTS idx_file_type ON "File"("fileType");
CREATE INDEX IF NOT EXISTS idx_chunk_file_id ON "FileChunk"("fileId");
CREATE INDEX IF NOT EXISTS idx_vulnerability_file_id ON "VulnerabilityDetection"("fileId");
CREATE INDEX IF NOT EXISTS idx_pattern_category ON "SecurityPattern"("category");

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to File table
CREATE TRIGGER update_file_updated_at BEFORE UPDATE ON "File"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to SecurityPattern table
CREATE TRIGGER update_pattern_updated_at BEFORE UPDATE ON "SecurityPattern"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Display summary of inserted data
DO $$
BEGIN
    RAISE NOTICE '🎉 Database initialization complete!';
    RAISE NOTICE '📁 Sample files loaded: %', (SELECT COUNT(*) FROM "File");
    RAISE NOTICE '🛡️ Security patterns loaded: %', (SELECT COUNT(*) FROM "SecurityPattern");
    RAISE NOTICE '🔍 Vulnerability detections: %', (SELECT COUNT(*) FROM "VulnerabilityDetection");
    RAISE NOTICE '📋 File chunks for RAG: %', (SELECT COUNT(*) FROM "FileChunk");
END $$;

COMMENT ON DATABASE sqli_detection IS 'SQL Injection Detection and Analysis System Database';
COMMENT ON TABLE "File" IS 'Contains uploaded files for SQL injection detection analysis';
COMMENT ON TABLE "SecurityPattern" IS 'Patterns used to detect various types of security vulnerabilities';
COMMENT ON TABLE "VulnerabilityDetection" IS 'Records of detected vulnerabilities in analyzed files';
COMMENT ON TABLE "FileChunk" IS 'File chunks with embeddings for RAG (Retrieval Augmented Generation)';
