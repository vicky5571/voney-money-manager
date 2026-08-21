import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * PostgreSQL connection string from environment variables.
 */
const connectionString = process.env.DATABASE_URL!;

/**
 * Postgres client instance.
 * For queries and connection pooling.
 */
const client = postgres(connectionString);

/**
 * Drizzle ORM database instance configured with full schema.
 */
export const db = drizzle(client, { schema });

export * from './schema';
