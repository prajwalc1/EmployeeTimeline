/**
 * Schwarzenberg Tech Employee Time Management System
 * Deployment Script for Cloud Server Environments
 * 
 * This script prepares the application for deployment to cloud environments
 * such as AWS, Google Cloud, or any standard server with Node.js support.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEPLOY_DIR = './deploy';
const SOURCE_DIRS = [
  'server',
  'client',
  'db',
  'migrations',
  'modules'
];
const SOURCE_FILES = [
  'package.json',
  'tsconfig.json',
  'drizzle.config.ts',
  'server-config.js',
  'postcss.config.js',
  'tailwind.config.ts',
  'theme.json',
  'vite.config.ts',
];

/**
 * Deploy the application
 */
async function deploy() {
  console.log('📦 Starting deployment process...');
  
  // Clean up previous deployment
  if (fs.existsSync(DEPLOY_DIR)) {
    console.log('🧹 Cleaning up previous deployment...');
    fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
  }
  
  // Create deployment directory
  ensureDirectoryExists(DEPLOY_DIR);
  
  // Copy necessary directories and files
  console.log('🔄 Copying files and directories...');
  copyDirectories();
  copyFiles();
  
  // Create deployment package.json
  console.log('📄 Creating deployment package.json...');
  createPackageJson();
  
  // Create configuration files
  console.log('⚙️ Creating configuration files...');
  createDefaultConfigFile();
  
  // Create deployment scripts
  console.log('🚀 Creating deployment scripts...');
  createDeploymentScripts();
  
  // Create Docker files
  console.log('🐳 Creating Docker files...');
  createDockerFiles();
  
  // Create documentation
  console.log('📚 Creating documentation...');
  copyDocumentation();
  
  console.log('✅ Deployment package created successfully!');
  console.log(`📂 The deployment package is available in: ${DEPLOY_DIR}`);
  console.log('\nFollow the instructions in DEPLOY.md to deploy to your server environment.');
}

/**
 * Create default configuration file
 */
function createDefaultConfigFile() {
  const configFile = path.join(DEPLOY_DIR, 'config.json');
  const defaultConfig = {
    server: {
      port: 5000,
      host: '0.0.0.0',
      sessionSecret: 'change-this-to-a-random-string',
      dataDir: './data',
    },
    database: {
      type: 'sqlite',
      file: './data/database.sqlite',
      // Postgres configuration (if needed)
      // host: 'localhost',
      // port: 5432,
      // user: 'postgres',
      // password: 'postgres',
      // database: 'timemanagement',
    },
    email: {
      enabled: true,
      provider: 'smtp',
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'user@example.com',
        pass: 'your-password',
      },
      from: {
        name: 'Time Management System',
        email: 'noreply@example.com',
      },
    },
    modules: {
      core: {
        enabled: true,
      },
      timeTracking: {
        enabled: true,
      },
      leaveManagement: {
        enabled: true,
      },
      notifications: {
        enabled: true,
      },
    },
  };
  
  fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
}

/**
 * Copy files
 */
function copyFiles() {
  SOURCE_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(DEPLOY_DIR, file));
    }
  });
}

/**
 * Copy directories
 */
function copyDirectories() {
  SOURCE_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      copyDirectory(dir, path.join(DEPLOY_DIR, dir));
    }
  });
  
  // Create data directory
  ensureDirectoryExists(path.join(DEPLOY_DIR, 'data'));
}

/**
 * Create package.json for deployment
 */
function createPackageJson() {
  let packageJson = {};
  
  if (fs.existsSync('package.json')) {
    packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  }
  
  // Create a clean package.json for deployment
  const deployPackageJson = {
    name: packageJson.name || 'schwarzenberg-tech-time-management',
    version: packageJson.version || '1.0.0',
    description: packageJson.description || 'Schwarzenberg Tech Employee Time Management System',
    author: packageJson.author || 'Schwarzenberg Tech',
    private: true,
    engines: {
      node: ">=18.0.0"
    },
    scripts: {
      "start": "node run-server.js",
      "build": "vite build",
      "dev": "tsx server/index.ts",
      "db:push": "drizzle-kit push:sqlite",
      "setup": "node setup.js"
    },
    dependencies: packageJson.dependencies || {},
  };
  
  fs.writeFileSync(
    path.join(DEPLOY_DIR, 'package.json'),
    JSON.stringify(deployPackageJson, null, 2)
  );
}

