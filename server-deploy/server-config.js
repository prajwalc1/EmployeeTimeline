/**
 * Schwarzenberg Tech Employee Time Management System
 * Server Configuration Module - Inspired by Odoo's architecture
 * 
 * This script handles server configuration, module loading, and admin functionality
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Configuration Manager
 */
class ConfigManager {
  constructor() {
    this.config = {};
    this.configPath = process.env.CONFIG_PATH || './config.yaml';
    this.loaded = false;
  }
  
  /**
   * Load configuration from config file
   */
  load() {
    try {
      const configPath = path.resolve(this.configPath);
      
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        this.config = yaml.parse(configContent);
        this.loaded = true;
        console.log(`Configuration loaded from ${configPath}`);
      } else {
        console.log(`Configuration file not found: ${configPath}`);
        this.loaded = false;
        
        // Create default configuration
        this.config = this.createDefaultConfig();
        this.save();
      }
      
      // Apply environment variable overrides
      this.applyEnvironmentVariables();
      
      return this.config;
    } catch (error) {
      console.error('Error loading configuration:', error);
      this.config = this.createDefaultConfig();
      this.loaded = false;
      return this.config;
    }
  }
  
  /**
   * Save current configuration to file
   */
  save() {
    try {
      const configPath = path.resolve(this.configPath);
      const configDir = path.dirname(configPath);
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, yaml.stringify(this.config));
      this.loaded = true;
      console.log(`Configuration saved to ${configPath}`);
      
      return true;
    } catch (error) {
      console.error('Error saving configuration:', error);
      return false;
    }
  }
  
  /**
   * Get configuration value by path
   * @param {string} path - Dot notation path to config value
   * @param {*} defaultValue - Default value if path not found
   */
  get(path, defaultValue = undefined) {
    try {
      const parts = path.split('.');
      let current = this.config;
      
      for (const part of parts) {
        if (current[part] === undefined) {
          return defaultValue;
        }
        
        current = current[part];
      }
      
      return current;
    } catch (error) {
      return defaultValue;
    }
  }
  
  /**
   * Set configuration value by path
   * @param {string} path - Dot notation path to config value
   * @param {*} value - Value to set
   */
  set(path, value) {
    try {
      const parts = path.split('.');
      let current = this.config;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        
        if (current[part] === undefined) {
          current[part] = {};
        }
        
        current = current[part];
      }
      
      current[parts[parts.length - 1]] = value;
      
      return true;
    } catch (error) {
      console.error('Error setting configuration value:', error);
      return false;
    }
  }
  
  /**
   * Deep merge two objects
   * @param {object} target - Target object
   * @param {object} source - Source object
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }
        
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    
    return target;
  }
  
  /**
   * Apply environment variables overrides
   */
  applyEnvironmentVariables() {
    // Server config
    if (process.env.PORT) {
      this.set('server.port', parseInt(process.env.PORT));
    }
    
    if (process.env.HOST) {
      this.set('server.host', process.env.HOST);
    }
    
    // Database config
    if (process.env.DB_TYPE) {
      this.set('database.type', process.env.DB_TYPE);
    }
    
    if (process.env.DATABASE_URL) {
      this.set('database.postgres.url', process.env.DATABASE_URL);
    }
    
    if (process.env.SQLITE_PATH) {
      this.set('database.sqlite.path', process.env.SQLITE_PATH);
    }
    
    // Security config
    if (process.env.SESSION_SECRET) {
      this.set('security.sessionSecret', process.env.SESSION_SECRET);
    }
    
    if (process.env.JWT_SECRET) {
      this.set('security.jwtSecret', process.env.JWT_SECRET);
    }
    
    // Module settings
    if (process.env.COMPANY_NAME) {
      this.set('modules.core.settings.companyName', process.env.COMPANY_NAME);
    }
    
    if (process.env.SYSTEM_TITLE) {
      this.set('modules.core.settings.systemTitle', process.env.SYSTEM_TITLE);
    }
    
    if (process.env.DEFAULT_LANGUAGE) {
      this.set('modules.core.settings.language', process.env.DEFAULT_LANGUAGE);
    }
    
    if (process.env.TIMEZONE) {
      this.set('modules.core.settings.timezone', process.env.TIMEZONE);
    }
    
    // Module enablement
    if (process.env.ENABLE_TIME_TRACKING) {
      this.set('modules.timeTracking.enabled', process.env.ENABLE_TIME_TRACKING === 'true');
    }
    
    if (process.env.ENABLE_LEAVE_MANAGEMENT) {
      this.set('modules.leaveManagement.enabled', process.env.ENABLE_LEAVE_MANAGEMENT === 'true');
    }
    
    if (process.env.ENABLE_REPORTING) {
      this.set('modules.reporting.enabled', process.env.ENABLE_REPORTING === 'true');
    }
    
    if (process.env.ENABLE_ADMIN) {
      this.set('modules.admin.enabled', process.env.ENABLE_ADMIN === 'true');
    }
    
    // Logging
    if (process.env.LOG_LEVEL) {
      this.set('logging.level', process.env.LOG_LEVEL);
    }
  }
  
  /**
   * Create default configuration
   */
  createDefaultConfig() {
    return {
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
  }
}

// Create a singleton instance
const configManager = new ConfigManager();

// Load configuration
configManager.load();

module.exports = configManager;