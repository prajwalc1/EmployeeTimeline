/**
 * Time Tracking Module for Schwarzenberg Tech Time Management
 * 
 * This module provides time tracking functionality.
 */

const path = require('path');
const fs = require('fs');
const { format, differenceInHours, differenceInMinutes, parseISO } = require('date-fns');
const configManager = require('../../server-config');

class TimeTrackingModule {
  constructor() {
    this.name = 'timeTracking';
    this.version = '1.0.0';
    this.coreModule = null;
    
    // Load default settings from manifest
    const manifestPath = path.join(__dirname, 'manifest.json');
    this.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    this.defaultSettings = this.manifest.config.defaultSettings;
  }
  
  /**
   * Initialize the time tracking module
   */
  async initialize() {
    console.log('Initializing Time Tracking Module...');
    
    // Get module manager and core module
    const moduleManager = require('../module-manager');
    this.coreModule = moduleManager.getModule('core');
    
    if (!this.coreModule) {
      throw new Error('Core module is required but not loaded');
    }
    
    // Apply default settings if not already set
    Object.entries(this.defaultSettings).forEach(([key, value]) => {
      if (configManager.get(`modules.timeTracking.settings.${key}`) === undefined) {
        configManager.set(`modules.timeTracking.settings.${key}`, value);
      }
    });
    
    // Register with core hooks
    this.coreModule.registerHook('onSystemStartup', () => {
      console.log('Time Tracking module responding to system startup');
    }, this.name);
    
    // Initialize API handlers
    this.initializeApiHandlers();
    
    console.log('Time Tracking Module initialized successfully');
    return true;
  }
  
  /**
   * Initialize API handlers
   */
  initializeApiHandlers() {
    this.api = {
      createTimeEntry: this.createTimeEntry.bind(this),
      getTimeEntries: this.getTimeEntries.bind(this),
      updateTimeEntry: this.updateTimeEntry.bind(this),
      deleteTimeEntry: this.deleteTimeEntry.bind(this),
      getMonthlyTotal: this.getMonthlyTotal.bind(this),
      exportTimeEntries: this.exportTimeEntries.bind(this)
    };
  }
  
