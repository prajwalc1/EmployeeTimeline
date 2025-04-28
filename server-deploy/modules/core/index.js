/**
 * Core Module for Schwarzenberg Tech Time Management
 * 
 * This is the core module that provides essential functionality.
 */

const path = require('path');
const fs = require('fs');
const configManager = require('../../server-config');

class CoreModule {
  constructor() {
    this.name = 'core';
    this.version = '1.0.0';
    this.hooks = {};
    this.services = {};
    
    // Load default settings from manifest
    const manifestPath = path.join(__dirname, 'manifest.json');
    this.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    this.defaultSettings = this.manifest.config.defaultSettings;
  }
  
  /**
   * Initialize the core module
   */
  async initialize() {
    console.log('Initializing Core Module...');
    
    // Apply default settings if not already set
    Object.entries(this.defaultSettings).forEach(([key, value]) => {
      if (configManager.get(`modules.core.settings.${key}`) === undefined) {
        configManager.set(`modules.core.settings.${key}`, value);
      }
    });
    
    // Initialize services
    this.initializeServices();
    
    console.log('Core Module initialized successfully');
    return true;
  }
  
  /**
   * Initialize services
   */
  initializeServices() {
    // Authentication service
    this.services.auth = {
      validateUser: this.validateUser.bind(this),
      getUserById: this.getUserById.bind(this),
      createUser: this.createUser.bind(this),
      updateUser: this.updateUser.bind(this),
      deleteUser: this.deleteUser.bind(this)
    };
    
    // Settings service
    this.services.settings = {
      getSystemSettings: this.getSystemSettings.bind(this),
      updateSystemSettings: this.updateSystemSettings.bind(this),
      getUserSettings: this.getUserSettings.bind(this),
      updateUserSettings: this.updateUserSettings.bind(this)
    };
    
    // User service
    this.services.user = {
      getUsers: this.getUsers.bind(this),
      getUserById: this.getUserById.bind(this),
      createUser: this.createUser.bind(this),
      updateUser: this.updateUser.bind(this),
      deleteUser: this.deleteUser.bind(this)
    };
    
    // Employee service
    this.services.employee = {
      getEmployees: this.getEmployees.bind(this),
      getEmployeeById: this.getEmployeeById.bind(this),
      createEmployee: this.createEmployee.bind(this),
      updateEmployee: this.updateEmployee.bind(this),
      deleteEmployee: this.deleteEmployee.bind(this)
    };
  }
  
  /**
   * Register a hook callback
   * @param {string} hook - Hook name
   * @param {Function} callback - Callback function
   * @param {string} module - Module name
   */
  registerHook(hook, callback, module) {
    if (!this.hooks[hook]) {
      this.hooks[hook] = [];
    }
    
    this.hooks[hook].push({
      module,
      callback
    });
    
    console.log(`Registered ${hook} hook for module ${module}`);
  }
  
  /**
   * Trigger a hook
   * @param {string} hook - Hook name
   * @param {...any} args - Arguments to pass to callbacks
   */
  triggerHook(hook, ...args) {
    if (!this.hooks[hook]) {
      return;
    }
    
    for (const { module, callback } of this.hooks[hook]) {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in ${hook} hook from ${module}:`, error);
      }
    }
  }
  
  /**
   * Get a service
   * @param {string} serviceName - Service name
   */
  getService(serviceName) {
    return this.services[serviceName];
  }
  
  /**
   * Validate user credentials
   * @param {string} username - Username
   * @param {string} password - Password
   */
  async validateUser(username, password) {
    // In production, this would check the database
    // For sample purposes, check a hardcoded user
    if (username === 'admin' && password === 'admin') {
      return {
        id: 1,
        username: 'admin',
        name: 'Administrator',
        roles: ['admin']
      };
    }
    
    return null;
  }
  
  /**
   * Get user by ID
   * @param {number} id - User ID
   */
  async getUserById(id) {
    // In production, this would query the database
    if (id === 1) {
      return {
        id: 1,
        username: 'admin',
        name: 'Administrator',
        roles: ['admin']
      };
    }
    
    return null;
  }
  
  /**
   * Create a new user
   * @param {object} userData - User data
   */
  async createUser(userData) {
    // In production, this would insert into the database
    console.log('Creating user:', userData);
    return {
      id: Math.floor(Math.random() * 10000),
      ...userData,
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Update a user
   * @param {number} id - User ID
   * @param {object} userData - User data
   */
  async updateUser(id, userData) {
    // In production, this would update the database
    console.log(`Updating user ${id}:`, userData);
    return {
      id,
      ...userData,
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Delete a user
   * @param {number} id - User ID
   */
  async deleteUser(id) {
    // In production, this would delete from the database
    console.log(`Deleting user ${id}`);
    return { success: true, id };
  }
  
  /**
   * Get system settings
   */
  getSystemSettings() {
    const settings = {};
    
    // Get each setting with default fallback
    Object.entries(this.defaultSettings).forEach(([key, defaultValue]) => {
      settings[key] = configManager.get(`modules.core.settings.${key}`, defaultValue);
    });
    
    return settings;
  }
  
  /**
   * Update system settings
   * @param {object} settings - New settings
   */
  updateSystemSettings(settings) {
    Object.entries(settings).forEach(([key, value]) => {
      configManager.set(`modules.core.settings.${key}`, value);
    });
    
    configManager.save();
    return this.getSystemSettings();
  }
  
  /**
   * Get user settings
   * @param {number} userId - User ID
   */
  getUserSettings(userId) {
    // In production, this would get from the database
    return {
      userId,
      theme: 'light',
      language: 'de',
      timeFormat: 'HH:mm'
    };
  }
  
  /**
   * Update user settings
   * @param {number} userId - User ID
   * @param {object} settings - New settings
   */
  updateUserSettings(userId, settings) {
    // In production, this would update the database
    console.log(`Updating settings for user ${userId}:`, settings);
    return {
      userId,
      ...settings,
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Get employees
   * @param {object} filters - Query filters
   */
  async getEmployees(filters = {}) {
    // In production, this would query the database
    return [
      {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        department: 'IT',
        managerId: null,
        substituteId: null,
        annualLeaveBalance: 30
      }
    ];
  }
  
  /**
   * Get employee by ID
   * @param {number} id - Employee ID
   */
  async getEmployeeById(id) {
    // In production, this would query the database
    if (id === 1) {
      return {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        department: 'IT',
        managerId: null,
        substituteId: null,
        annualLeaveBalance: 30
      };
    }
    
    return null;
  }
  
  /**
   * Create a new employee
   * @param {object} employeeData - Employee data
   */
  async createEmployee(employeeData) {
    // In production, this would insert into the database
    console.log('Creating employee:', employeeData);
    return {
      id: Math.floor(Math.random() * 10000),
      ...employeeData,
      createdAt: new Date().toISOString()
    };
  }
  
  /**
   * Update an employee
   * @param {number} id - Employee ID
   * @param {object} employeeData - Employee data
   */
  async updateEmployee(id, employeeData) {
    // In production, this would update the database
    console.log(`Updating employee ${id}:`, employeeData);
    return {
      id,
      ...employeeData,
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Delete an employee
   * @param {number} id - Employee ID
   */
  async deleteEmployee(id) {
    // In production, this would delete from the database
    console.log(`Deleting employee ${id}`);
    return { success: true, id };
  }
}

module.exports = CoreModule;