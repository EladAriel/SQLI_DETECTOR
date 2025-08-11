import { readFile } from 'fs/promises';
import { join, resolve } from 'path';

/**
 * Shared Secure Template Loader
 * 
 * A comprehensive security-focused template loading system designed to prevent
 * various attack vectors including prompt injection, directory traversal, and
 * template-based code injection. This class provides secure template loading
 * and rendering capabilities across the entire project.
 * 
 * Security Features:
 * - Directory traversal prevention with whitelist validation
 * - Template name sanitization and validation
 * - File size limits to prevent resource exhaustion
 * - Variable sanitization to prevent injection attacks
 * - Content validation for malicious patterns
 * - Secure variable substitution with safe placeholders
 * 
 * @class SharedSecureTemplateLoader
 */
export class SharedSecureTemplateLoader {
  // Security constants for template processing
  private static readonly MAX_FILE_SIZE = 100 * 1024; // 100KB maximum file size limit
  private static readonly ALLOWED_EXTENSIONS = ['.md', '.txt']; // Permitted file extensions
  private static readonly TEMPLATE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g; // Safe variable pattern

  /**
   * Secure Template Loader and Renderer
   * 
   * Loads a template file from a validated directory and safely renders it
   * with provided variables. This method implements multiple security layers
   * to prevent common template injection attacks and directory traversal.
   * 
   * Security Measures:
   * - Directory whitelist validation
   * - Template name sanitization
   * - File size verification
   * - Variable content sanitization
   * - Safe template rendering
   * 
   * @static
   * @async
   * @function loadTemplate
   * @param {string} templateDir - The directory containing templates (relative to project root)
   * @param {string} templateName - The name of the template file (without extension)
   * @param {Record<string, string | string[]>} variables - Variables to substitute in the template
   * @returns {Promise<string>} The safely rendered template content
   * @throws {Error} When template directory, name, or content is invalid
   */
  static async loadTemplate(
    templateDir: string,
    templateName: string,
    variables: Record<string, string | string[]>
  ): Promise<string> {
    // Validate template directory against whitelist to prevent directory traversal
    if (!this.isValidTemplateDir(templateDir)) {
      throw new Error(`Invalid template directory: ${templateDir}`);
    }

    // Validate template name to prevent path injection
    if (!this.isValidTemplateName(templateName)) {
      throw new Error(`Invalid template name: ${templateName}`);
    }

    // Construct safe file path within project boundaries
    const baseDir = this.getProjectRoot();
    const templatePath = join(baseDir, templateDir, `${templateName}.md`);

    try {
      // Verify file size before reading to prevent resource exhaustion
      const stats = await import('fs').then(fs => fs.promises.stat(templatePath));
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new Error(`Template file too large: ${templateName}`);
      }

      // Read template content with UTF-8 encoding
      const templateContent = await readFile(templatePath, 'utf-8');

      // Sanitize variables and render template safely
      return this.renderTemplate(templateContent, variables);
    } catch (error) {
      // Provide helpful error messages while avoiding information disclosure
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`Template not found: ${templateDir}/${templateName}.md`);
      }
      throw error;
    }
  }

  /**
   * Project Root Directory Resolver
   * 
   * Securely determines the project root directory by traversing upward
   * from the current file location until finding the project marker.
   * This ensures all template paths are resolved relative to a known base.
   * 
   * @private
   * @static
   * @function getProjectRoot
   * @returns {string} Absolute path to the project root directory
   */
  private static getProjectRoot(): string {
    // Start from current file location and traverse upward
    let currentDir = __dirname;

    // Look for project root indicator (test_sqli directory)
    while (!currentDir.endsWith('test_sqli')) {
      const parentDir = resolve(currentDir, '..');

      // Prevent infinite loop if project structure is unexpected
      if (parentDir === currentDir) {
        // Reached filesystem root without finding project root
        break;
      }
      currentDir = parentDir;
    }

    return currentDir;
  }

  /**
   * Template Directory Validator
   * 
   * Validates template directory paths against a strict whitelist to prevent
   * directory traversal attacks. Only predefined safe directories within
   * the project are allowed for template loading.
   * 
   * @private
   * @static
   * @function isValidTemplateDir
   * @param {string} dir - Directory path to validate
   * @returns {boolean} True if directory is in the whitelist and safe
   */
  private static isValidTemplateDir(dir: string): boolean {
    // Define whitelist of allowed template directories
    const allowedDirs = [
      'apps/mcp-server/prompts',
      'apps/shared/templates',
      'apps/langchain-rag/prompts',
      'apps/sqli-detection-api/templates'
    ];

    // Check for directory traversal patterns
    if (dir.includes('..') || dir.includes('\\..\\') || dir.includes('/../')) {
      return false;
    }

    // Normalize path separators and check against whitelist
    return allowedDirs.includes(dir.replace(/\\/g, '/'));
  }

  /**
   * Template Name Validator
   * 
   * Validates template names to ensure they contain only safe characters
   * and cannot be used for directory traversal or other injection attacks.
   * 
   * @private
   * @static
   * @function isValidTemplateName
   * @param {string} name - Template name to validate
   * @returns {boolean} True if template name is safe to use
   */
  private static isValidTemplateName(name: string): boolean {
    // Allow only alphanumeric characters, hyphens, and underscores
    const validNamePattern = /^[a-zA-Z0-9_-]+$/;

    // Prevent directory traversal attempts
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return false;
    }

    // Validate pattern and reasonable length constraints
    return validNamePattern.test(name) && name.length > 0 && name.length <= 100;
  }

  /**
   * Secure Template Renderer
   * 
   * Safely renders template content by substituting variables with sanitized
   * values. This method prevents template injection by cleaning all variable
   * content and using safe replacement patterns.
   * 
   * @private
   * @static
   * @function renderTemplate
   * @param {string} template - Template content to render
   * @param {Record<string, string | string[]>} variables - Variables for substitution
   * @returns {string} Rendered template with sanitized variable substitutions
   */
  private static renderTemplate(
    template: string,
    variables: Record<string, string | string[]>
  ): string {
    // Sanitize all variable values to prevent injection attacks
    const sanitizedVariables = this.sanitizeVariables(variables);

    // Replace template variables using safe pattern matching
    return template.replace(this.TEMPLATE_PATTERN, (match, varName) => {
      const value = sanitizedVariables[varName];
      if (value === undefined) {
        // Return safe placeholder for missing variables
        return `[${varName.toUpperCase()}]`;
      }
      return value;
    });
  }

  /**
   * Variable Content Sanitizer
   * 
   * Comprehensively sanitizes variable values to prevent various injection
   * attacks including prompt injection, script injection, and command injection.
   * This method applies multiple layers of filtering and escaping.
   * 
   * @private
   * @static
   * @function sanitizeVariables
   * @param {Record<string, string | string[]>} variables - Raw variables to sanitize
   * @returns {Record<string, string>} Sanitized variables safe for template rendering
   */
  private static sanitizeVariables(variables: Record<string, string | string[]>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    // Process each variable with comprehensive sanitization
    for (const [key, value] of Object.entries(variables)) {
      let stringValue: string;

      // Handle array values by converting to formatted lists
      if (Array.isArray(value)) {
        stringValue = value.map((item, index) => `${index + 1}. ${String(item)}`).join('\n');
      } else {
        stringValue = String(value);
      }

      if (stringValue) {
        // Apply multiple sanitization layers
        let sanitizedValue = stringValue
          // Remove control characters that could cause formatting issues
          .replace(/[\x00-\x1F\x7F]/g, '')
          // Limit content length to prevent resource abuse
          .substring(0, 20000)
          // Escape code block markers to prevent markdown injection
          .replace(/```/g, '\\`\\`\\`')
          // Remove variable substitution patterns to prevent recursive injection
          .replace(/\$\{[^}]*\}/g, '[VARIABLE]')
          .replace(/\$\([^)]*\)/g, '[COMMAND]')
          // Escape excessive markdown headers that could be used for injection
          .replace(/^(\s*)#{6,}/gm, '$1\\#\\#\\#\\#\\#\\#')
          // Escape potentially dangerous URL schemes
          .replace(/javascript:/gi, 'javascript\\:')
          .replace(/data:text\/html/gi, 'data\\:text\\/html')
          // Remove script and iframe tags completely
          .replace(/<script[\s\S]*?<\/script>/gi, '[SCRIPT_REMOVED]')
          .replace(/<iframe[\s\S]*?<\/iframe>/gi, '[IFRAME_REMOVED]');

        sanitized[key] = sanitizedValue;
      } else {
        // Provide safe placeholder for empty or null values
        sanitized[key] = '[EMPTY]';
      }
    }

    return sanitized;
  }

  /**
   * Available Templates Enumerator
   * 
   * Safely lists all available templates in a validated directory.
   * This method helps with template discovery while maintaining security
   * by only accessing whitelisted directories.
   * 
   * @static
   * @async
   * @function getAvailableTemplates
   * @param {string} templateDir - Directory to search for templates
   * @returns {Promise<string[]>} Array of available template names (without extensions)
   * @throws {Error} When template directory is invalid
   */
  static async getAvailableTemplates(templateDir: string): Promise<string[]> {
    // Validate directory before attempting to read
    if (!this.isValidTemplateDir(templateDir)) {
      throw new Error(`Invalid template directory: ${templateDir}`);
    }

    try {
      // Dynamically import filesystem module to read directory
      const { readdir } = await import('fs/promises');
      const baseDir = this.getProjectRoot();
      const fullPath = join(baseDir, templateDir);
      const files = await readdir(fullPath);

      // Filter for allowed extensions and remove file extensions from names
      return files
        .filter(file => this.ALLOWED_EXTENSIONS.some(ext => file.endsWith(ext)))
        .map(file => file.replace(/\.[^.]+$/, '')) // Remove file extension
        .sort(); // Sort alphabetically for consistent results
    } catch (error) {
      // Log error for debugging but don't expose internal details
      console.error(`Error reading templates from ${templateDir}:`, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Template Content Security Validator
   * 
   * Analyzes template content for potential security issues before processing.
   * This method helps identify dangerous patterns that could be used for
   * injection attacks or other security vulnerabilities.
   * 
   * @static
   * @function validateTemplateContent
   * @param {string} content - Template content to validate
   * @returns {Object} Validation result with status and list of issues found
   */
  static validateTemplateContent(content: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for script tag injection attempts
    if (content.includes('<script')) {
      issues.push('Contains script tags');
    }

    // Check for JavaScript URL schemes
    if (content.includes('javascript:')) {
      issues.push('Contains javascript URLs');
    }

    // Check for variable substitution patterns that could enable injection
    if (content.match(/\$\{[^}]*\}/)) {
      issues.push('Contains variable substitution patterns');
    }

    // Verify content size is within acceptable limits
    if (content.length > this.MAX_FILE_SIZE) {
      issues.push('Content too large');
    }

    // Return validation results
    return {
      valid: issues.length === 0,
      issues
    };
  }
}
