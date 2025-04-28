/**
 * Schwarzenberg Tech Employee Time Management System
 * Deployment Script - Prepare app for Odoo-style deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('yaml');

// Deployment configuration
const deployConfig = {
  name: 'SchwarzenbergTech-TimeManagement',
  version: '1.0.0',
  description: 'Employee Time and Leave Management System',
  outputDir: './deploy',
  modulesToInclude: [
    'core',
    'timeTracking',
    'leaveManagement',
    'reporting',
    'admin'
  ],
  filesToCopy: [
    'modular-server.js',
    'server-config.js',
    'README.md',
    'package.json',
    '.env.example',
    'config.yaml'
  ],
  directoriesToCopy: [
    'modules',
    'client/dist',
    'db',
    'migrations',
    'public'
  ],
  scripts: {
    start: 'node modular-server.js',
    setup: 'node setup.js'
  },
  dependencies: [
    'express',
    'express-session',
    'memorystore',
    'body-parser',
    'helmet',
    'compression',
    'ws',
    'yaml',
    'dotenv',
    'drizzle-orm',
    'better-sqlite3',
    'pg',
    'postgres',
    'date-fns',
    'date-fns-tz',
    'zod'
  ],
  devDependencies: [],
  platforms: ['linux', 'win32']
};

/**
 * Deploy the application
 */
async function deploy() {
  try {
    console.log('Starting deployment...');
    
    // Create deployment directory
    const outputDir = path.resolve(deployConfig.outputDir);
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Create default config file
    createDefaultConfigFile();
    
    // Copy files
    copyFiles();
    
    // Copy directories
    copyDirectories();
    
    // Create package.json for deployment
    createPackageJson();
    
    // Create setup script
    createSetupScript();
    
    // Create deployment scripts for different platforms
    createDeploymentScripts();
    
    // Create Docker files
    createDockerFiles();
    
    // Success message
    console.log(`
Deployment completed successfully!
Output directory: ${outputDir}

To run the application:
1. Navigate to ${deployConfig.outputDir}
2. Install dependencies: npm install
3. Configure environment: cp .env.example .env
4. Edit .env file with your settings
5. Start the application: npm start

For container deployment:
- Docker: docker build -t ${deployConfig.name.toLowerCase()} . && docker run -p 5000:5000 ${deployConfig.name.toLowerCase()}
`);
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

/**
 * Create default configuration file
 */
function createDefaultConfigFile() {
  const configPath = path.resolve('config.yaml');
  
  // If config.yaml doesn't exist, create it
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      server: {
        host: '0.0.0.0',
        port: 5000,
        workers: 1,
        compression: true,
        cors: {
          enabled: true,
          origins: ['*'],
        },
        maxUploadSize: '50mb',
      },
      database: {
        type: 'sqlite',
        sqlite: {
          path: './data/database.sqlite',
          journalMode: 'WAL',
        },
        postgres: {
          url: '',
          maxConnections: 10,
          sslEnabled: true,
        },
        backup: {
          autoBackup: true,
          intervalHours: 24,
          maxBackups: 7,
          path: './backups',
        },
      },
      security: {
        sessionSecret: 'change-me-in-production',
        jwtSecret: 'change-me-in-production',
        jwtExpiration: '24h',
        passwordHashRounds: 10,
        csrfProtection: true,
        rateLimit: {
          enabled: true,
          windowMs: 15 * 60 * 1000,
          maxRequests: 100,
        },
      },
      modules: {
        core: {
          enabled: true,
          settings: {
            companyName: 'Schwarzenberg Tech',
            systemTitle: 'Time Management System',
            language: 'de',
            dateFormat: 'dd.MM.yyyy',
            timeFormat: 'HH:mm',
            timezone: 'Europe/Berlin',
          },
        },
        timeTracking: {
          enabled: true,
          settings: {
            workingHoursPerDay: 8,
            breakDurationMinutes: 30,
            allowOvertime: true,
            roundingMethod: 'nearest',
            roundingMinutes: 15,
            automaticBreakDeduction: true,
            minimumBreakThresholdHours: 6,
            defaultProjectCode: 'INTERNAL',
          },
        },
        leaveManagement: {
          enabled: true,
        },
        reporting: {
          enabled: true,
        },
        admin: {
          enabled: true,
        },
      },
      logging: {
        level: 'info',
        console: true,
        file: {
          enabled: true,
          path: './logs',
          maxSize: '10m',
          maxFiles: 5,
        },
      },
    };
    
    fs.writeFileSync(configPath, yaml.stringify(defaultConfig));
    console.log('Created default config.yaml');
  }
  
  // Copy config.yaml to deployment directory
  fs.copyFileSync(
    configPath,
    path.join(deployConfig.outputDir, 'config.yaml')
  );
}

