-- Initialize database schema for Schwarzenberg Tech Time Management System
-- Creates core tables with proper indexes and foreign key relationships

CREATE TABLE IF NOT EXISTS "employees" (
  "id" integer PRIMARY KEY AUTOINCREMENT,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "department" text NOT NULL,
  "manager_id" integer REFERENCES "employees" ("id"),
  "substitute_id" integer REFERENCES "employees" ("id"),
  "annual_leave_balance" integer NOT NULL DEFAULT 30,
  "created_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" integer PRIMARY KEY AUTOINCREMENT,
  "employee_id" integer NOT NULL REFERENCES "employees" ("id"),
  "date" text NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "break_duration" integer NOT NULL DEFAULT 30, -- Break duration in minutes
  "project" text NOT NULL DEFAULT 'INTERNAL',
  "notes" text,
  "created_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "leave_requests" (
  "id" integer PRIMARY KEY AUTOINCREMENT,
  "employee_id" integer NOT NULL REFERENCES "employees" ("id"),
  "start_date" text NOT NULL,
  "end_date" text NOT NULL,
  "type" text NOT NULL CHECK (type IN ('VACATION', 'SICK', 'SPECIAL')),
  "status" text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  "substitute_id" integer REFERENCES "employees" ("id"),
  "notes" text,
  "created_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_employee_email" ON "employees" ("email");
CREATE INDEX IF NOT EXISTS "idx_employee_department" ON "employees" ("department");
CREATE INDEX IF NOT EXISTS "idx_time_entries_employee_date" ON "time_entries" ("employee_id", "date");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_employee" ON "leave_requests" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_status" ON "leave_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_dates" ON "leave_requests" ("start_date", "end_date");

-- Insert initial test data
INSERT INTO employees (name, email, department, annual_leave_balance)
VALUES 
  ('Admin User', 'admin@schwarzenbergtech.com', 'Management', 30),
  ('Test User', 'test@example.com', 'IT', 30),
  ('Maria Schmidt', 'maria.schmidt@schwarzenbergtech.com', 'HR', 30)
ON CONFLICT(email) DO NOTHING;

-- Add some example time entries
INSERT INTO time_entries (employee_id, date, start_time, end_time, break_duration, project)
SELECT 
  id, 
  date('now'), 
  '09:00',
  '17:30',
  45,
  'INTERNAL'
FROM employees 
WHERE email = 'test@example.com'
AND NOT EXISTS (
  SELECT 1 FROM time_entries 
  WHERE employee_id = employees.id 
  AND date = date('now')
);

-- Add an example leave request
INSERT INTO leave_requests (employee_id, start_date, end_date, type, status, notes)
SELECT 
  id,
  date('now', '+14 days'),
  date('now', '+21 days'),
  'VACATION',
  'PENDING',
  'Annual summer vacation'
FROM employees 
WHERE email = 'test@example.com'
AND NOT EXISTS (
  SELECT 1 FROM leave_requests 
  WHERE employee_id = employees.id 
  AND start_date = date('now', '+14 days')
);