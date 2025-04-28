import initSqlJs, { Database } from 'sql.js';
import { drizzle } from 'drizzle-orm/sql-js';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

let db: ReturnType<typeof drizzle> | null = null;
let sqliteDB: Database | null = null;

export async function initializeDatabase() {
  try {
    const SQL = await initSqlJs();
    const dataPath = path.join(app.getPath('userData'), 'data');
    const dbPath = path.join(dataPath, 'database.sqlite');

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }

    // Load or create database
    let buffer: Buffer;
    if (fs.existsSync(dbPath)) {
      buffer = fs.readFileSync(dbPath);
    } else {
      sqliteDB = new SQL.Database();
      buffer = Buffer.from(sqliteDB.export());
    }

    sqliteDB = new SQL.Database(buffer);
    db = drizzle(sqliteDB);

    // Save database on process exit
    process.on('exit', () => {
      if (sqliteDB) {
        const data = Buffer.from(sqliteDB.export());
        fs.writeFileSync(dbPath, data);
      }
    });

    // Also handle electron app quit event
    app.on('will-quit', () => {
      if (sqliteDB) {
        const data = Buffer.from(sqliteDB.export());
        fs.writeFileSync(dbPath, data);
        sqliteDB.close();
      }
    });

    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export function getDatabase() {
  if (!db || !sqliteDB) {
    throw new Error('Database not initialized');
  }
  return db;
}

// Clean up function
export function closeDatabase() {
  if (sqliteDB) {
    sqliteDB.close();
    sqliteDB = null;
  }
  db = null;
}