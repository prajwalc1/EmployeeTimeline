/**
 * Schwarzenberg Tech Time Management System
 * Server Entry Point - Odoo-style Server
 * 
 * This script allows the application to be easily run on any server.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Schwarzenberg Tech - Time Management System                 ║
║   Version 1.0.0                                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`;

// Configuration
const DEFAULT_PORT = 5000;
const DEFAULT_HOST = '0.0.0.0';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  port: process.env.PORT || DEFAULT_PORT,
  host: process.env.HOST || DEFAULT_HOST,
  config: process.env.CONFIG_PATH || './config.yaml',
  modulePath: process.env.MODULE_PATH || './modules',
  logLevel: process.env.LOG_LEVEL || 'info',
  help: false,
  setup: false,
  modules: [],
  adminPassword: process.env.ADMIN_PASSWORD || null
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--help' || arg === '-h') {
    options.help = true;
  } else if (arg === '--port' || arg === '-p') {
    options.port = args[++i] || DEFAULT_PORT;
  } else if (arg === '--host') {
    options.host = args[++i] || DEFAULT_HOST;
  } else if (arg === '--config' || arg === '-c') {
    options.config = args[++i] || './config.yaml';
  } else if (arg === '--module-path') {
    options.modulePath = args[++i] || './modules';
  } else if (arg === '--log-level' || arg === '-l') {
    options.logLevel = args[++i] || 'info';
  } else if (arg === '--setup' || arg === '-s') {
    options.setup = true;
  } else if (arg === '--admin-password') {
    options.adminPassword = args[++i] || null;
  } else if (arg === '--install-module') {
    options.modules.push({
      action: 'install',
      name: args[++i]
    });
  } else if (arg === '--uninstall-module') {
    options.modules.push({
      action: 'uninstall',
      name: args[++i]
    });
  }
}

// Show help
if (options.help) {
  console.log(banner);
  console.log('Usage: node run-server.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h              Show this help message');
  console.log('  --port, -p <port>       Port to listen on (default: 5000)');
  console.log('  --host <host>           Host to listen on (default: 0.0.0.0)');
  console.log('  --config, -c <path>     Path to config file (default: ./config.yaml)');
  console.log('  --module-path <path>    Path to modules directory (default: ./modules)');
  console.log('  --log-level, -l <level> Log level (default: info)');
  console.log('  --setup, -s             Run setup wizard');
  console.log('  --admin-password <pass> Set admin password');
  console.log('  --install-module <name> Install a module');
  console.log('  --uninstall-module <name> Uninstall a module');
  console.log('');
  console.log('Examples:');
  console.log('  node run-server.js');
  console.log('  node run-server.js --port 8080');
  console.log('  node run-server.js --setup');
  console.log('  node run-server.js --install-module reporting');
  process.exit(0);
}

// Check if configuration exists
if (!fs.existsSync(options.config) && !options.setup) {
  console.log(banner);
  console.log('Configuration file not found: ' + options.config);
  console.log('Would you like to run the setup wizard? (Y/n)');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Run setup wizard? (Y/n) ', (answer) => {
    rl.close();
    if (answer.toLowerCase() === 'n') {
      console.log('Exiting...');
      process.exit(0);
    } else {
      options.setup = true;
      runServer();
    }
  });
} else {
  runServer();
}

// Run the server
function runServer() {
  console.log(banner);
  
  // Set environment variables
  process.env.PORT = options.port;
  process.env.HOST = options.host;
  process.env.CONFIG_PATH = options.config;
  process.env.MODULE_PATH = options.modulePath;
  process.env.LOG_LEVEL = options.logLevel;
  
  if (options.adminPassword) {
    process.env.ADMIN_PASSWORD = options.adminPassword;
  }
  
  // Run setup if requested
  if (options.setup) {
    console.log('Running setup wizard...');
    
    try {
      // Check if setup.js exists
      if (fs.existsSync('./setup.js')) {
        const setup = spawn('node', ['setup.js'], { stdio: 'inherit' });
        
        setup.on('close', (code) => {
          if (code === 0) {
            console.log('Setup completed successfully!');
            startServer();
          } else {
            console.error('Setup failed with code ' + code);
            process.exit(1);
          }
        });
      } else {
        console.log('Setup script not found. Creating default configuration...');
        createDefaultConfig();
        startServer();
      }
    } catch (error) {
      console.error('Error running setup:', error);
      process.exit(1);
    }
  } else {
    startServer();
  }
}

// Start the server
function startServer() {
  try {
    // Handle module installation/uninstallation if requested
    if (options.modules.length > 0) {
      console.log('Processing module operations...');
      
      // This would be handled by the modular-server.js
      // For now, just log and continue
      options.modules.forEach((module) => {
        console.log(`${module.action === 'install' ? 'Installing' : 'Uninstalling'} module: ${module.name}`);
      });
    }
    
    console.log(`Starting server on ${options.host}:${options.port}...`);
    
    // Use modular-server.js if it exists, otherwise use the default server
    const serverScript = fs.existsSync('./modular-server.js') ? 
      './modular-server.js' : 
      './server/index.ts';
    
    const server = spawn('node', [serverScript], { stdio: 'inherit' });
    
    server.on('close', (code) => {
      console.log(`Server exited with code ${code}`);
      process.exit(code);
    });
    
    // Handle signals
    process.on('SIGINT', () => {
      console.log('Received SIGINT. Shutting down gracefully...');
      server.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Shutting down gracefully...');
      server.kill('SIGTERM');
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Create default configuration
function createDefaultConfig() {
  const yaml = require('yaml');
  
  const defaultConfig = {
    server: {
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
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
      sessionSecret: require('crypto').randomBytes(32).toString('hex'),
      jwtSecret: require('crypto').randomBytes(32).toString('hex'),
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
      level: options.logLevel,
      console: true,
      file: {
        enabled: true,
        path: './logs',
        maxSize: '10m',
        maxFiles: 5,
      },
    },
  };
  
  // Ensure required directories exist
  ['./data', './logs', './backups'].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Write config file
  fs.writeFileSync(options.config, yaml.stringify(defaultConfig));
  console.log(`Created default configuration at ${options.config}`);
  
  // Create .env file if it doesn't exist
  if (!fs.existsSync('./.env')) {
    const envContent = `# Server Configuration
NODE_ENV=production
PORT=${options.port}
HOST=${options.host}
SESSION_SECRET=${defaultConfig.security.sessionSecret}

# Database Configuration
DB_TYPE=${defaultConfig.database.type}

# Security
JWT_SECRET=${defaultConfig.security.jwtSecret}

# Logging
LOG_LEVEL=${options.logLevel}
`;
    
    fs.writeFileSync('./.env', envContent);
    console.log('Created .env file');
  }
}