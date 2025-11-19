import { AppDataSource } from "../config/database";
import { QueryRunner } from "typeorm";
import { logger } from "../utils/logger";

export async function checkAndCreateTables() {
  try {
    const connection = AppDataSource;
    const existingTables = await connection.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    const tableExists = existingTables.some(
      (t: any) => t.tablename === "tournament_participants",
    );

    if (!tableExists) {
      console.log("Table tournament_participants does not exist. Creating...");
      await connection.synchronize();
    } else {
      console.log("Table already exists. Skipping creation.");
    }
  } catch (error) {
    console.error("Error in checkAndCreateTables:", error);
  }
}

export async function getTableConstraints(tableName: string) {
  try {
    const constraints = await AppDataSource.query(
      `
      SELECT conname AS constraint_name, contype AS constraint_type
      FROM pg_constraint
      WHERE conrelid = (
        SELECT oid FROM pg_class WHERE relname = $1
      )
    `,
      [tableName],
    );

    return constraints;
  } catch (error) {
    logger.error("Error retrieving table constraints:", error);
    throw error;
  }
}

export async function checkDatabaseHealth(
  queryRunner: QueryRunner,
): Promise<boolean> {
  const startTime = Date.now();
  try {
    // Basic connection test
    await queryRunner.query("SELECT 1");
    logger.debug("Basic connection test passed");

    // Test transaction capability
    await queryRunner.startTransaction();
    await queryRunner.commitTransaction();
    logger.debug("Transaction capability test passed");

    // Get database status information
    const [{ version }] = await queryRunner.query("SHOW server_version");
    const [{ max_connections }] = await queryRunner.query(
      "SHOW max_connections",
    );
    const [{ count }] = await queryRunner.query(
      "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()",
    );

    logger.info("Database health check passed", {
      postgresVersion: version,
      maxConnections: max_connections,
      currentConnections: count,
      checkDuration: Date.now() - startTime,
    });

    return true;
  } catch (error) {
    logger.error("Database health check failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
    });
    return false;
  }
}