/**
 * Create deployment scripts
 */
function createDeploymentScripts() {
  // Create run-server.js
  const runServerScript = `/**
 * Schwarzenberg Tech Time Management System
 * Server Entry Point
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Default port and host
const DEFAULT_PORT = 5000;
const DEFAULT_HOST = '0.0.0.0';

function runServer() {
  // Load configuration if exists
  let config = {};
  const configPath = path.join(__dirname, 'config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('Error reading config file:', error);
      createDefaultConfig();
    }
  } else {
    createDefaultConfig();
  }
  
  const port = process.env.PORT || config.server?.port || DEFAULT_PORT;
  const host = process.env.HOST || config.server?.host || DEFAULT_HOST;
  
  // Start the server
  console.log(\`Starting Schwarzenberg Tech Time Management System on \${host}:\${port}...\`);
  
  const server = spawn('node', ['server-deploy/index.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port.toString(),
      HOST: host
    }
  });
  
  server.on('close', (code) => {
    console.log(\`Server process exited with code \${code}\`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    server.kill('SIGTERM');
    process.exit(0);
  });
}

function createDefaultConfig() {
  console.log('Creating default configuration file...');
  
  const defaultConfig = {
    server: {
      port: DEFAULT_PORT,
      host: DEFAULT_HOST,
      sessionSecret: Math.random().toString(36).substring(2, 15),
      dataDir: './data',
    },
    database: {
      type: 'sqlite',
      file: './data/database.sqlite',
    },
    email: {
      enabled: false,
      provider: 'smtp',
      host: 'smtp.example.com',
      port: 587,
      secure: false,
    },
    modules: {
      core: { enabled: true },
      timeTracking: { enabled: true },
      leaveManagement: { enabled: true },
      notifications: { enabled: true },
    },
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'config.json'),
    JSON.stringify(defaultConfig, null, 2)
  );
}

// Run the server
runServer();
`;

  fs.writeFileSync(path.join(DEPLOY_DIR, 'run-server.js'), runServerScript);

  // Create setup.js
  const setupScript = `/**
 * Schwarzenberg Tech Time Management System
 * Setup Script
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setup() {
  console.log('🚀 Starting Schwarzenberg Tech Time Management System setup...');
  
  // Ensure data directory exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Read config.json if it exists
  let config = {};
  const configPath = path.join(__dirname, 'config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('Error reading config file:', error);
    }
  }
  
  // Ask for configuration options
  config.server = config.server || {};
  config.server.port = await question('Enter server port [5000]: ', config.server.port || '5000');
  config.server.host = await question('Enter server host [0.0.0.0]: ', config.server.host || '0.0.0.0');
  config.server.sessionSecret = config.server.sessionSecret || Math.random().toString(36).substring(2, 15);
  
  // Database configuration
  config.database = config.database || {};
  const dbType = await question('Select database type (sqlite/postgres) [sqlite]: ', config.database.type || 'sqlite');
  config.database.type = dbType.toLowerCase();
  
  if (config.database.type === 'sqlite') {
    config.database.file = await question('Enter SQLite database file path [./data/database.sqlite]: ', 
      config.database.file || './data/database.sqlite');
  } else if (config.database.type === 'postgres') {
    config.database.host = await question('Enter PostgreSQL host [localhost]: ', 
      config.database.host || 'localhost');
    config.database.port = await question('Enter PostgreSQL port [5432]: ', 
      config.database.port || '5432');
    config.database.user = await question('Enter PostgreSQL username [postgres]: ', 
      config.database.user || 'postgres');
    config.database.password = await question('Enter PostgreSQL password: ', 
      config.database.password || '');
    config.database.database = await question('Enter PostgreSQL database name [timemanagement]: ', 
      config.database.database || 'timemanagement');
  }
  
  // Email configuration
  config.email = config.email || {};
  const emailEnabled = await question('Enable email notifications? (yes/no) [yes]: ', 
    config.email.enabled ? 'yes' : 'no');
  config.email.enabled = emailEnabled.toLowerCase() === 'yes';
  
  if (config.email.enabled) {
    config.email.provider = await question('Enter email provider (smtp/sendmail) [smtp]: ', 
      config.email.provider || 'smtp');
    
    if (config.email.provider === 'smtp') {
      config.email.host = await question('Enter SMTP host [smtp.example.com]: ', 
        config.email.host || 'smtp.example.com');
      config.email.port = await question('Enter SMTP port [587]: ', 
        config.email.port || '587');
      config.email.secure = (await question('Use secure connection? (yes/no) [no]: ', 
        config.email.secure ? 'yes' : 'no')).toLowerCase() === 'yes';
      
      config.email.auth = config.email.auth || {};
      config.email.auth.user = await question('Enter SMTP username: ', 
        config.email.auth.user || '');
      config.email.auth.pass = await question('Enter SMTP password: ', 
        config.email.auth.pass || '');
    }
    
    config.email.from = config.email.from || {};
    config.email.from.name = await question('Enter sender name [Time Management System]: ', 
      config.email.from.name || 'Time Management System');
    config.email.from.email = await question('Enter sender email [noreply@example.com]: ', 
      config.email.from.email || 'noreply@example.com');
  }
  
  // Module configuration
  config.modules = config.modules || {
    core: { enabled: true },
    timeTracking: { enabled: true },
    leaveManagement: { enabled: true },
    notifications: { enabled: true },
  };
  
  // Save config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log('✅ Setup completed successfully!');
  console.log('🚀 You can now start the server by running: npm start');
  
  rl.close();
}

function question(prompt, defaultValue) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer || defaultValue);
    });
  });
}

setup().catch(error => {
  console.error('Error during setup:', error);
  rl.close();
});
`;

  fs.writeFileSync(path.join(DEPLOY_DIR, 'setup.js'), setupScript);
}