/**
 * Copy files
 */
function copyFiles() {
  deployConfig.filesToCopy.forEach(file => {
    const srcPath = path.resolve(file);
    const destPath = path.join(deployConfig.outputDir, file);
    
    if (fs.existsSync(srcPath)) {
      ensureDirectoryExists(path.dirname(destPath));
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${file}`);
    } else {
      console.warn(`Warning: File not found: ${file}`);
    }
  });
  
  // Create .env.example
  const envExamplePath = path.join(deployConfig.outputDir, '.env.example');
  const envExampleContent = `# Server Configuration
NODE_ENV=production
PORT=5000
SESSION_SECRET=change-me-in-production

# Database Configuration
DB_TYPE=sqlite
DATABASE_URL=

# Logging
LOG_LEVEL=info

# Security
JWT_SECRET=change-me-in-production
`;
  
  fs.writeFileSync(envExamplePath, envExampleContent);
  console.log('Created .env.example');
}

/**
 * Copy directories
 */
function copyDirectories() {
  deployConfig.directoriesToCopy.forEach(dir => {
    const srcDir = path.resolve(dir);
    const destDir = path.join(deployConfig.outputDir, dir);
    
    if (fs.existsSync(srcDir)) {
      ensureDirectoryExists(destDir);
      copyDirectory(srcDir, destDir);
      console.log(`Copied directory ${dir}`);
    } else {
      console.warn(`Warning: Directory not found: ${dir}`);
      ensureDirectoryExists(destDir);
    }
  });
  
  // Create additional required directories
  const additionalDirs = [
    'data',
    'logs',
    'backups',
  ];
  
  additionalDirs.forEach(dir => {
    const destDir = path.join(deployConfig.outputDir, dir);
    ensureDirectoryExists(destDir);
    fs.writeFileSync(path.join(destDir, '.gitkeep'), '');
    console.log(`Created directory ${dir}`);
  });
}

/**
 * Create package.json for deployment
 */
function createPackageJson() {
  // Start with current package.json if it exists
  let packageJson = {};
  const currentPackagePath = path.resolve('package.json');
  
  if (fs.existsSync(currentPackagePath)) {
    packageJson = JSON.parse(fs.readFileSync(currentPackagePath, 'utf8'));
  }
  
  // Override with deployment config
  packageJson.name = deployConfig.name;
  packageJson.version = deployConfig.version;
  packageJson.description = deployConfig.description;
  packageJson.main = 'modular-server.js';
  packageJson.scripts = deployConfig.scripts;
  
  // Add license
  packageJson.license = 'MIT';
  
  // Filter and organize dependencies
  const dependencies = {};
  const devDependencies = {};
  
  deployConfig.dependencies.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      dependencies[dep] = packageJson.dependencies[dep];
    } else {
      dependencies[dep] = '*';
    }
  });
  
  deployConfig.devDependencies.forEach(dep => {
    if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
      devDependencies[dep] = packageJson.devDependencies[dep];
    } else {
      devDependencies[dep] = '*';
    }
  });
  
  packageJson.dependencies = dependencies;
  packageJson.devDependencies = devDependencies;
  
  // Add repository info
  packageJson.repository = {
    type: 'git',
    url: 'https://github.com/yourusername/timemanagement.git'
  };
  
  // Add keywords
  packageJson.keywords = [
    'time-tracking',
    'leave-management',
    'hr',
    'employee',
    'timesheet',
    'attendance'
  ];
  
  // Add engines
  packageJson.engines = {
    node: '>=16.0.0'
  };
  
  // Write package.json
  fs.writeFileSync(
    path.join(deployConfig.outputDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  console.log('Created package.json');
}

/**
 * Create setup script
 */
function createSetupScript() {
  const setupScriptPath = path.join(deployConfig.outputDir, 'setup.js');
  const setupScriptContent = `/**
 * Schwarzenberg Tech Employee Time Management System
 * Setup Script - Initialize the application
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { execSync } = require('child_process');
const yaml = require('yaml');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask a question and get user input
 * @param {string} question - Question to ask
 * @param {string} defaultAnswer - Default answer if user presses enter
 * @returns {Promise<string>} User input
 */
function ask(question, defaultAnswer = '') {
  const defaultText = defaultAnswer ? \` (\${defaultAnswer})\` : '';
  
  return new Promise(resolve => {
    rl.question(\`\${question}\${defaultText}: \`, answer => {
      resolve(answer || defaultAnswer);
    });
  });
}

/**
 * Run setup
 */
async function setup() {
  console.log('\\n===== Schwarzenberg Tech Time Management Setup =====\\n');
  
  try {
    // Check if config.yaml exists
    const configPath = path.resolve('config.yaml');
    let config = {};
    
    if (fs.existsSync(configPath)) {
      config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('Found existing configuration file');
    } else {
      console.log('No configuration file found, creating new one');
    }
    
    // Company information
    console.log('\\n----- Company Information -----');
    config.modules = config.modules || {};
    config.modules.core = config.modules.core || { enabled: true, settings: {} };
    config.modules.core.settings = config.modules.core.settings || {};
    
    config.modules.core.settings.companyName = await ask(
      'Company name',
      config.modules.core.settings.companyName || 'Schwarzenberg Tech'
    );
    
    config.modules.core.settings.systemTitle = await ask(
      'System title',
      config.modules.core.settings.systemTitle || 'Time Management System'
    );
    
    // Database configuration
    console.log('\\n----- Database Configuration -----');
    config.database = config.database || {};
    
    const dbType = await ask(
      'Database type (sqlite/postgres)',
      config.database.type || 'sqlite'
    );
    
    config.database.type = dbType.toLowerCase();
    
    if (dbType.toLowerCase() === 'postgres') {
      config.database.postgres = config.database.postgres || {};
      
      config.database.postgres.url = await ask(
        'PostgreSQL connection URL',
        config.database.postgres.url || 'postgresql://username:password@localhost:5432/timemanagement'
      );
      
      const sslEnabled = await ask(
        'Enable SSL for PostgreSQL (yes/no)',
        config.database.postgres.sslEnabled ? 'yes' : 'no'
      );
      
      config.database.postgres.sslEnabled = sslEnabled.toLowerCase() === 'yes';
    } else {
      config.database.sqlite = config.database.sqlite || {};
      
      const dbPath = await ask(
        'SQLite database path',
        config.database.sqlite.path || './data/database.sqlite'
      );
      
      config.database.sqlite.path = dbPath;
      
      // Ensure directory exists
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(\`Created directory: \${dbDir}\`);
      }
    }
    
    // Security settings
    console.log('\\n----- Security Configuration -----');
    config.security = config.security || {};
    
    const generateSecret = () => {
      return crypto.randomBytes(32).toString('hex');
    };
    
    config.security.sessionSecret = await ask(
      'Session secret (leave empty to generate)',
      config.security.sessionSecret || ''
    );
    
    if (!config.security.sessionSecret) {
      config.security.sessionSecret = generateSecret();
      console.log(\`Generated new session secret: \${config.security.sessionSecret.slice(0, 8)}...\`);
    }
    
    config.security.jwtSecret = await ask(
      'JWT secret (leave empty to generate)',
      config.security.jwtSecret || ''
    );
    
    if (!config.security.jwtSecret) {
      config.security.jwtSecret = generateSecret();
      console.log(\`Generated new JWT secret: \${config.security.jwtSecret.slice(0, 8)}...\`);
    }
    
    // Server settings
    console.log('\\n----- Server Configuration -----');
    config.server = config.server || {};
    
    config.server.port = parseInt(await ask(
      'Server port',
      config.server.port || '5000'
    ));
    
    // Save configuration
    fs.writeFileSync(configPath, yaml.stringify(config));
    console.log(\`\\nConfiguration saved to \${configPath}\`);
    
    // Create .env file
    const envPath = path.resolve('.env');
    const envContent = \`# Server Configuration
NODE_ENV=production
PORT=\${config.server.port}
SESSION_SECRET=\${config.security.sessionSecret}

# Database Configuration
DB_TYPE=\${config.database.type}
\${config.database.type === 'postgres' ? \`DATABASE_URL=\${config.database.postgres.url}\` : ''}

# Security
JWT_SECRET=\${config.security.jwtSecret}
\`;
    
    fs.writeFileSync(envPath, envContent);
    console.log(\`Environment variables saved to \${envPath}\`);
    
    // Create directories
    const directories = [
      'data',
      'logs',
      'backups'
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(\`Created directory: \${dir}\`);
      }
    });
    
    console.log('\\n===== Setup Complete =====');
    console.log('\\nYou can now start the application with: npm start');
  } catch (error) {
    console.error('Setup failed:', error);
  } finally {
    rl.close();
  }
}

// Start setup
setup();
`;
  
  fs.writeFileSync(setupScriptPath, setupScriptContent);
  console.log('Created setup.js');
}

/**
 * Create deployment scripts
 */
function createDeploymentScripts() {
  // Linux/Mac start script
  const startShScript = path.join(deployConfig.outputDir, 'start.sh');
  const startShContent = `#!/bin/bash
# Start script for Schwarzenberg Tech Time Management System

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm."
    exit 1
fi

# Check if config exists
if [ ! -f "config.yaml" ]; then
    echo "Configuration file not found. Running setup..."
    node setup.js
fi

# Check if environment file exists
if [ ! -f ".env" ]; then
    echo "Environment file not found. Creating from example..."
    cp .env.example .env
    echo "Please edit .env file with your settings before starting the application."
    exit 1
fi

# Start the application
echo "Starting Schwarzenberg Tech Time Management System..."
node modular-server.js
`;
  
  fs.writeFileSync(startShScript, startShContent);
  fs.chmodSync(startShScript, 0o755);
  console.log('Created start.sh');
  
  // Windows start script
  const startBatScript = path.join(deployConfig.outputDir, 'start.bat');
  const startBatContent = `@echo off
:: Start script for Schwarzenberg Tech Time Management System

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed. Please install Node.js 16 or higher.
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo npm is not installed. Please install npm.
    exit /b 1
)

:: Check if config exists
if not exist config.yaml (
    echo Configuration file not found. Running setup...
    node setup.js
)

:: Check if environment file exists
if not exist .env (
    echo Environment file not found. Creating from example...
    copy .env.example .env
    echo Please edit .env file with your settings before starting the application.
    exit /b 1
)

:: Start the application
echo Starting Schwarzenberg Tech Time Management System...
node modular-server.js
`;
  
  fs.writeFileSync(startBatScript, startBatContent);
  console.log('Created start.bat');
  
  // Install script for Linux/Mac
  const installShScript = path.join(deployConfig.outputDir, 'install.sh');
  const installShContent = `#!/bin/bash
# Installation script for Schwarzenberg Tech Time Management System

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Run setup
echo "Running setup..."
node setup.js

echo "Installation complete! You can now start the application with: ./start.sh"
`;
  
  fs.writeFileSync(installShScript, installShContent);
  fs.chmodSync(installShScript, 0o755);
  console.log('Created install.sh');
  
  // Install script for Windows
  const installBatScript = path.join(deployConfig.outputDir, 'install.bat');
  const installBatContent = `@echo off
:: Installation script for Schwarzenberg Tech Time Management System

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed. Please install Node.js 16 or higher.
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo npm is not installed. Please install npm.
    exit /b 1
)

:: Install dependencies
echo Installing dependencies...
npm install

:: Run setup
echo Running setup...
node setup.js

echo Installation complete! You can now start the application with: start.bat
`;
  
  fs.writeFileSync(installBatScript, installBatContent);
  console.log('Created install.bat');
}

/**
 * Create Docker files
 */
function createDockerFiles() {
  // Dockerfile
  const dockerfilePath = path.join(deployConfig.outputDir, 'Dockerfile');
  const dockerfileContent = `FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p data logs backups

# Set environment to production
ENV NODE_ENV=production

# Expose the port
EXPOSE 5000

# Start the application
CMD ["node", "modular-server.js"]
`;
  
  fs.writeFileSync(dockerfilePath, dockerfileContent);
  console.log('Created Dockerfile');
  
  // docker-compose.yml
  const dockerComposePath = path.join(deployConfig.outputDir, 'docker-compose.yml');
  const dockerComposeContent = `version: '3'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - DB_TYPE=postgres
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/timemanagement
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./backups:/app/backups
      - ./config.yaml:/app/config.yaml
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=timemanagement
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
`;
  
  fs.writeFileSync(dockerComposePath, dockerComposeContent);
  console.log('Created docker-compose.yml');
}

/**
 * Helper function to ensure a directory exists
 * @param {string} dir - Directory path
 */
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Helper function to copy a directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirectory(src, dest) {
  ensureDirectoryExists(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Run deployment
deploy().catch(error => {
  console.error('Deployment failed:', error);
  process.exit(1);
});