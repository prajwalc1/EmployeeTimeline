import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

let db: ReturnType<typeof drizzle> | null = null;
let sqlite: Database.Database | null = null;

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

export const initializeDatabase = async (userDataPath: string) => {
  try {
    // Create directories if they don't exist
    fs.mkdirSync(userDataPath, { recursive: true });
    const dbPath = path.join(userDataPath, 'database.sqlite');
    console.log('Initializing database at:', dbPath);

    // Close existing connection if any
    await closeDatabase();

    // Create new connection with retries
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Create new connection
        sqlite = new Database(dbPath, {
          verbose: console.log,
          fileMustExist: false,
        });

        // Configure SQLite for better performance and reliability
        sqlite.pragma('journal_mode = WAL');
        sqlite.pragma('foreign_keys = ON');
        sqlite.pragma('synchronous = NORMAL');
        sqlite.pragma('cache_size = -64000'); // Use 64MB cache
        sqlite.pragma('busy_timeout = 10000'); // 10 second timeout

        // Initialize Drizzle
        db = drizzle(sqlite, { schema });

        // Create tables if they don't exist
        const createEmployeesTable = `
          CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            department TEXT NOT NULL,
            manager_id INTEGER REFERENCES employees(id),
            substitute_id INTEGER REFERENCES employees(id),
            annual_leave_balance INTEGER NOT NULL DEFAULT 30
          );
        `;

        const createTimeEntriesTable = `
          CREATE TABLE IF NOT EXISTS time_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL REFERENCES employees(id),
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            break_duration INTEGER NOT NULL DEFAULT 30,
            project TEXT NOT NULL DEFAULT 'INTERNAL',
            notes TEXT
          );
        `;

        const createLeaveRequestsTable = `
          CREATE TABLE IF NOT EXISTS leave_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL REFERENCES employees(id),
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            substitute_id INTEGER REFERENCES employees(id),
            notes TEXT
          );
        `;

        // Execute table creation
        sqlite.exec(createEmployeesTable);
        sqlite.exec(createTimeEntriesTable);
        sqlite.exec(createLeaveRequestsTable);

        // Create indexes for better performance
        sqlite.exec('CREATE INDEX IF NOT EXISTS employee_email_idx ON employees(email);');
        sqlite.exec('CREATE INDEX IF NOT EXISTS time_entries_employee_idx ON time_entries(employee_id);');
        sqlite.exec('CREATE INDEX IF NOT EXISTS leave_requests_employee_idx ON leave_requests(employee_id);');

        // Insert default employee if none exists
        const checkEmployeeExists = sqlite.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number };
        if (checkEmployeeExists.count === 0) {
          sqlite.prepare(`
            INSERT INTO employees (name, email, department, annual_leave_balance)
            VALUES (?, ?, ?, ?)
          `).run('Test User', 'test@example.com', 'IT', 30);
        }

        // Verify connection
        sqlite.prepare('SELECT 1').get();
        console.log('Database initialized successfully at:', dbPath);
        break; // Exit retry loop on success
      } catch (error) {
        retryCount++;
        console.error(`Database initialization attempt ${retryCount} failed:`, error);

        if (retryCount === maxRetries) {
          throw new Error(`Failed to initialize database after ${maxRetries} attempts`);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    await closeDatabase();
    throw error;
  }
};

export const closeDatabase = async () => {
  try {
    if (sqlite) {
      sqlite.close();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database:', error);
  } finally {
    sqlite = null;
    db = null;
  }
};

export const isDatabaseConnected = () => {
  try {
    if (!sqlite) return false;
    // Try to execute a simple query to verify connection
    sqlite.prepare('SELECT 1').get();
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};

export const isDatabasePostgres = () => false;