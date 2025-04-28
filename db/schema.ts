import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Employee table definition
export const employees = sqliteTable('employees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  department: text('department').notNull(),
  managerId: integer('manager_id').references(() => employees.id),
  substituteId: integer('substitute_id').references(() => employees.id),
  annualLeaveBalance: integer('annual_leave_balance').notNull().default(30),
});

// Time entries table definition
export const timeEntries = sqliteTable('time_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  breakDuration: integer('break_duration').notNull().default(30),
  project: text('project').notNull().default('INTERNAL'),
  notes: text('notes'),
});

// Leave requests table definition
export const leaveRequests = sqliteTable('leave_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: integer('employee_id').notNull().references(() => employees.id),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull().default('PENDING'),
  substituteId: integer('substitute_id').references(() => employees.id),
  notes: text('notes'),
});

// Relations
export const employeesRelations = relations(employees, ({ many, one }) => ({
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
  }),
  substitute: one(employees, {
    fields: [employees.substituteId],
    references: [employees.id],
  }),
  timeEntries: many(timeEntries),
  leaveRequests: many(leaveRequests),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  employee: one(employees, {
    fields: [timeEntries.employeeId],
    references: [employees.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveRequests.employeeId],
    references: [employees.id],
  }),
  substitute: one(employees, {
    fields: [leaveRequests.substituteId],
    references: [employees.id],
  }),
}));

// Export types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;

// Export schemas
export const insertEmployeeSchema = createInsertSchema(employees);
export const selectEmployeeSchema = createSelectSchema(employees);
export const insertTimeEntrySchema = createInsertSchema(timeEntries);
export const selectTimeEntrySchema = createSelectSchema(timeEntries);
export const insertLeaveRequestSchema = createInsertSchema(leaveRequests);
export const selectLeaveRequestSchema = createSelectSchema(leaveRequests);