/**
 * Create Docker files
 */
function createDockerFiles() {
  // Create Dockerfile
  const dockerfile = `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
`;

  fs.writeFileSync(path.join(DEPLOY_DIR, 'Dockerfile'), dockerfile);

  // Create docker-compose.yml
  const dockerCompose = `version: '3'

services:
  app:
    build: .
    container_name: time-management-app
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
      - ./config.json:/app/config.json
    environment:
      - NODE_ENV=production

  # Uncomment to use PostgreSQL instead of SQLite
  # db:
  #   image: postgres:14-alpine
  #   container_name: time-management-db
  #   restart: unless-stopped
  #   environment:
  #     POSTGRES_USER: postgres
  #     POSTGRES_PASSWORD: postgres
  #     POSTGRES_DB: timemanagement
  #     PGDATA: /var/lib/postgresql/data/pgdata
  #   volumes:
  #     - postgres-data:/var/lib/postgresql/data
  #   ports:
  #     - "5432:5432"

# Uncomment to use PostgreSQL
# volumes:
#   postgres-data:
`;

  fs.writeFileSync(path.join(DEPLOY_DIR, 'docker-compose.yml'), dockerCompose);

  // Create .dockerignore
  const dockerignore = `node_modules
npm-debug.log
data
`;

  fs.writeFileSync(path.join(DEPLOY_DIR, '.dockerignore'), dockerignore);
}

/**
 * Copy documentation
 */