  /**
   * Create a time entry
   * @param {object} entry - Time entry data
   */
  async createTimeEntry(entry) {
    try {
      // Validate entry
      this.validateTimeEntry(entry);
      
      // Apply business rules
      const processedEntry = this.applyBusinessRules(entry);
      
      // In production, this would call the database service
      // For now, we'll just log the entry
      console.log('Creating time entry:', processedEntry);
      
      // Return the created entry with a fake ID
      return {
        ...processedEntry,
        id: Math.floor(Math.random() * 10000),
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating time entry:', error);
      throw error;
    }
  }
  
  /**
   * Validate a time entry
   * @param {object} entry - Time entry data
   */
  validateTimeEntry(entry) {
    if (!entry.employeeId) {
      throw new Error('Employee ID is required');
    }
    
    if (!entry.date) {
      throw new Error('Date is required');
    }
    
    if (!entry.startTime) {
      throw new Error('Start time is required');
    }
    
    if (!entry.endTime) {
      throw new Error('End time is required');
    }
    
    // Ensure start time is before end time
    const startDateTime = new Date(entry.startTime);
    const endDateTime = new Date(entry.endTime);
    
    if (startDateTime >= endDateTime) {
      throw new Error('Start time must be before end time');
    }
    
    return true;
  }
  
  /**
   * Apply business rules to a time entry
   * @param {object} entry - Time entry data
   */
  applyBusinessRules(entry) {
    const processedEntry = { ...entry };
    
    // Get module settings
    const settings = this.getSettings();
    
    // Apply automatic break deduction if enabled
    if (settings.automaticBreakDeduction && !processedEntry.breakDuration) {
      const startDateTime = new Date(entry.startTime);
      const endDateTime = new Date(entry.endTime);
      const durationHours = differenceInHours(endDateTime, startDateTime);
      
      if (durationHours >= settings.minimumBreakThresholdHours) {
        processedEntry.breakDuration = settings.breakDurationMinutes;
      } else {
        processedEntry.breakDuration = 0;
      }
    }
    
    // Apply default project code if not specified
    if (!processedEntry.project) {
      processedEntry.project = settings.defaultProjectCode;
    }
    
    // Apply time rounding if enabled
    if (settings.roundingMinutes > 0) {
      processedEntry.startTime = this.roundTime(
        new Date(processedEntry.startTime),
        settings.roundingMinutes,
        settings.roundingMethod
      ).toISOString();
      
      processedEntry.endTime = this.roundTime(
        new Date(processedEntry.endTime),
        settings.roundingMinutes,
        settings.roundingMethod
      ).toISOString();
    }
    
    return processedEntry;
  }
  
  /**
   * Round a time value according to settings
   * @param {Date} time - Time to round
   * @param {number} roundingMinutes - Minutes to round to
   * @param {string} method - Rounding method: 'nearest', 'up', or 'down'
   */
  roundTime(time, roundingMinutes, method = 'nearest') {
    const minutes = time.getMinutes();
    const roundedMinutes = this.roundMinutes(minutes, roundingMinutes, method);
    
    const result = new Date(time);
    result.setMinutes(roundedMinutes, 0, 0);
    return result;
  }
  
  /**
   * Round minutes according to a method
   * @param {number} minutes - Minutes to round
   * @param {number} roundingMinutes - Minutes to round to
   * @param {string} method - Rounding method: 'nearest', 'up', or 'down'
   */
  roundMinutes(minutes, roundingMinutes, method) {
    if (method === 'up') {
      return Math.ceil(minutes / roundingMinutes) * roundingMinutes;
    } else if (method === 'down') {
      return Math.floor(minutes / roundingMinutes) * roundingMinutes;
    } else { // 'nearest'
      return Math.round(minutes / roundingMinutes) * roundingMinutes;
    }
  }
  
  /**
   * Get time entries
   * @param {object} filters - Query filters
   */
  async getTimeEntries(filters = {}) {
    try {
      // In production, this would query the database
      // For now, we'll just return sample data
      return [
        {
          id: 1,
          employeeId: 1,
          date: '2023-01-01',
          startTime: '2023-01-01T09:00:00.000Z',
          endTime: '2023-01-01T17:00:00.000Z',
          breakDuration: 30,
          project: 'INTERNAL',
          notes: 'Sample entry'
        }
      ];
    } catch (error) {
      console.error('Error getting time entries:', error);
      throw error;
    }
  }
  
  /**
   * Update a time entry
   * @param {number} id - Entry ID
   * @param {object} updates - Fields to update
   */
  async updateTimeEntry(id, updates) {
    try {
      // In production, this would update the database
      console.log(`Updating time entry ${id} with:`, updates);
      return { id, ...updates, updatedAt: new Date().toISOString() };
    } catch (error) {
      console.error(`Error updating time entry ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a time entry
   * @param {number} id - Entry ID
   */
  async deleteTimeEntry(id) {
    try {
      // In production, this would delete from the database
      console.log(`Deleting time entry ${id}`);
      return { success: true, id };
    } catch (error) {
      console.error(`Error deleting time entry ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get monthly total hours
   * @param {number} employeeId - Employee ID
   * @param {string} yearMonth - Year and month in YYYY-MM format
   */
  async getMonthlyTotal(employeeId, yearMonth) {
    try {
      // In production, this would query the database
      // For sample purposes, just return a total
      console.log(`Getting monthly total for employee ${employeeId} in ${yearMonth}`);
      return {
        employeeId,
        yearMonth,
        totalHours: 168, // Example: 21 days * 8 hours
        overtimeHours: 8
      };
    } catch (error) {
      console.error(`Error getting monthly total for employee ${employeeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Export time entries
   * @param {object} filters - Export filters
   * @param {string} format - Export format (csv, xlsx, pdf)
   */
  async exportTimeEntries(filters, format = 'csv') {
    try {
      // In production, this would generate an export file
      console.log(`Exporting time entries as ${format} with filters:`, filters);
      return {
        success: true,
        format,
        filename: `time_entries_export_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`,
        url: `/exports/time_entries_export_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`
      };
    } catch (error) {
      console.error('Error exporting time entries:', error);
      throw error;
    }
  }
  
  /**
   * Get module settings
   */
  getSettings() {
    const settings = {};
    
    // Get each setting with default fallback
    Object.entries(this.defaultSettings).forEach(([key, defaultValue]) => {
      settings[key] = configManager.get(`modules.timeTracking.settings.${key}`, defaultValue);
    });
    
    return settings;
  }
  
  /**
   * Get API handlers
   */
  getApi() {
    return this.api;
  }
}

module.exports = TimeTrackingModule;