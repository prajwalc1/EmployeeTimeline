/**
 * Web-only version of the Employee Time Management System
 * This script prepares the application for web deployment
 */

const fs = require('fs');
const path = require('path');

// Create a web-only deployment folder
function createWebDeploymentFolder() {
  console.log('Creating web deployment folder...');
  
  // Define paths
  const webDeploymentDir = path.join(__dirname, 'web-deploy');
  
  // Create deployment directory if it doesn't exist
  if (!fs.existsSync(webDeploymentDir)) {
    fs.mkdirSync(webDeploymentDir, { recursive: true });
  }
  
  // Directories to copy
  const dirsToCopy = [
    'client',
    'server',
    'db',
    'migrations'
  ];
  
  // Files to copy
  const filesToCopy = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'drizzle.config.ts',
    'theme.json'
  ];
  
  // Copy directories
  dirsToCopy.forEach(dir => {
    const srcDir = path.join(__dirname, dir);
    const destDir = path.join(webDeploymentDir, dir);
    
    if (fs.existsSync(srcDir)) {
      console.log(`Copying directory: ${dir}`);
      copyRecursively(srcDir, destDir);
    }
  });
  
  // Copy individual files
  filesToCopy.forEach(file => {
    const srcFile = path.join(__dirname, file);
    const destFile = path.join(webDeploymentDir, file);
    
    if (fs.existsSync(srcFile)) {
      console.log(`Copying file: ${file}`);
      fs.copyFileSync(srcFile, destFile);
    }
  });
  
  // Create web-specific files
  createWebSpecificFiles(webDeploymentDir);
  
  console.log('Web deployment folder created successfully at:', webDeploymentDir);
  console.log('You can now deploy this folder to any Node.js hosting service.');
}

