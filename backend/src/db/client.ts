import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/redline_parts';

export const queryClient = postgres(connectionString, {
  max: Number(process.env.DB_POOL_MAX ?? (process.env.VERCEL ? 1 : 10)),
  // Hosted poolers (Neon/Supabase pgbouncer) don't like prepared statements.
  prepare: process.env.DB_PREPARE ? process.env.DB_PREPARE !== 'false' : !process.env.VERCEL,
  idle_timeout: process.env.VERCEL ? 20 : undefined,
});
export const db = drizzle(queryClient, { schema });
export type Db = typeof db;