function copyDocumentation() {
  if (fs.existsSync('server-deploy/docs')) {
    copyDirectory('server-deploy/docs', path.join(DEPLOY_DIR, 'docs'));
  } else {
    ensureDirectoryExists(path.join(DEPLOY_DIR, 'docs'));
  }

  // Create deployment documentation
  const deployMd = `# Schwarzenberg Tech Time Management System - Deployment Guide

This guide provides instructions for deploying the Schwarzenberg Tech Time Management System to various cloud environments.

## Prerequisites

- Node.js 18 or later
- npm 8 or later
- (Optional) Docker and Docker Compose for containerized deployment

## Standard Deployment

1. Extract the deployment package to your server.
2. Navigate to the extracted directory.
3. Run the setup script:
   \`\`\`bash
   node setup.js
   \`\`\`
4. Follow the prompts to configure the application.
5. Start the application:
   \`\`\`bash
   npm start
   \`\`\`

## Docker Deployment

1. Extract the deployment package to your server.
2. Navigate to the extracted directory.
3. (Optional) Edit the \`config.json\` file to configure the application.
4. Build and start the Docker containers:
   \`\`\`bash
   docker-compose up -d
   \`\`\`

## AWS Deployment

### Using EC2

1. Launch an EC2 instance with Amazon Linux 2 or Ubuntu.
2. Connect to the instance using SSH.
3. Install Node.js:
   \`\`\`bash
   # For Amazon Linux 2
   curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs

   # For Ubuntu
   curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   \`\`\`
4. Upload the deployment package to the instance.
5. Extract the package and follow the Standard Deployment steps above.

### Using Elastic Beanstalk

1. Create a new Elastic Beanstalk application.
2. Choose the Node.js platform.
3. Upload the deployment package as a ZIP file.
4. Configure environment variables in the Elastic Beanstalk console.

## Google Cloud Deployment

### Using Compute Engine

1. Create a new VM instance.
2. Connect to the instance using SSH.
3. Install Node.js:
   \`\`\`bash
   curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   \`\`\`
4. Upload the deployment package to the instance.
5. Extract the package and follow the Standard Deployment steps above.

### Using App Engine

1. Ensure you have the Google Cloud SDK installed.
2. Create a new \`app.yaml\` file in the deployment directory:
   \`\`\`yaml
   runtime: nodejs18
   instance_class: F2
   \`\`\`
3. Deploy the application:
   \`\`\`bash
   gcloud app deploy
   \`\`\`

## Configuration

The application can be configured by editing the \`config.json\` file. The following options are available:

### Server Configuration

- \`port\`: The port on which the application will listen.
- \`host\`: The host address to bind to.
- \`sessionSecret\`: A secret string used to sign session cookies.
- \`dataDir\`: The directory where application data will be stored.

### Database Configuration

- \`type\`: The database type (\`sqlite\` or \`postgres\`).
- \`file\`: The path to the SQLite database file (for SQLite only).
- \`host\`: The PostgreSQL host address (for PostgreSQL only).
- \`port\`: The PostgreSQL port (for PostgreSQL only).
- \`user\`: The PostgreSQL username (for PostgreSQL only).
- \`password\`: The PostgreSQL password (for PostgreSQL only).
- \`database\`: The PostgreSQL database name (for PostgreSQL only).

### Email Configuration

- \`enabled\`: Whether email notifications are enabled.
- \`provider\`: The email provider (\`smtp\` or \`sendmail\`).
- \`host\`: The SMTP host address (for SMTP only).
- \`port\`: The SMTP port (for SMTP only).
- \`secure\`: Whether to use a secure connection (for SMTP only).
- \`auth.user\`: The SMTP username (for SMTP only).
- \`auth.pass\`: The SMTP password (for SMTP only).
- \`from.name\`: The sender name.
- \`from.email\`: The sender email address.

## Troubleshooting

### Application won't start

- Check that Node.js is installed and is version 18 or later.
- Check that the port specified in the configuration is available.
- Check the logs for errors:
  \`\`\`bash
  npm start > app.log 2>&1
  \`\`\`

### Database connection issues

- For SQLite, check that the data directory is writable.
- For PostgreSQL, check that the database is running and accessible.
- Check that the database credentials are correct.

### Email notifications aren't being sent

- Check that email notifications are enabled in the configuration.
- Check that the SMTP settings are correct.
- Check that the SMTP server is accessible from the application server.

## Support

For support, please contact Schwarzenberg Tech at support@example.com.
`;

  fs.writeFileSync(path.join(DEPLOY_DIR, 'DEPLOY.md'), deployMd);
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

// Execute deployment
deploy().catch(error => {
  console.error('Deployment failed:', error);
  process.exit(1);
});

// Export the deployment function
export { deploy };