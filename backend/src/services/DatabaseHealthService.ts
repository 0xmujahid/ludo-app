import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';
import { QueryRunner } from 'typeorm';

export interface TableHealth {
  exists: boolean;
  columns: string[];
  missingColumns: string[];
  extraColumns: string[];
  indexes: string[];
  constraints: string[];
}

export interface DatabaseHealthReport {
  isHealthy: boolean;
  connectionStatus: 'connected' | 'failed';
  migrationStatus: 'up_to_date' | 'pending' | 'failed';
  tables: Record<string, TableHealth>;
  issues: string[];
  recommendations: string[];
}

export class DatabaseHealthService {
  private queryRunner: QueryRunner | null = null;

  /**
   * Comprehensive database health check
   */
  async checkDatabaseHealth(): Promise<DatabaseHealthReport> {
    const report: DatabaseHealthReport = {
      isHealthy: true,
      connectionStatus: 'failed',
      migrationStatus: 'failed',
      tables: {},
      issues: [],
      recommendations: []
    };

    try {
      // Test database connection
      await this.checkConnection();
      report.connectionStatus = 'connected';
      logger.info('Database connection check passed');

      // Initialize query runner
      this.queryRunner = AppDataSource.createQueryRunner();
      await this.queryRunner.connect();

      // Check migration status
      report.migrationStatus = await this.checkMigrationStatus();
      
      // Check all required tables
      await this.checkAllTables(report);

      // Validate entity mappings
      await this.validateEntityMappings(report);

      // Check for any critical issues
      if (report.issues.length > 0) {
        report.isHealthy = false;
      }

    } catch (error) {
      logger.error('Database health check failed:', error);
      report.isHealthy = false;
      report.issues.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (this.queryRunner) {
        await this.queryRunner.release();
      }
    }

    return report;
  }

