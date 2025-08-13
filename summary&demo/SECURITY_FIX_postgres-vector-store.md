# SQL Injection Fixes for postgres-vector-store.service.ts

## Vulnerabilities Found:

### 1. LIMIT Clause Injection
**Current (VULNERABLE):**
```typescript
LIMIT ${k}
```

**Fixed (SECURE):**
```typescript
// Add k as a parameter
const params: any[] = [queryEmbedding];
let paramIndex = 2;

if (fileType) {
  whereClause = `AND f.file_type = $${paramIndex}`;
  params.push(fileType);
  paramIndex++;
}

// Add k as final parameter
params.push(k);

const query = `
  SELECT ...
  FROM file_embeddings fe
  WHERE 1=1 ${whereClause}
  ORDER BY similarity_score DESC
  LIMIT $${paramIndex}
`;
```

### 2. Mathematical Expression Injection
**Current (VULNERABLE):**
```typescript
ORDER BY 
  (semantic_score * ${1 - textWeight} + text_score * ${textWeight}) DESC
```

**Fixed (SECURE):**
```typescript
// Pre-calculate values and use parameters
const semanticWeight = 1 - textWeight;
const textWeightParam = textWeight;

params.push(semanticWeight, textWeightParam, k);

const query = `
  SELECT ...
  ORDER BY 
    (semantic_score * $${paramIndex} + text_score * $${paramIndex + 1}) DESC
  LIMIT $${paramIndex + 2}
`;
```

### 3. Input Validation
**Add strict validation:**
```typescript
// Validate k parameter
if (!Number.isInteger(k) || k < 1 || k > 1000) {
  throw new Error('Invalid k parameter: must be integer between 1 and 1000');
}

// Validate scoreThreshold
if (typeof scoreThreshold !== 'number' || scoreThreshold < 0 || scoreThreshold > 1) {
  throw new Error('Invalid scoreThreshold: must be number between 0 and 1');
}

// Validate textWeight
if (typeof textWeight !== 'number' || textWeight < 0 || textWeight > 1) {
  throw new Error('Invalid textWeight: must be number between 0 and 1');
}

// Validate fileType (allowlist)
const allowedFileTypes = ['javascript', 'typescript', 'python', 'java', 'sql', 'php'];
if (fileType && !allowedFileTypes.includes(fileType.toLowerCase())) {
  throw new Error(`Invalid fileType: must be one of ${allowedFileTypes.join(', ')}`);
}
```

## Secure Implementation Example:

```typescript
async similaritySearch(
  queryEmbedding: number[],
  options: SimilaritySearchOptions = {}
): Promise<SearchResult[]> {
  const {
    k = 5,
    scoreThreshold = 0.1,
    fileType,
    includeMetadata = true
  } = options;

  // INPUT VALIDATION
  if (!Number.isInteger(k) || k < 1 || k > 1000) {
    throw new Error('Invalid k parameter: must be integer between 1 and 1000');
  }
  
  if (typeof scoreThreshold !== 'number' || scoreThreshold < 0 || scoreThreshold > 1) {
    throw new Error('Invalid scoreThreshold: must be number between 0 and 1');
  }

  try {
    this.logger.log(`Performing similarity search with k=${k}, threshold=${scoreThreshold}`);

    // SECURE PARAMETER BUILDING
    const params: any[] = [queryEmbedding];
    let paramIndex = 2;
    let whereClause = '';

    if (fileType) {
      // Allowlist validation for fileType
      const allowedFileTypes = ['javascript', 'typescript', 'python', 'java', 'sql', 'php'];
      if (!allowedFileTypes.includes(fileType.toLowerCase())) {
        throw new Error(`Invalid fileType: ${fileType}`);
      }
      
      whereClause = `AND f.file_type = $${paramIndex}`;
      params.push(fileType);
      paramIndex++;
    }

    // Add k as parameter (SECURE)
    params.push(k);

    const query = `
      SELECT 
        fe.id as embedding_id,
        fe.file_id,
        fe.chunk_id,
        fc.content,
        fc.chunk_index,
        fc.start_line,
        fc.end_line,
        fc.metadata as chunk_metadata,
        f.file_name,
        f.file_type,
        f.file_path,
        f.metadata as file_metadata,
        -- Calculate similarity score (simplified dot product)
        (
          SELECT SUM(val1 * val2) / (
            SQRT(SUM(val1 * val1)) * SQRT(SUM(val2 * val2))
          )
          FROM unnest(fe.embedding) WITH ORDINALITY AS t1(val1, idx)
          JOIN unnest($1::float[]) WITH ORDINALITY AS t2(val2, idx) 
            ON t1.idx = t2.idx
        ) as similarity_score
      FROM file_embeddings fe
      JOIN file_chunks fc ON fe.chunk_id = fc.id
      JOIN files f ON fe.file_id = f.id
      WHERE 1=1 ${whereClause}
      ORDER BY similarity_score DESC
      LIMIT $${paramIndex}
    `;

    const results = await this.database.$queryRawUnsafe(query, ...params);

    return (results as any[])
      .filter(row => row.similarity_score >= scoreThreshold)
      .map(row => ({
        // ... mapping logic
      }));

  } catch (error) {
    this.logger.error(`Error in similarity search: ${error.message}`);
    return [];
  }
}
```

## Summary:
- **Primary Issue**: Direct variable interpolation in SQL (LIMIT, ORDER BY)
- **Secondary Issue**: Lack of input validation
- **Solution**: Use parameterized queries for ALL dynamic values + strict validation
- **Impact**: HIGH - Could allow arbitrary SQL execution in vector search queries
