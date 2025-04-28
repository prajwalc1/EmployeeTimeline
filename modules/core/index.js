/**
 * Core Module for Schwarzenberg Tech Time Management
 * 
 * This module provides the core functionality for the application.
 */

const path = require('path');
const fs = require('fs');
const configManager = require('../../server-config');

class CoreModule {
  constructor() {
    this.name = 'core';
    this.version = '1.0.0';
    this.configPath = path.join(__dirname, 'config');
    this.dataPath = path.join(__dirname, 'data');
    this.initialized = false;
    
    // Configuration defaults loaded from manifest
    const manifestPath = path.join(__dirname, 'manifest.json');
    this.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    this.defaultSettings = this.manifest.config.defaultSettings;
  }
  
  /**
   * Initialize the core module
   */
  async initialize() {
    console.log('Initializing Core Module...');
    
    // Ensure config directory exists
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(this.configPath, { recursive: true });
    }
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
    
    // Apply default settings if not already set
    Object.entries(this.defaultSettings).forEach(([key, value]) => {
      if (configManager.get(`modules.core.settings.${key}`) === undefined) {
        configManager.set(`modules.core.settings.${key}`, value);
      }
    });
    
    // Register hooks for other modules
    this.hooks = {
      onUserLogin: [],
      onUserLogout: [],
      onDataChange: [],
      onSystemStartup: [],
      onSystemShutdown: []
    };
    
    // Initialize services
    this.services = {
      auth: this.createAuthService(),
      settings: this.createSettingsService(),
      notification: this.createNotificationService(),
      backup: this.createBackupService()
    };
    
    this.initialized = true;
    console.log('Core Module initialized successfully');
    
    // Trigger system startup hooks
    this.triggerHook('onSystemStartup');
    
    return true;
  }
  
  /**
   * Register a hook function
   * @param {string} hookName - Name of the hook
   * @param {Function} callback - Function to call
   * @param {string} moduleName - Name of the registering module
   */
  registerHook(hookName, callback, moduleName) {
    if (!this.hooks[hookName]) {
      this.hooks[hookName] = [];
    }
    
    this.hooks[hookName].push({
      moduleName,
      callback
    });
    
    console.log(`Hook '${hookName}' registered by module '${moduleName}'`);
  }
  
  /**
   * Trigger a hook
   * @param {string} hookName - Name of the hook
   * @param {any} data - Data to pass to the hook callbacks
   */
  triggerHook(hookName, data = null) {
    if (!this.hooks[hookName]) {
      return;
    }
    
    console.log(`Triggering hook: ${hookName}`);
    this.hooks[hookName].forEach(({ callback, moduleName }) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in hook '${hookName}' from module '${moduleName}':`, error);
      }
    });
  }
  
  /**
   * Create authentication service
   */
  createAuthService() {
    return {
      validateUser: async (username, password) => {
        // This would typically check the database
        // For now, we'll return a hardcoded user for the demo
        if (username === 'admin' && password === 'admin') {
          return {
            id: 1,
            username: 'admin',
            name: 'Administrator',
            roles: ['admin'],
            authenticated: true
          };
        }
        return null;
      },
      
      getUserById: async (userId) => {
        // This would typically check the database
        // For now, we'll return a hardcoded user for the demo
        if (userId === 1) {
          return {
            id: 1,
            username: 'admin',
            name: 'Administrator',
            roles: ['admin']
          };
        }
        return null;
      },
      
      checkPermission: (user, permission) => {
        // Simple permission check based on user roles
        if (!user || !user.roles) {
          return false;
        }
        
        // Admin has all permissions
        if (user.roles.includes('admin')) {
          return true;
        }
        
        // Other role-based checks could be done here
        return false;
      }
    };
  }
  
  /**
   * Create settings service
   */
  createSettingsService() {
    return {
      get: (key, defaultValue = undefined) => {
        return configManager.get(`modules.core.settings.${key}`, defaultValue);
      },
      
      set: (key, value) => {
        return configManager.set(`modules.core.settings.${key}`, value);
      },
      
      getSystemSettings: () => {
        return {
          companyName: configManager.get('modules.core.settings.companyName', this.defaultSettings.companyName),
          systemTitle: configManager.get('modules.core.settings.systemTitle', this.defaultSettings.systemTitle),
          language: configManager.get('modules.core.settings.language', this.defaultSettings.language),
          dateFormat: configManager.get('modules.core.settings.dateFormat', this.defaultSettings.dateFormat),
          timeFormat: configManager.get('modules.core.settings.timeFormat', this.defaultSettings.timeFormat),
          timezone: configManager.get('modules.core.settings.timezone', this.defaultSettings.timezone)
        };
      }
    };
  }
  
  /**
   * Create notification service
   */
  createNotificationService() {
    return {
      subscribedUsers: new Map(),
      
      subscribe: (userId, notificationType) => {
        if (!this.services.notification.subscribedUsers.has(userId)) {
          this.services.notification.subscribedUsers.set(userId, new Set());
        }
        this.services.notification.subscribedUsers.get(userId).add(notificationType);
      },
      
      unsubscribe: (userId, notificationType) => {
        if (this.services.notification.subscribedUsers.has(userId)) {
          this.services.notification.subscribedUsers.get(userId).delete(notificationType);
        }
      },
      
      notifyUser: (userId, message, type = 'info') => {
        console.log(`Notification to user ${userId}: [${type}] ${message}`);
        // This would typically use WebSockets or similar to push notifications to the client
      },
      
      notifyAll: (message, type = 'info') => {
        console.log(`Broadcasting notification: [${type}] ${message}`);
        // This would typically use WebSockets or similar to push notifications to all clients
      }
    };
  }
  
  /**
   * Create backup service
   */
  createBackupService() {
    return {
      backupDatabase: async () => {
        // This would typically create a database backup
        console.log('Creating database backup...');
        // Implementation would depend on the database type
        return {
          timestamp: new Date().toISOString(),
          success: true,
          filename: `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`
        };
      },
      
      getBackups: () => {
        // This would typically list available backups
        return [];
      },
      
      restoreBackup: async (backupId) => {
        // This would typically restore a database backup
        console.log(`Restoring backup: ${backupId}`);
        return false;
      }
    };
  }
  
  /**
   * Get a service
   * @param {string} serviceName - Name of the service
   */
  getService(serviceName) {
    if (!this.initialized) {
      throw new Error('Core module is not initialized');
    }
    
    if (!this.services[serviceName]) {
      throw new Error(`Service '${serviceName}' does not exist`);
    }
    
    return this.services[serviceName];
  }
  
  /**
   * Register a service
   * @param {string} serviceName - Name of the service
   * @param {object} service - Service object
   */
  registerService(serviceName, service) {
    if (!this.initialized) {
      throw new Error('Core module is not initialized');
    }
    
    if (this.services[serviceName]) {
      throw new Error(`Service '${serviceName}' already exists`);
    }
    
    this.services[serviceName] = service;
    return true;
  }
}

module.exports = CoreModule;