  /**
   * Check database connection
   */
  private async checkConnection(): Promise<void> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database connection not initialized');
    }

    // Test with a simple query
    await AppDataSource.query('SELECT 1');
  }

  /**
   * Check migration status (optimized for faster startup)
   */
  private async checkMigrationStatus(): Promise<'up_to_date' | 'pending' | 'failed'> {
    try {
      // Quick check for migrations table
      const migrationsTableExists = await this.queryRunner!.hasTable('migrations');
      
      if (!migrationsTableExists) {
        return 'pending';
      }

      // Quick count check
      const result = await this.queryRunner!.query('SELECT COUNT(*) as count FROM migrations');
      const migrationCount = parseInt(result[0]?.count || '0');

      if (migrationCount === 0) {
        return 'pending';
      }

      logger.info(`Found ${migrationCount} executed migrations`);
      return 'up_to_date';

    } catch (error) {
      logger.error('Migration status check failed:', error);
      return 'failed';
    }
  }

  /**
   * Check all required tables
   */
  private async checkAllTables(report: DatabaseHealthReport): Promise<void> {
    const requiredTables = [
      'config',
      'users',
      'wallets', 
      'transactions',
      'games',
      'game_sessions',
      'game_players',
      'game_types',
      'tournaments',
      'tournament_participants',
      'kyc',
      'leaderboards',
      'user_stats',
      'payment_method_config',
      'payment_audit_log',
      'sessions'
    ];

    for (const tableName of requiredTables) {
      try {
        const tableHealth = await this.checkTableHealth(tableName);
        report.tables[tableName] = tableHealth;

        if (!tableHealth.exists) {
          report.issues.push(`Table '${tableName}' does not exist`);
          report.recommendations.push(`Run migrations to create table '${tableName}'`);
        } else if (tableHealth.missingColumns.length > 0) {
          report.issues.push(`Table '${tableName}' missing columns: ${tableHealth.missingColumns.join(', ')}`);
          report.recommendations.push(`Run migrations to add missing columns to '${tableName}'`);
        }
      } catch (error) {
        report.issues.push(`Failed to check table '${tableName}': ${error}`);
      }
    }
  }

  /**
   * Check individual table health
   */
  private async checkTableHealth(tableName: string): Promise<TableHealth> {
    const health: TableHealth = {
      exists: false,
      columns: [],
      missingColumns: [],
      extraColumns: [],
      indexes: [],
      constraints: []
    };

    try {
      // Check if table exists
      health.exists = await this.queryRunner!.hasTable(tableName);
      
      if (!health.exists) {
        return health;
      }

      // Get table columns
      const table = await this.queryRunner!.getTable(tableName);
      if (table) {
        health.columns = table.columns.map(col => col.name);
        
        // Get indexes
        health.indexes = table.indices.map(idx => idx.name || 'unnamed');
        
        // Get constraints
        health.constraints = [
          ...table.foreignKeys.map(fk => fk.name || 'unnamed_fk'),
          ...table.uniques.map(uq => uq.name || 'unnamed_unique'),
          ...table.checks.map(chk => chk.name || 'unnamed_check')
        ];
      }

      // Check for expected columns based on table name
      const expectedColumns = this.getExpectedColumns(tableName);
      health.missingColumns = expectedColumns.filter(col => !health.columns.includes(col));

    } catch (error) {
      logger.error(`Error checking table health for ${tableName}:`, error);
      throw error;
    }

    return health;
  }

  /**
   * Get expected columns for a table
   */
  private getExpectedColumns(tableName: string): string[] {
    const commonColumns = ['id', 'createdAt', 'updatedAt'];
    
    const tableColumns: Record<string, string[]> = {
      'users': [...commonColumns, 'phoneNumber', 'username', 'email', 'avatar', 'isActive', 'lastSeen', 'role'],
      'wallets': [...commonColumns, 'userId', 'balance', 'lockedAmount', 'lifetimeEarnings', 'lifetimeSpent'],
      'transactions': [...commonColumns, 'userId', 'type', 'amount', 'status', 'description', 'direction', 'category'],
      'games': [...commonColumns, 'status', 'variant', 'gameTypeId', 'roomCode', 'maxPlayers', 'entryFee'],
      'game_sessions': [...commonColumns, 'gameId', 'timeLimit', 'moves', 'gameState'],
      'game_players': [...commonColumns, 'gameId', 'userId', 'position', 'color', 'isWinner', 'tokenPositions'],
      'game_types': [...commonColumns, 'name', 'description', 'maxPlayers', 'entryFee', 'timeLimit'],
      'config': [...commonColumns, 'name', 'tds', 'fee', 'cashback', 'status'],
      'kyc': [...commonColumns, 'userId', 'status', 'documentType', 'documentNumber'],
      'leaderboards': [...commonColumns, 'userId', 'gamesPlayed', 'gamesWon', 'totalPoints'],
      'payment_method_config': [...commonColumns, 'paymentMethod', 'isEnabled', 'minAmount', 'maxAmount'],
      'sessions': ['sid', 'sess', 'expire']
    };

    return tableColumns[tableName] || commonColumns;
  }

  /**
   * Validate entity mappings
   */
  private async validateEntityMappings(report: DatabaseHealthReport): Promise<void> {
    try {
      // Get all entities from TypeORM
      const entities = AppDataSource.entityMetadatas;
      
      for (const entity of entities) {
        const tableName = entity.tableName;
        
        if (report.tables[tableName]?.exists) {
          // Check if all entity columns exist in database
          const entityColumns = entity.columns.map(col => col.databaseName);
          const dbColumns = report.tables[tableName].columns;
          
          const missingInDb = entityColumns.filter(col => !dbColumns.includes(col));
          if (missingInDb.length > 0) {
            report.issues.push(`Entity '${entity.name}' has columns not in database: ${missingInDb.join(', ')}`);
          }
        }
      }
    } catch (error) {
      logger.error('Entity mapping validation failed:', error);
      report.issues.push(`Entity mapping validation failed: ${error}`);
    }
  }

  /**
   * Fix detected issues automatically
   */
  async autoFixIssues(report: DatabaseHealthReport): Promise<boolean> {
    let allFixed = true;

    try {
      logger.info('Starting automatic issue resolution...');

      // Run pending migrations first
      if (report.migrationStatus === 'pending') {
        logger.info('Running pending migrations...');
        await AppDataSource.runMigrations();
        logger.info('Migrations completed successfully');
      }

      // Re-check health after migrations
      const updatedReport = await this.checkDatabaseHealth();
      
      if (updatedReport.issues.length > 0) {
        logger.warn('Some issues remain after auto-fix:', updatedReport.issues);
        allFixed = false;
      } else {
        logger.info('All database issues resolved successfully');
      }

    } catch (error) {
      logger.error('Auto-fix failed:', error);
      allFixed = false;
    }

    return allFixed;
  }

  /**
   * Generate health report summary
   */
  generateHealthSummary(report: DatabaseHealthReport): string {
    const summary = [
      `Database Health Report:`,
      `- Connection: ${report.connectionStatus}`,
      `- Migrations: ${report.migrationStatus}`,
      `- Overall Health: ${report.isHealthy ? 'HEALTHY' : 'ISSUES DETECTED'}`,
      `- Tables Checked: ${Object.keys(report.tables).length}`,
      `- Issues Found: ${report.issues.length}`,
      ''
    ];

    if (report.issues.length > 0) {
      summary.push('Issues:', ...report.issues.map(issue => `  - ${issue}`), '');
    }

    if (report.recommendations.length > 0) {
      summary.push('Recommendations:', ...report.recommendations.map(rec => `  - ${rec}`));
    }

    return summary.join('\n');
  }
}

export const databaseHealthService = new DatabaseHealthService();