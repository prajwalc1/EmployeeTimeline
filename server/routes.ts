import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { employees, timeEntries, leaveRequests } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { de } from "date-fns/locale";
import { z } from "zod";
import { getDatabase } from "@db";

// Error handling middleware
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('Route error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
      }
      next(error);
    });
  };

// Validation schemas
const timeEntrySchema = z.object({
  employeeId: z.number(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakDuration: z.number().min(0).default(30),
  project: z.string().default("INTERNAL"),
  notes: z.string().optional(),
});

const leaveRequestSchema = z.object({
  employeeId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  type: z.string(),
  notes: z.string().optional(),
});

export function registerRoutes(app: Express): Server {
  // API routes
  app.get("/api/employees", asyncHandler(async (_req, res) => {
    try {
      const db = getDatabase();
      const results = await db.select().from(employees);
      console.log('Fetched employees:', results);
      res.json(results);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ 
        message: 'Error fetching employees',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // Time entries
  app.post("/api/time-entries", asyncHandler(async (req, res) => {
    console.log('Received time entry request:', req.body);
    try {
      const db = getDatabase();
      const { employeeId, date, startTime, endTime, breakDuration, project, notes } = req.body;

      if (!employeeId || !date || !startTime || !endTime) {
        return res.status(400).send("Bitte füllen Sie alle erforderlichen Felder aus.");
      }

      // Parse and validate the date
      const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
      if (isNaN(parsedDate.getTime())) {
        console.error('Invalid date:', date);
        return res.status(400).send("Ungültiges Datum");
      }

      // Create full timestamps with timezone
      const createDateTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const dt = new Date(parsedDate);
        dt.setHours(hours, minutes, 0, 0);
        return dt.toISOString();
      };

      const startDateTime = createDateTime(startTime);
      const endDateTime = createDateTime(endTime);

      console.log('Formatted times:', { startDateTime, endDateTime });

      // Check for existing entries on the same date
      const existingEntries = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.employeeId, parseInt(employeeId)),
            eq(timeEntries.date, date)
          )
        );

      // Check for time overlap
      const newStartTime = new Date(startDateTime);
      const newEndTime = new Date(endDateTime);

      console.log('Checking overlap for new entry:', {
        date,
        newStart: formatInTimeZone(newStartTime, 'Europe/Berlin', 'HH:mm'),
        newEnd: formatInTimeZone(newEndTime, 'Europe/Berlin', 'HH:mm'),
        existingEntries: existingEntries.length
      });

      let hasOverlap = false;
      for (const entry of existingEntries) {
        const existingStart = new Date(entry.startTime);
        const existingEnd = new Date(entry.endTime);

        const overlaps = (
          (newStartTime < existingEnd && newEndTime > existingStart) ||
          (existingStart < newEndTime && existingEnd > newStartTime)
        );

        if (overlaps) {
          console.log('Found overlap with existing entry:', {
            existingDate: entry.date,
            existingStart: formatInTimeZone(existingStart, 'Europe/Berlin', 'HH:mm'),
            existingEnd: formatInTimeZone(existingEnd, 'Europe/Berlin', 'HH:mm')
          });
          hasOverlap = true;
          break;
        }
      }

      if (hasOverlap) {
        return res.status(400).send(
          "Es existiert bereits ein Zeiteintrag für diesen Zeitraum. " +
          "Bitte wählen Sie einen anderen Zeitraum."
        );
      }

      // Insert the new time entry
      const [entry] = await db
        .insert(timeEntries)
        .values({
          employeeId: parseInt(employeeId),
          date,
          startTime: startDateTime,
          endTime: endDateTime,
          breakDuration: parseInt(breakDuration.toString()),
          project: project || 'INTERNAL',
          notes: notes || ''
        })
        .returning();

      console.log('Created time entry:', entry);
      res.json(entry);
    } catch (error) {
      console.error('Error creating time entry:', error);
      res.status(500).json({ 
        message: 'Fehler beim Erstellen des Zeiteintrags',
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }));

  app.get("/api/time-entries/monthly-total/:employeeId", asyncHandler(async (req, res) => {
    const { employeeId } = req.params;

    try {
      const db = getDatabase();
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      console.log('Calculating monthly total for:', { employeeId, currentMonth, currentYear });

      const entries = await db
        .select()
        .from(timeEntries)
        .where(
          eq(timeEntries.employeeId, parseInt(employeeId))
        );

      // Filter and calculate total manually for SQLite
      const monthlyEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() + 1 === currentMonth && 
               entryDate.getFullYear() === currentYear;
      });

      const total = monthlyEntries.reduce((acc, entry) => {
        const start = new Date(entry.startTime);
        const end = new Date(entry.endTime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return acc + (hours - entry.breakDuration / 60);
      }, 0);

      const totalHours = total.toFixed(2);

      console.log('Calculated total hours:', totalHours);

      res.json({ totalHours });
    } catch (error) {
      console.error('Error calculating monthly total:', error);
      res.status(500).json({
        message: 'Error calculating monthly total',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  app.get("/api/time-entries", asyncHandler(async (req, res) => {
    try {
      const db = getDatabase();
      // Get all time entries and sort by date and start time
      const entries = await db
        .select()
        .from(timeEntries)
        .orderBy(timeEntries.date, timeEntries.startTime, 'DESC');

      console.log('Retrieved raw time entries:', entries);

      // Convert times to Berlin timezone and format dates
      const formattedEntries = entries.map(entry => {
        try {
          const startTime = new Date(entry.startTime);
          const endTime = new Date(entry.endTime);
          const entryDate = new Date(entry.date);

          return {
            ...entry,
            startTime: formatInTimeZone(startTime, 'Europe/Berlin', 'HH:mm'),
            endTime: formatInTimeZone(endTime, 'Europe/Berlin', 'HH:mm'),
            date: formatInTimeZone(entryDate, 'Europe/Berlin', 'dd.MM.yyyy')
          };
        } catch (error) {
          console.error('Error formatting entry:', entry, error);
          return entry;
        }
      });

      console.log('Formatted time entries:', formattedEntries);
      res.json(formattedEntries);
    } catch (error) {
      console.error('Error retrieving time entries:', error);
      res.status(500).json({
        message: 'Error retrieving time entries',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // Leave requests
  app.post("/api/leave-requests", asyncHandler(async (req, res) => {
    console.log('Received leave request:', req.body);
    try {
      const db = getDatabase();
      const { startDate, endDate, ...rest } = req.body;

      // Parse German format dates (dd.MM.yyyy)
      const parseDateStr = (dateStr: string) => {
        const [day, month, year] = dateStr.split('.');
        if (!day || !month || !year) {
          throw new Error("Ungültiges Datumsformat. Bitte verwenden Sie dd.MM.yyyy");
        }
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      };

      try {
        const startDateStr = parseDateStr(startDate);
        const endDateStr = parseDateStr(endDate);

        console.log('Parsed dates:', { startDateStr, endDateStr });

        const formattedStartDate = formatInTimeZone(
          parse(startDateStr, 'yyyy-MM-dd', new Date()),
          'Europe/Berlin',
          "yyyy-MM-dd'T'00:00:00XXX"
        );

        const formattedEndDate = formatInTimeZone(
          parse(endDateStr, 'yyyy-MM-dd', new Date()),
          'Europe/Berlin',
          "yyyy-MM-dd'T'23:59:59XXX"
        );

        console.log('Formatted dates:', { formattedStartDate, formattedEndDate });

        const [request] = await db
          .insert(leaveRequests)
          .values({
            ...rest,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
          })
          .returning();

        console.log('Created leave request:', request);
        res.json(request);
      } catch (parseError) {
        console.error('Date parsing error:', parseError);
        return res.status(400).send("Fehler beim Parsen des Datums");
      }
    } catch (error) {
      console.error('Error creating leave request:', error);
      res.status(500).json({
        message: 'Fehler beim Erstellen des Urlaubsantrags',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  app.get("/api/leave-requests", asyncHandler(async (req, res) => {
    try {
      const db = getDatabase();
      const requests = await db
        .select()
        .from(leaveRequests);

      console.log('Retrieved leave requests:', requests);

      // Convert dates to German format
      const formattedRequests = requests.map(request => {
        try {
          return {
            ...request,
            startDate: formatInTimeZone(new Date(request.startDate), 'Europe/Berlin', 'dd.MM.yyyy'),
            endDate: formatInTimeZone(new Date(request.endDate), 'Europe/Berlin', 'dd.MM.yyyy')
          };
        } catch (error) {
          console.error('Error formatting request:', request, error);
          return request;
        }
      });

      console.log('Formatted requests:', formattedRequests);
      res.json(formattedRequests);
    } catch (error) {
      console.error('Error retrieving leave requests:', error);
      res.status(500).json({
        message: 'Error retrieving leave requests',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    noServer: true,
    perMessageDeflate: false 
  });

  return httpServer;
}