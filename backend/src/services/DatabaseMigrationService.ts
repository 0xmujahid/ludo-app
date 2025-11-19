import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';
import { databaseHealthService, DatabaseHealthReport } from './DatabaseHealthService';

export interface MigrationResult {
  success: boolean;
  migrationsRun: string[];
  errors: string[];
  healthReport: DatabaseHealthReport;
  recommendations: string[];
}

export class DatabaseMigrationService {
  
  /**
   * Comprehensive database initialization and migration
   */
  async initializeDatabase(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migrationsRun: [],
      errors: [],
      healthReport: {} as DatabaseHealthReport,
      recommendations: []
    };

    try {
      logger.info('Starting comprehensive database initialization...');

      // Step 1: Ensure database connection
      await this.ensureConnection();
      logger.info('✓ Database connection established');

      // Step 2: Run migrations if needed
      logger.info('Running migrations if needed...');
      const migrationResults = await this.runMigrationsIfNeeded();
      result.migrationsRun = migrationResults;

      // Step 3: Quick health validation
      logger.info('Performing health validation...');
      result.healthReport = await databaseHealthService.checkDatabaseHealth();

      // Step 4: Auto-fix critical issues only
      if (!result.healthReport.isHealthy) {
        logger.info('Resolving detected issues...');
        const fixResult = await databaseHealthService.autoFixIssues(result.healthReport);
        
        if (fixResult) {
          logger.info('✓ Issues resolved successfully');
          result.healthReport = await databaseHealthService.checkDatabaseHealth();
        }
      }

      // Step 6: Validate final state
      await this.validateFinalState(result);

      // Step 7: Generate recommendations
      this.generateRecommendations(result);

      result.success = result.healthReport.isHealthy;
      
      // Log final status
      const summary = databaseHealthService.generateHealthSummary(result.healthReport);
      logger.info('Database initialization completed:', summary);

    } catch (error) {
      logger.error('Database initialization failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.success = false;
    }

    return result;
  }

  /**
   * Ensure database connection is established
   */
  private async ensureConnection(): Promise<void> {
    if (!AppDataSource.isInitialized) {
      logger.info('Initializing database connection...');
      await AppDataSource.initialize();
      logger.info('Database connection initialized');
    }

    // Test connection with a simple query
    await AppDataSource.query('SELECT NOW() as current_time');
    logger.info('Database connection verified');
  }

  /**
   * Run migrations if needed
   */
  private async runMigrationsIfNeeded(): Promise<string[]> {
    const migrationsRun: string[] = [];

    try {
      // Run migrations
      const executedMigrations = await AppDataSource.runMigrations();
      
      for (const migration of executedMigrations) {
        migrationsRun.push(migration.name);
        logger.info(`✓ Executed migration: ${migration.name}`);
      }
      
      if (migrationsRun.length > 0) {
        logger.info(`Successfully executed ${migrationsRun.length} migrations`);
      } else {
        logger.info('No pending migrations found');
      }

    } catch (error) {
      logger.error('Migration execution failed:', error);
      throw new Error(`Migration failed: ${error}`);
    }

    return migrationsRun;
  }

  /**
   * Validate final database state
   */
  private async validateFinalState(result: MigrationResult): Promise<void> {
    try {
      // Validate critical tables exist
      const criticalTables = ['users', 'games', 'wallets', 'transactions'];
      
      for (const table of criticalTables) {
        const tableExists = result.healthReport.tables[table]?.exists;
        if (!tableExists) {
          throw new Error(`Critical table '${table}' does not exist after initialization`);
        }
      }

      // Validate entity metadata
      const entities = AppDataSource.entityMetadatas;
      if (entities.length === 0) {
        throw new Error('No entity metadata found - TypeORM configuration issue');
      }

      logger.info(`✓ Validated ${entities.length} entity mappings`);

      // Test basic operations
      await this.testBasicOperations();
      
      logger.info('✓ Database final state validation passed');

    } catch (error) {
      logger.error('Final state validation failed:', error);
      result.errors.push(`Validation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Test basic database operations
   */
  private async testBasicOperations(): Promise<void> {
    try {
      // Test read operation
      await AppDataSource.query('SELECT 1 as test');
      
      // Test migrations table
      await AppDataSource.query('SELECT COUNT(*) FROM migrations');
      
      logger.info('✓ Basic database operations test passed');
      
    } catch (error) {
      throw new Error(`Basic operations test failed: ${error}`);
    }
  }

  /**
   * Generate recommendations based on health report
   */
  private generateRecommendations(result: MigrationResult): void {
    const recommendations: string[] = [];

    // Check for performance recommendations
    if (result.healthReport.tables) {
      const tableCount = Object.keys(result.healthReport.tables).length;
      if (tableCount > 15) {
        recommendations.push('Consider implementing database connection pooling for better performance');
      }
    }

    // Check migration recommendations
    if (result.migrationsRun.length > 0) {
      recommendations.push('Database schema updated successfully - consider backing up production before deployment');
    }

    // Check for health issues
    if (!result.healthReport.isHealthy) {
      recommendations.push('Manual intervention may be required for remaining database issues');
      recommendations.push('Check application logs for detailed error information');
    }

    // Always recommend backup for production
    recommendations.push('Always backup production database before deploying schema changes');

    result.recommendations = recommendations;
  }

  /**
   * Generate migration summary for logging
   */
  generateMigrationSummary(result: MigrationResult): string {
    const summary = [
      '=== Database Migration Summary ===',
      `Status: ${result.success ? 'SUCCESS' : 'FAILED'}`,
      `Migrations Executed: ${result.migrationsRun.length}`,
      `Errors: ${result.errors.length}`,
      ''
    ];

    if (result.migrationsRun.length > 0) {
      summary.push('Executed Migrations:');
      result.migrationsRun.forEach(migration => {
        summary.push(`  ✓ ${migration}`);
      });
      summary.push('');
    }

    if (result.errors.length > 0) {
      summary.push('Errors:');
      result.errors.forEach(error => {
        summary.push(`  ✗ ${error}`);
      });
      summary.push('');
    }

    if (result.recommendations.length > 0) {
      summary.push('Recommendations:');
      result.recommendations.forEach(rec => {
        summary.push(`  → ${rec}`);
      });
    }

    return summary.join('\n');
  }

  /**
   * Safe rollback to previous migration
   */
  async rollbackMigration(): Promise<boolean> {
    try {
      logger.info('Attempting to rollback last migration...');
      
      await AppDataSource.undoLastMigration();
      logger.info('✓ Successfully rolled back last migration');
      
      return true;
    } catch (error) {
      logger.error('Migration rollback failed:', error);
      return false;
    }
  }

  /**
   * Create database backup recommendation
   */
  generateBackupCommand(): string {
    const dbName = process.env.PGDATABASE || 'ludo_game';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    return `pg_dump -h ${process.env.PGHOST} -U ${process.env.PGUSER} -d ${dbName} > backup_${timestamp}.sql`;
  }
}

export const databaseMigrationService = new DatabaseMigrationService();