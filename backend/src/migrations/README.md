# Database Migrations

This directory contains database migrations for the Ludo Game backend. Migrations are used to manage database schema changes in a controlled and versioned way.

## Automatic Migrations

Migrations are automatically run when the application starts up. This is configured in `src/config/database.ts` with the following settings:

```typescript
{
  migrations: ["src/migrations/*.ts"],
  migrationsRun: true,
  migrationsTableName: "migrations"
}
```

## Available Migration Commands

The following npm scripts are available for managing migrations:

- `npm run migration:generate` - Generate a new migration based on schema changes
- `npm run migration:run` - Run all pending migrations
- `npm run migration:revert` - Revert the last migration
- `npm run migration:show` - Show migration status

## Creating a New Migration

1. Make changes to your entity files
2. Run `npm run migration:generate src/migrations/MigrationName`
3. Review the generated migration file
4. Commit the migration file to version control

## Migration Naming Convention

Migration files should follow this naming pattern:
`YYYYMMDDHHMMSS-MigrationName.ts`

Example: `20240315120000-AddUserTable.ts`

## Best Practices

1. Always review generated migrations before committing
2. Test migrations in development before deploying to production
3. Back up your database before running migrations in production
4. Keep migrations small and focused on specific changes
5. Never modify existing migration files that have been committed
6. Always include both `up()` and `down()` methods in migrations 