// Helper function to copy directories recursively
function copyRecursively(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyRecursively(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Create web-specific files like Dockerfile, .env, etc.
function createWebSpecificFiles(deployDir) {
  // Create web-specific package.json
  const packageJson = require('./package.json');
  const webPackageJson = {
    ...packageJson,
    name: `${packageJson.name}-web`,
    description: `${packageJson.description} (Web Version)`,
    scripts: {
      "start": "node dist/server/index.js",
      "dev": "tsx server/index.ts",
      "build": "tsc && vite build",
      "postinstall": "npm run build",
      "db:push": "drizzle-kit push:sqlite"
    }
  };
  
  // Remove Electron dependencies
  if (webPackageJson.dependencies) {
    delete webPackageJson.dependencies.electron;
    delete webPackageJson.dependencies['electron-builder'];
  }
  
  if (webPackageJson.devDependencies) {
    delete webPackageJson.devDependencies.electron;
    delete webPackageJson.devDependencies['electron-builder'];
  }
  
  fs.writeFileSync(
    path.join(deployDir, 'package.json'),
    JSON.stringify(webPackageJson, null, 2)
  );
  
  // Create a Dockerfile for containerized deployment
  const dockerfileContent = `FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Command to run the app
CMD ["npm", "start"]
`;
  
  fs.writeFileSync(
    path.join(deployDir, 'Dockerfile'),
    dockerfileContent
  );
  
  // Create .env file for configuration
  const envContent = `# Server Configuration
PORT=5000
NODE_ENV=production
SESSION_SECRET=your-session-secret-key-change-in-production

# Database Configuration - Uncomment and set these for PostgreSQL in production
# DATABASE_URL=postgres://username:password@host:port/database
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=postgres
# POSTGRES_DB=timemanagement

# Set to 'postgres' to use PostgreSQL or 'sqlite' to use SQLite
DB_TYPE=sqlite
`;
  
  fs.writeFileSync(
    path.join(deployDir, '.env.example'),
    envContent
  );
  
  // Create a basic README with deployment instructions
  const readmeContent = `# Schwarzenberg Tech Employee Time Management System (Web Version)

This is the web-deployable version of the Employee Time and Leave Management System.

## Deployment Options

### 1. AWS Elastic Beanstalk Deployment

1. Create an AWS account if you don't have one
2. Install the AWS CLI and EB CLI tools
3. Configure your AWS credentials
4. From this directory, run:
   \`\`\`
   eb init
   eb create production-environment
   \`\`\`

### 2. Docker Deployment

1. Build the Docker image:
   \`\`\`
   docker build -t time-management-app .
   \`\`\`

2. Run the container:
   \`\`\`
   docker run -p 5000:5000 time-management-app
   \`\`\`

### 3. Heroku Deployment

1. Install the Heroku CLI
2. Login to Heroku:
   \`\`\`
   heroku login
   \`\`\`
   
3. Create Heroku app:
   \`\`\`
   heroku create
   \`\`\`
   
4. Deploy:
   \`\`\`
   git push heroku main
   \`\`\`

## Environment Configuration

Copy \`.env.example\` to \`.env\` and configure the environment variables before deployment.

For production deployments, it's recommended to use PostgreSQL instead of SQLite.
`;
  
  fs.writeFileSync(
    path.join(deployDir, 'README.md'),
    readmeContent
  );
  
  // Create AWS configuration files
  const ebConfigContent = `branch-defaults:
  main:
    environment: production
    group_suffix: null
global:
  application_name: time-management-app
  branch: null
  default_ec2_keyname: null
  default_platform: Node.js
  default_region: us-east-1
  include_git_submodules: true
  instance_profile: null
  platform_name: null
  platform_version: null
  profile: null
  repository: null
  sc: git
  workspace_type: Application
`;
  
  if (!fs.existsSync(path.join(deployDir, '.elasticbeanstalk'))) {
    fs.mkdirSync(path.join(deployDir, '.elasticbeanstalk'), { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deployDir, '.elasticbeanstalk', 'config.yml'),
    ebConfigContent
  );

  // Create necessary scripts for the web-based version
  const dbAdapterScript = `
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

let db: any = null;
let sqlite: Database.Database | null = null;
let pgClient: any = null;

// Determine database type from environment or config
const isDatabasePostgres = () => {
  return process.env.DB_TYPE === 'postgres' || process.env.DATABASE_URL?.startsWith('postgres');
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

export const initializeDatabase = async (userDataPath: string) => {
  try {
    // Close existing connection if any
    await closeDatabase();

    if (isDatabasePostgres()) {
      return await initializePostgresDatabase();
    } else {
      return await initializeSqliteDatabase(userDataPath);
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    await closeDatabase();
    throw error;
  }
};

const initializeSqliteDatabase = async (userDataPath: string) => {
  try {
    // Create directories if they don't exist
    fs.mkdirSync(userDataPath, { recursive: true });
    const dbPath = path.join(userDataPath, 'database.sqlite');
    console.log('Initializing SQLite database at:', dbPath);

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
        const createEmployeesTable = \`
          CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            department TEXT NOT NULL,
            manager_id INTEGER REFERENCES employees(id),
            substitute_id INTEGER REFERENCES employees(id),
            annual_leave_balance INTEGER NOT NULL DEFAULT 30
          );
        \`;

        const createTimeEntriesTable = \`
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
        \`;

        const createLeaveRequestsTable = \`
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
        \`;

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
          sqlite.prepare(\`
            INSERT INTO employees (name, email, department, annual_leave_balance)
            VALUES (?, ?, ?, ?)
          \`).run('Test User', 'test@example.com', 'IT', 30);
        }

        // Verify connection
        sqlite.prepare('SELECT 1').get();
        console.log('SQLite database initialized successfully at:', dbPath);
        break; // Exit retry loop on success
      } catch (error) {
        retryCount++;
        console.error(\`Database initialization attempt \${retryCount} failed:\`, error);

        if (retryCount === maxRetries) {
          throw new Error(\`Failed to initialize database after \${maxRetries} attempts\`);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return db;
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
    throw error;
  }
};

const initializePostgresDatabase = async () => {
  try {
    console.log('Initializing PostgreSQL database');
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
    }
    
    // Connect to PostgreSQL
    pgClient = postgres(connectionString, { 
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    });
    
    // Initialize Drizzle
    db = drizzlePostgres(pgClient, { schema });
    
    console.log('PostgreSQL database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize PostgreSQL database:', error);
    throw error;
  }
};

export const closeDatabase = async () => {
  try {
    if (sqlite) {
      sqlite.close();
      console.log('SQLite database connection closed');
    }
    
    if (pgClient) {
      await pgClient.end();
      console.log('PostgreSQL database connection closed');
    }
  } catch (error) {
    console.error('Error closing database:', error);
  } finally {
    sqlite = null;
    pgClient = null;
    db = null;
  }
};

export const isDatabaseConnected = () => {
  try {
    if (isDatabasePostgres()) {
      // For Postgres, we can check if the client is not null
      return pgClient !== null;
    } else {
      // For SQLite, try to execute a simple query
      if (!sqlite) return false;
      sqlite.prepare('SELECT 1').get();
      return true;
    }
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};

export { isDatabasePostgres };
`;

  fs.writeFileSync(
    path.join(deployDir, 'db', 'web-adapter.ts'),
    dbAdapterScript
  );
}

// Start the process
createWebDeploymentFolder();