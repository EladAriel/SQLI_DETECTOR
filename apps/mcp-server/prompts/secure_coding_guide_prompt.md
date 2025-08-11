# Secure Coding Guidelines

## Framework: {{framework}}
## Database: {{database_type}}

## Core Security Principles

### 1. Input Validation
- Validate all input at the application boundary
- Use whitelist validation when possible
- Implement proper data type checking
- Set maximum input lengths

### 2. Parameterized Queries
- Always use parameterized queries or prepared statements
- Never concatenate user input directly into SQL
- Use ORM frameworks securely
- Implement query result limiting

### 3. Error Handling
- Implement comprehensive error handling
- Avoid exposing internal system information
- Log security events appropriately
- Provide generic error messages to users

### 4. Access Control
- Implement role-based access control
- Use database user accounts with minimal privileges
- Regularly audit user permissions
- Implement session management properly

Please provide specific implementation examples and best practices for the specified framework and database combination.
