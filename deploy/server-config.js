/**
 * Schwarzenberg Tech Employee Time Management System
 * Server Configuration Module - Inspired by Odoo's architecture
 * 
 * This script handles server configuration, module loading, and admin functionality
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('yaml');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Default configuration
const DEFAULT_CONFIG = {
  // Server settings
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5000,
    workers: Math.max(1, os.cpus().length - 1),
    compression: true,
    cors: {
      enabled: true,
      origins: ['*'],
    },
    maxUploadSize: '50mb',
  },
  
  // Database settings
  database: {
    type: process.env.DB_TYPE || 'sqlite', // 'sqlite' or 'postgres'
    sqlite: {
      path: process.env.SQLITE_PATH || './data/database.sqlite',
      journalMode: 'WAL',
    },
    postgres: {
      url: process.env.DATABASE_URL || '',
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
  
  // Security settings
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    jwtExpiration: '24h',
    passwordHashRounds: 10,
    csrfProtection: true,
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // limit each IP to 100 requests per windowMs
    },
  },
  
  // Email settings
  email: {
    enabled: false,
    provider: 'smtp', // 'smtp', 'sendgrid', etc.
    smtp: {
      host: '',
      port: 587,
      secure: false,
      auth: {
        user: '',
        pass: '',
      },
    },
    from: 'no-reply@example.com',
  },
  
  // Modules configuration
  modules: {
    core: {
      enabled: true,
    },
    timeTracking: {
      enabled: true,
      clockInReminders: false,
      overtimeTracking: true,
    },
    leaveManagement: {
      enabled: true,
      approvalWorkflow: true,
      requireSubstitute: false,
    },
    reporting: {
      enabled: true,
      exportFormats: ['pdf', 'xlsx', 'csv'],
    },
    admin: {
      enabled: true,
      backupScheduling: true,
    },
  },
  
  // Localization
  localization: {
    defaultLanguage: 'de',
    timezone: 'Europe/Berlin',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: 'HH:mm',
    firstDayOfWeek: 1, // Monday
  },
  
  // Logging
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    console: true,
    file: {
      enabled: true,
      path: './logs',
      maxSize: '10m',
      maxFiles: 5,
    },
  },
  
  // Multi-tenant settings
  multiTenant: {
    enabled: false,
    separateDatabases: true,
  },
};

/**
 * Configuration Manager
 */
class ConfigManager {
  constructor() {
    this.config = DEFAULT_CONFIG;
    this.configPath = process.env.CONFIG_PATH || './config.yaml';
    this.loaded = false;
  }
  
  /**
   * Load configuration from config file
   */
  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configFile = fs.readFileSync(this.configPath, 'utf8');
        const fileConfig = yaml.parse(configFile);
        
        // Deep merge the file config into the default config
        this.config = this.deepMerge(this.config, fileConfig);
        console.log(`Configuration loaded from ${this.configPath}`);
      } else {
        console.log('No configuration file found, using default settings');
        // Create default config file for future use
        this.save();
      }
      
      // Override with environment variables
      this.applyEnvironmentVariables();
      
      this.loaded = true;
      return this.config;
    } catch (error) {
      console.error(`Error loading configuration: ${error.message}`);
      return this.config;
    }
  }
  
  /**
   * Save current configuration to file
   */
  save() {
    try {
      const dirPath = path.dirname(this.configPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      const configYaml = yaml.stringify(this.config);
      fs.writeFileSync(this.configPath, configYaml, 'utf8');
      console.log(`Configuration saved to ${this.configPath}`);
      return true;
    } catch (error) {
      console.error(`Error saving configuration: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get configuration value by path
   * @param {string} path - Dot notation path to config value
   * @param {*} defaultValue - Default value if path not found
   */
  get(path, defaultValue = undefined) {
    if (!this.loaded) {
      this.load();
    }
    
    const parts = path.split('.');
    let current = this.config;
    
    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[part];
    }
    
    return current !== undefined ? current : defaultValue;
  }
  
  /**
   * Set configuration value by path
   * @param {string} path - Dot notation path to config value
   * @param {*} value - Value to set
   */
  set(path, value) {
    if (!this.loaded) {
      this.load();
    }
    
    const parts = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
    return this.save();
  }
  
  /**
   * Deep merge two objects
   * @param {object} target - Target object
   * @param {object} source - Source object
   */
  deepMerge(target, source) {
    if (typeof source !== 'object' || source === null) {
      return source;
    }
    
    if (typeof target !== 'object' || target === null) {
      return this.deepMerge({}, source);
    }
    
    const output = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object') {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = this.deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
    
    return output;
  }
  
  /**
   * Apply environment variables overrides
   */
  applyEnvironmentVariables() {
    // Database configuration
    if (process.env.DB_TYPE) {
      this.config.database.type = process.env.DB_TYPE;
    }
    
    if (process.env.DATABASE_URL) {
      this.config.database.postgres.url = process.env.DATABASE_URL;
    }
    
    if (process.env.SQLITE_PATH) {
      this.config.database.sqlite.path = process.env.SQLITE_PATH;
    }
    
    // Server configuration
    if (process.env.PORT) {
      this.config.server.port = parseInt(process.env.PORT, 10);
    }
    
    if (process.env.HOST) {
      this.config.server.host = process.env.HOST;
    }
    
    // Security configuration
    if (process.env.SESSION_SECRET) {
      this.config.security.sessionSecret = process.env.SESSION_SECRET;
    }
    
    if (process.env.JWT_SECRET) {
      this.config.security.jwtSecret = process.env.JWT_SECRET;
    }
    
    // Logging configuration
    if (process.env.LOG_LEVEL) {
      this.config.logging.level = process.env.LOG_LEVEL;
    }
    
    // Localization configuration
    if (process.env.DEFAULT_LANGUAGE) {
      this.config.localization.defaultLanguage = process.env.DEFAULT_LANGUAGE;
    }
    
    if (process.env.TIMEZONE) {
      this.config.localization.timezone = process.env.TIMEZONE;
    }
    
    // Multi-tenant configuration
    if (process.env.MULTI_TENANT === 'true') {
      this.config.multiTenant.enabled = true;
    } else if (process.env.MULTI_TENANT === 'false') {
      this.config.multiTenant.enabled = false;
    }
  }
}

// Export singleton instance
const configManager = new ConfigManager();
module.exports = configManager;