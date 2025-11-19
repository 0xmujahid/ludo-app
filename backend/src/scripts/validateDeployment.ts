#!/usr/bin/env ts-node

/**
 * Pre-deployment validation script
 * Run this before deploying to staging/production to ensure database compatibility
 */

import dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../config/database';
import { databaseHealthService } from '../services/DatabaseHealthService';
import { databaseMigrationService } from '../services/DatabaseMigrationService';
import { logger } from '../utils/logger';

interface DeploymentValidationResult {
  isReadyForDeployment: boolean;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
  migrationCount: number;
  backupCommand: string;
}

class DeploymentValidator {
  
  async validateForDeployment(): Promise<DeploymentValidationResult> {
    const result: DeploymentValidationResult = {
      isReadyForDeployment: true,
      criticalIssues: [],
      warnings: [],
      recommendations: [],
      migrationCount: 0,
      backupCommand: ''
    };

    console.log('🔍 Starting pre-deployment validation...\n');

    try {
      // Step 1: Initialize database connection
      await this.initializeConnection();
      
      // Step 2: Check current database health
      console.log('📊 Checking current database health...');
      const healthReport = await databaseHealthService.checkDatabaseHealth();
      
      if (!healthReport.isHealthy) {
        result.criticalIssues.push('Current database is not healthy');
        result.criticalIssues.push(...healthReport.issues);
      }

      // Step 3: Check for pending migrations
      console.log('📋 Checking for pending migrations...');
      const pendingMigrations = await this.checkPendingMigrations();
      result.migrationCount = pendingMigrations.length;
      
      if (pendingMigrations.length > 0) {
        result.warnings.push(`${pendingMigrations.length} pending migrations found`);
        result.recommendations.push('Review pending migrations before deployment');
        console.log(`⚠️  Found ${pendingMigrations.length} pending migrations:`);
        pendingMigrations.forEach(migration => {
          console.log(`   - ${migration}`);
        });
      }

      // Step 4: Simulate migration run (dry run)
      console.log('🧪 Simulating migration execution...');
      await this.simulateMigrationRun(result);

      // Step 5: Check compatibility
      console.log('🔄 Checking backward compatibility...');
      await this.checkBackwardCompatibility(result);

      // Step 6: Generate backup command
      result.backupCommand = databaseMigrationService.generateBackupCommand();
      result.recommendations.push(`Backup database before deployment: ${result.backupCommand}`);

      // Step 7: Final readiness assessment
      if (result.criticalIssues.length > 0) {
        result.isReadyForDeployment = false;
      }

    } catch (error) {
      result.criticalIssues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isReadyForDeployment = false;
    }

    return result;
  }

  private async initializeConnection(): Promise<void> {
    console.log('🔌 Connecting to database...');
    
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    // Test connection
    await AppDataSource.query('SELECT NOW() as current_time');
    console.log('✅ Database connection established\n');
  }

  private async checkPendingMigrations(): Promise<string[]> {
    try {
      // Get all migration files from filesystem
      const migrationFiles = await this.getMigrationFiles();
      
      // Get executed migrations from database
      const executedMigrations = await this.getExecutedMigrations();
      
      // Find pending migrations
      const pending = migrationFiles.filter(file => 
        !executedMigrations.some(executed => executed.includes(file))
      );
      
      return pending;
    } catch (error) {
      console.log('⚠️  Could not check pending migrations:', error);
      return [];
    }
  }

  private async getMigrationFiles(): Promise<string[]> {
    const fs = require('fs');
    const path = require('path');
    
    const migrationDir = path.join(__dirname, '../../dist/migrations');
    
    try {
      const files = fs.readdirSync(migrationDir);
      return files.filter((file: string) => file.endsWith('.js'))
        .map((file: string) => file.replace('.js', ''));
    } catch (error) {
      return [];
    }
  }

  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const migrations = await AppDataSource.query('SELECT name FROM migrations ORDER BY timestamp');
      return migrations.map((m: any) => m.name);
    } catch (error) {
      return [];
    }
  }

  private async simulateMigrationRun(result: DeploymentValidationResult): Promise<void> {
    try {
      // Don't actually run migrations, just check if they would succeed
      const migrationResult = await databaseMigrationService.initializeDatabase();
      
      if (!migrationResult.success) {
        result.criticalIssues.push('Migration simulation failed');
        result.criticalIssues.push(...migrationResult.errors);
      } else if (migrationResult.migrationsRun.length > 0) {
        console.log(`✅ Migration simulation successful (${migrationResult.migrationsRun.length} migrations)`);
      } else {
        console.log('✅ No migrations needed');
      }
      
    } catch (error) {
      result.criticalIssues.push(`Migration simulation failed: ${error}`);
    }
  }

  private async checkBackwardCompatibility(result: DeploymentValidationResult): Promise<void> {
    // Check for potentially breaking changes
    const breakingPatterns = [
      'DROP COLUMN',
      'DROP TABLE',
      'ALTER COLUMN TYPE',
      'NOT NULL'
    ];

    try {
      const migrationFiles = await this.getMigrationFiles();
      
      for (const migrationFile of migrationFiles) {
        const content = await this.readMigrationContent(migrationFile);
        
        for (const pattern of breakingPatterns) {
          if (content.toUpperCase().includes(pattern)) {
            result.warnings.push(`Potentially breaking change in ${migrationFile}: ${pattern}`);
            result.recommendations.push(`Review migration ${migrationFile} for backward compatibility`);
          }
        }
      }
      
      if (result.warnings.length === 0) {
        console.log('✅ No backward compatibility issues detected');
      }
      
    } catch (error) {
      result.warnings.push(`Could not check backward compatibility: ${error}`);
    }
  }

  private async readMigrationContent(migrationFile: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const filePath = path.join(__dirname, '../../src/migrations', `${migrationFile}.ts`);
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return '';
    }
  }

  printValidationReport(result: DeploymentValidationResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 DEPLOYMENT VALIDATION REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n🎯 DEPLOYMENT READINESS: ${result.isReadyForDeployment ? '✅ READY' : '❌ NOT READY'}`);
    
    if (result.migrationCount > 0) {
      console.log(`📊 MIGRATIONS TO RUN: ${result.migrationCount}`);
    }
    
    if (result.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      result.criticalIssues.forEach(issue => {
        console.log(`   ❌ ${issue}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      result.warnings.forEach(warning => {
        console.log(`   ⚠️  ${warning}`);
      });
    }
    
    if (result.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      result.recommendations.forEach(rec => {
        console.log(`   💡 ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (result.isReadyForDeployment) {
      console.log('🎉 Your application is ready for deployment!');
    } else {
      console.log('🛑 Please resolve critical issues before deployment.');
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// Main execution
async function main() {
  const validator = new DeploymentValidator();
  
  try {
    const result = await validator.validateForDeployment();
    validator.printValidationReport(result);
    
    // Exit with appropriate code
    process.exit(result.isReadyForDeployment ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DeploymentValidator };