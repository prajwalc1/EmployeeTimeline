import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./server/routes";
import { setupVite, serveStatic, log } from "./server/vite";
import { initializeDatabase, closeDatabase, isDatabaseConnected, getDatabase, isDatabasePostgres } from "./db/web-adapter";
import session from "express-session";
import createMemoryStore from "memorystore";
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { createServer } from 'http';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const MemoryStore = createMemoryStore(session);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware with more secure settings for production
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Get data directory based on environment
function getDataDirectory(): string {
  // For development or when not in production, use local data directory
  if (process.env.NODE_ENV !== 'production') {
    return path.join(process.cwd(), 'data');
  }

  // For production deployments
  try {
    // Check if we're on Elastic Beanstalk or other AWS environment
    if (process.env.EB_ENVIRONMENT) {
      const dataDir = path.join('/tmp', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      return dataDir;
    }

    // Check if we're running in a container (like Docker)
    if (process.env.CONTAINER) {
      const dataDir = path.join('/data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      return dataDir;
    }

    // Default cloud storage location
    const cloudDataDir = path.join(os.tmpdir(), 'SchwarzenbergTech', 'TimeManagement');
    if (!fs.existsSync(cloudDataDir)) {
      fs.mkdirSync(cloudDataDir, { recursive: true });
    }
    return cloudDataDir;
  } catch (error) {
    console.error('Error creating data directory:', error);
    return path.join(process.cwd(), 'data');
  }
}

// Function to check if a port is available
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.on('error', () => {
      resolve(false);
    });
    server.on('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '0.0.0.0');
  });
}

// Function to find an available port
async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  // If PORT environment variable is set (common in cloud environments), use that
  const envPort = process.env.PORT;
  if (envPort) {
    return parseInt(envPort, 10);
  }

  // Otherwise find an available port
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  throw new Error(`No available ports found between ${startPort} and ${startPort + maxAttempts - 1}`);
}

let isReconnecting = false;

async function reconnectDatabase(): Promise<boolean> {
  if (isReconnecting) return false;

  isReconnecting = true;
  try {
    log("Attempting database reconnection...");
    await initializeDatabase(getDataDirectory());
    if (!isDatabaseConnected()) {
      throw new Error("Failed to re-establish database connection");
    }
    log("Database connection restored");
    return true;
  } catch (error) {
    console.error('Database reconnection failed:', error);
    return false;
  } finally {
    isReconnecting = false;
  }
}

async function startServer() {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      log("Starting server initialization...");

      // Initialize database
      const dbPath = getDataDirectory();
      try {
        await initializeDatabase(dbPath);
        
        if (isDatabasePostgres()) {
          log("PostgreSQL database initialized successfully");
        } else {
          log("SQLite database initialized successfully");
        }
        
        break; // Exit the retry loop if successful
      } catch (dbError) {
        retryCount++;
        log(`Database initialization attempt ${retryCount} failed:`);
        console.error(dbError);

        if (retryCount === maxRetries) {
          log("Maximum database initialization attempts reached. Exiting...");
          process.exit(1);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
    } catch (error) {
      retryCount++;
      log(`Server initialization attempt ${retryCount} failed:`);
      console.error(error);

      if (retryCount === maxRetries) {
        log("Maximum initialization attempts reached. Exiting...");
        process.exit(1);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  try {
    // Database middleware - check connection for API routes
    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (!req.path.startsWith('/api')) {
        return next();
      }

      // Add retry logic for database connections
      let retries = 3;
      while (retries > 0) {
        if (isDatabaseConnected()) {
          return next();
        }

        log(`Database connection check failed. Retries remaining: ${retries}`);
        const reconnected = await reconnectDatabase();
        if (reconnected) {
          return next();
        }

        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return res.status(503).json({
        message: 'Datenbankverbindung konnte nicht hergestellt werden. Bitte versuchen Sie es in einigen Momenten erneut.',
        error: 'Database connection error'
      });
    });

    const server = registerRoutes(app);
    log("Routes registered successfully");

    // Error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Find available port, starting from 5000
    const PORT = await findAvailablePort(5000);
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
      log(`App URL: http://localhost:${PORT}`);
    });

    // Graceful shutdown handlers
    const shutdown = () => {
      log("Shutting down gracefully...");
      closeDatabase();
      server.close(() => {
        log("Server closed");
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return server;
  } catch (error) {
    console.error("Failed to start server:", error);
    closeDatabase();
    process.exit(1);
  }
}

startServer().catch((error: Error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { startServer, app };