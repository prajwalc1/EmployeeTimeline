import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// PostgreSQL schema creation SQL
const pgSchemaSQL = `
-- Create employees table
CREATE TABLE IF NOT EXISTS "employees" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "department" TEXT NOT NULL,
  "manager_id" INTEGER REFERENCES "employees"("id"),
  "substitute_id" INTEGER REFERENCES "employees"("id"),
  "annual_leave_balance" INTEGER NOT NULL DEFAULT 30
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" SERIAL PRIMARY KEY,
  "employee_id" INTEGER NOT NULL REFERENCES "employees"("id"),
  "date" TEXT NOT NULL,
  "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
  "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
  "break_duration" INTEGER NOT NULL DEFAULT 30,
  "project" TEXT NOT NULL DEFAULT 'INTERNAL',
  "notes" TEXT
);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS "leave_requests" (
  "id" SERIAL PRIMARY KEY,
  "employee_id" INTEGER NOT NULL REFERENCES "employees"("id"),
  "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "end_date" TIMESTAMP WITH TIME ZONE NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "substitute_id" INTEGER REFERENCES "employees"("id"),
  "notes" TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "employee_email_idx" ON "employees"("email");
CREATE INDEX IF NOT EXISTS "time_entries_employee_idx" ON "time_entries"("employee_id");
CREATE INDEX IF NOT EXISTS "leave_requests_employee_idx" ON "leave_requests"("employee_id");
`;

async function migrateToPostgres() {
  // Check for PostgreSQL connection string
  const pgConnectionString = process.env.DATABASE_URL;
  if (!pgConnectionString) {
    console.error('Error: DATABASE_URL environment variable is required for PostgreSQL migration');
    process.exit(1);
  }

  console.log('Starting migration from SQLite to PostgreSQL...');

  // Path to SQLite database
  let sqlitePath = '';
  
  // Check common locations for the SQLite database
  const possiblePaths = [
    path.join(process.cwd(), 'database.sqlite'),
    path.join(process.cwd(), 'data', 'database.sqlite'),
    path.join(process.env.HOME || '', '.local', 'share', 'SchwarzenbergTech', 'TimeManagement', 'database.sqlite')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      sqlitePath = p;
      break;
    }
  }

  if (!sqlitePath) {
    console.error('Error: Could not find SQLite database file');
    console.log('Please specify the path to your SQLite database:');
    console.log('DATABASE_PATH=/path/to/database.sqlite npm run migrate-postgres');
    process.exit(1);
  }

  console.log(`Found SQLite database at: ${sqlitePath}`);

  try {
    // Initialize SQLite connection
    const sqlite = new Database(sqlitePath, {
      readonly: true,
      fileMustExist: true
    });

    const sqliteDb = drizzleSqlite(sqlite, { schema });

    // Initialize PostgreSQL connection
    const pgClient = postgres(pgConnectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 30
    });

    const pgDb = drizzlePostgres(pgClient, { schema });

    console.log('Connected to both databases successfully');

    // Initialize PostgreSQL schema (create tables)
    console.log('Initializing PostgreSQL schema...');
    await pgClient.unsafe(pgSchemaSQL);
    console.log('PostgreSQL schema initialized successfully');

    // Migrate data: Employees
    console.log('Migrating employees data...');
    const employees = await sqliteDb.select().from(schema.employees);
    console.log(`Found ${employees.length} employees to migrate`);

    if (employees.length > 0) {
      // Check if employees already exist in PostgreSQL
      const pgEmployeesCount = await pgDb.select({ count: sql`count(*)` }).from(schema.employees);
      
      if (pgEmployeesCount[0].count === 0) {
        for (const employee of employees) {
          await pgDb.insert(schema.employees).values({
            id: employee.id,
            name: employee.name,
            email: employee.email,
            department: employee.department,
            managerId: employee.managerId,
            substituteId: employee.substituteId,
            annualLeaveBalance: employee.annualLeaveBalance
          });
        }
        console.log('Employees data migrated successfully');
      } else {
        console.log('Employees data already exists in PostgreSQL, skipping migration');
      }
    }

    // Migrate data: Time Entries
    console.log('Migrating time entries data...');
    const timeEntries = await sqliteDb.select().from(schema.timeEntries);
    console.log(`Found ${timeEntries.length} time entries to migrate`);

    if (timeEntries.length > 0) {
      // Check if time entries already exist in PostgreSQL
      const pgTimeEntriesCount = await pgDb.select({ count: sql`count(*)` }).from(schema.timeEntries);
      
      if (pgTimeEntriesCount[0].count === 0) {
        for (const entry of timeEntries) {
          await pgDb.insert(schema.timeEntries).values({
            id: entry.id,
            employeeId: entry.employeeId,
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            breakDuration: entry.breakDuration,
            project: entry.project,
            notes: entry.notes
          });
        }
        console.log('Time entries data migrated successfully');
      } else {
        console.log('Time entries data already exists in PostgreSQL, skipping migration');
      }
    }

    // Migrate data: Leave Requests
    console.log('Migrating leave requests data...');
    const leaveRequests = await sqliteDb.select().from(schema.leaveRequests);
    console.log(`Found ${leaveRequests.length} leave requests to migrate`);

    if (leaveRequests.length > 0) {
      // Check if leave requests already exist in PostgreSQL
      const pgLeaveRequestsCount = await pgDb.select({ count: sql`count(*)` }).from(schema.leaveRequests);
      
      if (pgLeaveRequestsCount[0].count === 0) {
        for (const request of leaveRequests) {
          await pgDb.insert(schema.leaveRequests).values({
            id: request.id,
            employeeId: request.employeeId,
            startDate: request.startDate,
            endDate: request.endDate,
            type: request.type,
            status: request.status,
            substituteId: request.substituteId,
            notes: request.notes
          });
        }
        console.log('Leave requests data migrated successfully');
      } else {
        console.log('Leave requests data already exists in PostgreSQL, skipping migration');
      }
    }

    console.log('Migration completed successfully');

    // Close connections
    sqlite.close();
    await pgClient.end();
    
    console.log('All connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateToPostgres().catch(error => {
  console.error('Fatal error during migration:', error);
  process.exit(1);
});