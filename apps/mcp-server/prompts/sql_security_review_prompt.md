# SQL Security Code Review

## Code Under Review
```sql
{{code_snippet}}
```

## Context
{{context}}

## Review Checklist

### 1. Input Validation
- [ ] Are all user inputs properly validated?
- [ ] Are input lengths checked?
- [ ] Are special characters handled correctly?

### 2. SQL Injection Prevention
- [ ] Are parameterized queries used?
- [ ] Are stored procedures implemented securely?
- [ ] Is dynamic SQL avoided where possible?

### 3. Authentication & Authorization
- [ ] Are proper access controls in place?
- [ ] Is the principle of least privilege followed?
- [ ] Are sensitive operations logged?

### 4. Data Protection
- [ ] Is sensitive data encrypted?
- [ ] Are proper error handling mechanisms in place?
- [ ] Is data exposure minimized?

## Security Assessment
Please analyze the provided code for potential security vulnerabilities and provide detailed recommendations for improvement.
