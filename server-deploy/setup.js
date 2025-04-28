/**
 * Schwarzenberg Tech Employee Time Management System
 * Setup Script - Initialize the application
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { exec } = require('child_process');
const yaml = require('yaml');

// Banner
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Schwarzenberg Tech - Time Management System                 ║
║   Setup Wizard                                                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

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
  const defaultText = defaultAnswer ? ` (${defaultAnswer})` : '';
  
  return new Promise(resolve => {
    rl.question(`${question}${defaultText}: `, answer => {
      resolve(answer || defaultAnswer);
    });
  });
}

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Check if command exists
 * @param {string} command - Command to check
 * @returns {Promise<boolean>} Whether the command exists
 */
function commandExists(command) {
  return new Promise(resolve => {
    exec(`which ${command}`, (error) => {
      resolve(!error);
    });
  });
}

/**
 * Run setup
 */
async function setup() {
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
    console.log('\n----- Company Information -----');
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
    
    config.modules.core.settings.language = await ask(
      'Default language',
      config.modules.core.settings.language || 'de'
    );
    
    config.modules.core.settings.timezone = await ask(
      'Timezone',
      config.modules.core.settings.timezone || 'Europe/Berlin'
    );
    
    // Server configuration
    console.log('\n----- Server Configuration -----');
    config.server = config.server || {};
    
    config.server.port = parseInt(await ask(
      'Server port',
      config.server.port || '5000'
    ));
    
    config.server.host = await ask(
      'Server host',
      config.server.host || '0.0.0.0'
    );
    
    // Database configuration
    console.log('\n----- Database Configuration -----');
    config.database = config.database || {};
    
    const dbType = await ask(
      'Database type (sqlite/postgres)',
      config.database.type || 'sqlite'
    );
    
    config.database.type = dbType.toLowerCase();
    
    if (dbType.toLowerCase() === 'postgres') {
      config.database.postgres = config.database.postgres || {};
      
      const useDockerDb = await ask(
        'Are you using Docker for PostgreSQL? (yes/no)',
        'no'
      );
      
      if (useDockerDb.toLowerCase() === 'yes') {
        config.database.postgres.url = await ask(
          'PostgreSQL connection URL',
          config.database.postgres.url || 'postgresql://postgres:postgres@db:5432/timemanagement'
        );
      } else {
        const dbHost = await ask('PostgreSQL host', 'localhost');
        const dbPort = await ask('PostgreSQL port', '5432');
        const dbName = await ask('PostgreSQL database name', 'timemanagement');
        const dbUser = await ask('PostgreSQL username', 'postgres');
        const dbPassword = await ask('PostgreSQL password', 'postgres');
        
        config.database.postgres.url = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
      }
      
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
        console.log(`Created directory: ${dbDir}`);
      }
    }
    
    // Security settings
    console.log('\n----- Security Configuration -----');
    config.security = config.security || {};
    
    config.security.sessionSecret = await ask(
      'Session secret (leave empty to generate)',
      config.security.sessionSecret || ''
    );
    
    if (!config.security.sessionSecret) {
      config.security.sessionSecret = generateRandomString();
      console.log(`Generated new session secret: ${config.security.sessionSecret.slice(0, 8)}...`);
    }
    
    config.security.jwtSecret = await ask(
      'JWT secret (leave empty to generate)',
      config.security.jwtSecret || ''
    );
    
    if (!config.security.jwtSecret) {
      config.security.jwtSecret = generateRandomString();
      console.log(`Generated new JWT secret: ${config.security.jwtSecret.slice(0, 8)}...`);
    }
    
    // Module settings
    console.log('\n----- Module Configuration -----');
    
    // Time Tracking module
    config.modules.timeTracking = config.modules.timeTracking || { enabled: true, settings: {} };
    config.modules.timeTracking.settings = config.modules.timeTracking.settings || {};
    
    const enableTimeTracking = await ask(
      'Enable Time Tracking module (yes/no)',
      config.modules.timeTracking.enabled ? 'yes' : 'no'
    );
    
    config.modules.timeTracking.enabled = enableTimeTracking.toLowerCase() === 'yes';
    
    if (config.modules.timeTracking.enabled) {
      config.modules.timeTracking.settings.workingHoursPerDay = parseInt(await ask(
        'Working hours per day',
        config.modules.timeTracking.settings.workingHoursPerDay || '8'
      ));
      
      config.modules.timeTracking.settings.breakDurationMinutes = parseInt(await ask(
        'Default break duration (minutes)',
        config.modules.timeTracking.settings.breakDurationMinutes || '30'
      ));
    }
    
    // Leave Management module
    config.modules.leaveManagement = config.modules.leaveManagement || { enabled: true };
    
    const enableLeaveManagement = await ask(
      'Enable Leave Management module (yes/no)',
      config.modules.leaveManagement.enabled ? 'yes' : 'no'
    );
    
    config.modules.leaveManagement.enabled = enableLeaveManagement.toLowerCase() === 'yes';
    
    // Reporting module
    config.modules.reporting = config.modules.reporting || { enabled: true };
    
    const enableReporting = await ask(
      'Enable Reporting module (yes/no)',
      config.modules.reporting.enabled ? 'yes' : 'no'
    );
    
    config.modules.reporting.enabled = enableReporting.toLowerCase() === 'yes';
    
    // Admin module
    config.modules.admin = config.modules.admin || { enabled: true };
    
    const enableAdmin = await ask(
      'Enable Admin module (yes/no)',
      config.modules.admin.enabled ? 'yes' : 'no'
    );
    
    config.modules.admin.enabled = enableAdmin.toLowerCase() === 'yes';
    
    // Logging settings
    console.log('\n----- Logging Configuration -----');
    config.logging = config.logging || {};
    
    config.logging.level = await ask(
      'Log level (debug/info/warn/error)',
      config.logging.level || 'info'
    );
    
    // Save configuration
    fs.writeFileSync(configPath, yaml.stringify(config));
    console.log(`\nConfiguration saved to ${configPath}`);
    
    // Create .env file
    const envPath = path.resolve('.env');
    const envContent = `# Server Configuration
NODE_ENV=production
PORT=${config.server.port}
HOST=${config.server.host}
SESSION_SECRET=${config.security.sessionSecret}

# Database Configuration
DB_TYPE=${config.database.type}
${config.database.type === 'postgres' ? `DATABASE_URL=${config.database.postgres.url}` : ''}
${config.database.type === 'sqlite' ? `SQLITE_PATH=${config.database.sqlite.path}` : ''}

# Security
JWT_SECRET=${config.security.jwtSecret}

# Application Settings
COMPANY_NAME=${config.modules.core.settings.companyName}
SYSTEM_TITLE=${config.modules.core.settings.systemTitle}
DEFAULT_LANGUAGE=${config.modules.core.settings.language}
TIMEZONE=${config.modules.core.settings.timezone}

# Module Settings
ENABLE_TIME_TRACKING=${config.modules.timeTracking.enabled}
ENABLE_LEAVE_MANAGEMENT=${config.modules.leaveManagement.enabled}
ENABLE_REPORTING=${config.modules.reporting.enabled}
ENABLE_ADMIN=${config.modules.admin.enabled}

# Logging
LOG_LEVEL=${config.logging.level}
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log(`Environment variables saved to ${envPath}`);
    
    // Create directories
    const directories = [
      'data',
      'logs',
      'backups',
      'config'
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });
    
    // Check for Docker
    const hasDocker = await commandExists('docker');
    const hasDockerCompose = await commandExists('docker-compose');
    
    if (hasDocker && hasDockerCompose) {
      console.log('\nDocker and Docker Compose are installed.');
      
      const useDocker = await ask(
        'Would you like to run the application with Docker? (yes/no)',
        'yes'
      );
      
      if (useDocker.toLowerCase() === 'yes') {
        console.log('\nTo start the application with Docker:');
        console.log('docker-compose up -d');
      } else {
        console.log('\nTo start the application without Docker:');
        console.log('npm start');
      }
    } else {
      console.log('\nTo start the application:');
      console.log('npm start');
    }
    
    console.log('\n===== Setup Complete =====');
    console.log('\nYour Schwarzenberg Tech Time Management System is now configured and ready to run.');
    console.log('Access the application at:');
    console.log(`http://${config.server.host === '0.0.0.0' ? 'localhost' : config.server.host}:${config.server.port}`);
  } catch (error) {
    console.error('Setup failed:', error);
  } finally {
    rl.close();
  }
}

// Start setup
setup();