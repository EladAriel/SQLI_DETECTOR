import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Database Service
 * 
 * Provides centralized database access and management for the SQL injection detection system.
 * This service extends PrismaClient to provide enhanced functionality including:
 * - Database connection lifecycle management
 * - Health monitoring capabilities
 * - Statistical data aggregation
 * - Centralized error handling and logging
 * 
 * @class DatabaseService
 * @extends PrismaClient
 * @implements OnModuleInit
 */
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
  // Logger instance for database operations and connection status
  private readonly logger = new Logger(DatabaseService.name);

  /**
   * Module Initialization Handler
   * 
   * Establishes connection to PostgreSQL database when the NestJS module initializes.
   * This method is automatically called by the NestJS framework during application startup.
   * 
   * @async
   * @function onModuleInit
   * @returns {Promise<void>} Resolves when database connection is established
   * @throws {Error} Throws error if database connection fails
   */
  async onModuleInit(): Promise<void> {
    try {
      // Establish connection to PostgreSQL database using Prisma client
      await this.$connect();
      this.logger.log('Successfully connected to PostgreSQL database');
    } catch (error) {
      // Log connection failure and re-throw for application startup handling
      this.logger.error(`Failed to connect to database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Module Destruction Handler
   * 
   * Gracefully closes database connection when the application shuts down.
   * Ensures proper cleanup of database resources and connections.
   * 
   * @async
   * @function onModuleDestroy
   * @returns {Promise<void>} Resolves when database connection is closed
   */
  async onModuleDestroy(): Promise<void> {
    // Close database connection and cleanup resources
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL database');
  }

  /**
   * Database Health Check
   * 
   * Performs a simple connectivity test to verify database availability.
   * Executes a basic SQL query to ensure the database is responsive and accessible.
   * Used by health check endpoints and monitoring systems.
   * 
   * @async
   * @function isHealthy
   * @returns {Promise<boolean>} True if database is healthy and responsive, false otherwise
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Execute simple query to test database connectivity
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      // Log health check failure for monitoring purposes
      this.logger.error(`Database health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Database Statistics Aggregator
   * 
   * Retrieves comprehensive statistics about the database content including:
   * - Total number of files stored
   * - Number of file chunks for processing
   * - Count of vector embeddings
   * - Security patterns in the knowledge base
   * - Vulnerability detections recorded
   * 
   * This data is useful for monitoring system usage, performance analysis,
   * and administrative dashboards.
   * 
   * @async
   * @function getStats
   * @returns {Promise<DatabaseStats>} Object containing count statistics for all major entities
   */
  async getStats(): Promise<{
    files: number;
    chunks: number;
    embeddings: number;
    patterns: number;
    detections: number;
  }> {
    try {
      // Execute parallel queries to get counts from all major tables
      // Using Promise.all for optimal performance with concurrent database queries
      const [files, chunks, embeddings, patterns, detections] = await Promise.all([
        this.file.count(),                    // Total files in the system
        this.fileChunk.count(),               // File chunks for processing
        this.fileEmbedding.count(),           // Vector embeddings for RAG
        this.securityPattern.count(),         // Security patterns in knowledge base
        this.vulnerabilityDetection.count(),  // Recorded vulnerability detections
      ]);

      // Return aggregated statistics object
      return { files, chunks, embeddings, patterns, detections };
    } catch (error) {
      // Log error and return safe default values to prevent application crashes
      this.logger.error(`Failed to get database stats: ${error.message}`);
      return { files: 0, chunks: 0, embeddings: 0, patterns: 0, detections: 0 };
    }
  }
}
