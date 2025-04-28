import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@db/schema';

let _db: ReturnType<typeof drizzle> | null = null;

export async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (_db) return _db;

  try {
    // Create the database connection with neon-http
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql, { schema });

    // Test the connection
    await sql`SELECT 1`;
    console.log('Database connection established successfully');

    _db = db;
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    _db = null;
    throw error;
  }
}

export function getDatabase() {
  if (!_db) {
    throw new Error('Database not initialized. Call initializeDatabase() first');
  }
  return _db;
}
