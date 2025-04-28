/**
 * Notification Service for Schwarzenberg Tech Time Management System
 * 
 * Handles notifications for various HR workflows.
 */

const emailService = require('./emailService');
const configManager = require('../../../server-config');
const fs = require('fs');
const path = require('path');

class NotificationService {
  constructor() {
    this.handlers = {};
    this.initialized = false;
    this.settings = {};
  }

  /**
   * Initialize the notification service
   */
  async initialize() {
    try {
      // Load settings
      this.settings = this.loadSettings();
      
      // Initialize email service
      await emailService.initialize();
      
      // Register notification handlers
      this.registerNotificationHandlers();
      
      this.initialized = true;
      console.log('Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  /**
   * Load notification settings from configuration
   */
  loadSettings() {
    const defaultSettings = {
      enableNotifications: true,
      notificationTypes: {
        leaveRequest: true,
        timeEntry: true,
        monthlyReport: true,
        systemNotice: true
      },
      delayBetweenEmails: 500 // ms
    };

    const settings = {};
    Object.entries(defaultSettings).forEach(([key, defaultValue]) => {
      settings[key] = configManager.get(`modules.notifications.settings.${key}`, defaultValue);
    });

    return settings;
  }

  /**
   * Register notification handlers
   */
  registerNotificationHandlers() {
    // Leave request handlers
    this.handlers.leaveRequestCreated = this.sendLeaveRequestCreatedNotification.bind(this);
    this.handlers.leaveRequestApproved = this.sendLeaveRequestApprovedNotification.bind(this);
    this.handlers.leaveRequestDenied = this.sendLeaveRequestDeniedNotification.bind(this);
    this.handlers.leaveRequestCancelled = this.sendLeaveRequestCancelledNotification.bind(this);
    
    // Time entry handlers
    this.handlers.timeEntryReminder = this.sendTimeEntryReminderNotification.bind(this);
    this.handlers.timeEntryApproved = this.sendTimeEntryApprovedNotification.bind(this);
    
    // Report handlers
    this.handlers.monthlyReport = this.sendMonthlyReportNotification.bind(this);
    
    // Account handlers
    this.handlers.passwordReset = this.sendPasswordResetNotification.bind(this);
    this.handlers.accountCreated = this.sendAccountCreatedNotification.bind(this);
  }

  /**
   * Send a notification
   * @param {string} type - Notification type
   * @param {object} data - Notification data
   */
  async sendNotification(type, data) {
    if (!this.initialized) {
      console.warn('Notification service is not initialized');
      return false;
    }

    // Check if notifications are enabled
    if (!this.settings.enableNotifications) {
      console.log(`Notifications are disabled, skipping ${type} notification`);
      return false;
    }

    // Check if this notification type is enabled
    const notificationCategory = this.getNotificationCategory(type);
    if (notificationCategory && !this.settings.notificationTypes[notificationCategory]) {
      console.log(`${notificationCategory} notifications are disabled, skipping ${type} notification`);
      return false;
    }

    // Find and call the appropriate handler
    const handler = this.handlers[type];
    if (!handler) {
      console.error(`No handler found for notification type: ${type}`);
      return false;
    }

    try {
      return await handler(data);
    } catch (error) {
      console.error(`Error sending ${type} notification:`, error);
      return false;
    }
  }

  /**
   * Get notification category from notification type
   * @param {string} type - Notification type
   * @returns {string} Notification category
   */
  getNotificationCategory(type) {
    if (type.startsWith('leaveRequest')) {
      return 'leaveRequest';
    }
    if (type.startsWith('timeEntry')) {
      return 'timeEntry';
    }
    if (type.startsWith('monthlyReport')) {
      return 'monthlyReport';
    }
    if (type === 'passwordReset' || type === 'accountCreated') {
      return 'systemNotice';
    }
    return null;
  }

  /**
   * Format date for display in notifications
   * @param {string} dateString - Date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    try {
      // Get date format from core settings
      const dateFormat = configManager.get('modules.core.settings.dateFormat', 'dd.MM.yyyy');
      const date = new Date(dateString);
      
      // Format based on German locale (default)
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      return date.toLocaleDateString('de-DE', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }

  /**
   * Send notification when a leave request is created
   * @param {object} data - Leave request data
   */
  async sendLeaveRequestCreatedNotification(data) {
    try {
      const { leaveRequest, employee, manager } = data;
      
      // Skip if no employee or manager email
      if (!employee || !employee.email || !manager || !manager.email) {
        console.warn('Missing employee or manager information, skipping notification');
        return false;
      }

      // Prepare template data
      const templateData = {
        employee: employee,
        manager: manager,
        leaveRequest: {
          ...leaveRequest,
          startDate: this.formatDate(leaveRequest.startDate),
          endDate: this.formatDate(leaveRequest.endDate)
        }
      };

      // Send to manager
      const result = await emailService.sendTemplateEmail(
        manager.email,
        'New Leave Request to Review',
        'leave_request_created',
        templateData
      );

      // Also send confirmation to employee
      await emailService.sendTemplateEmail(
        employee.email,
        'Your Leave Request Has Been Submitted',
        'leave_request_created_confirmation',
        templateData
      );

      return result;
    } catch (error) {
      console.error('Error sending leave request created notification:', error);
      return false;
    }
  }

  /**
   * Send notification when a leave request is approved
   * @param {object} data - Leave request data
   */
  async sendLeaveRequestApprovedNotification(data) {
    try {
      const { leaveRequest, employee, manager } = data;

      // Skip if no employee email
      if (!employee || !employee.email) {
        console.warn('Missing employee information, skipping notification');
        return false;
      }

      // Prepare template data
      const templateData = {
        employee: employee,
        manager: manager || { name: 'System' },
        leaveRequest: {
          ...leaveRequest,
          startDate: this.formatDate(leaveRequest.startDate),
          endDate: this.formatDate(leaveRequest.endDate)
        }
      };

      // Send to employee
      return await emailService.sendTemplateEmail(
        employee.email,
        'Your Leave Request Has Been Approved',
        'leave_request_approved',
        templateData
      );
    } catch (error) {
      console.error('Error sending leave request approved notification:', error);
      return false;
    }
  }

  /**
   * Send notification when a leave request is denied
   * @param {object} data - Leave request data
   */
  async sendLeaveRequestDeniedNotification(data) {
    try {
      const { leaveRequest, employee, manager, reason } = data;

      // Skip if no employee email
      if (!employee || !employee.email) {
        console.warn('Missing employee information, skipping notification');
        return false;
      }

      // Prepare template data
      const templateData = {
        employee: employee,
        manager: manager || { name: 'System' },
        leaveRequest: {
          ...leaveRequest,
          startDate: this.formatDate(leaveRequest.startDate),
          endDate: this.formatDate(leaveRequest.endDate)
        },
        reason: reason || 'No reason provided'
      };

      // Send to employee
      return await emailService.sendTemplateEmail(
        employee.email,
        'Your Leave Request Has Been Denied',
        'leave_request_denied',
        templateData
      );
    } catch (error) {
      console.error('Error sending leave request denied notification:', error);
      return false;
    }
  }

  /**
   * Send notification when a leave request is cancelled
   * @param {object} data - Leave request data
   */
  async sendLeaveRequestCancelledNotification(data) {
    try {
      const { leaveRequest, employee, manager, cancelledBy } = data;

      // Skip if no employee or manager email
      if (!employee || !employee.email || !manager || !manager.email) {
        console.warn('Missing employee or manager information, skipping notification');
        return false;
      }

      // Prepare template data
      const templateData = {
        employee: employee,
        manager: manager,
        leaveRequest: {
          ...leaveRequest,
          startDate: this.formatDate(leaveRequest.startDate),
          endDate: this.formatDate(leaveRequest.endDate)
        },
        cancelledBy: cancelledBy || employee.name
      };

      // Send to appropriate recipient
      const recipient = (cancelledBy === employee.name) ? manager.email : employee.email;
      const subject = (cancelledBy === employee.name) 
        ? `Leave Request Cancelled by ${employee.name}`
        : 'Your Leave Request Has Been Cancelled';

      return await emailService.sendTemplateEmail(
        recipient,
        subject,
        'leave_request_cancelled',
        templateData
      );
    } catch (error) {
      console.error('Error sending leave request cancelled notification:', error);
      return false;
    }
  }

  /**
   * Send time entry reminder notification
   * @param {object} data - Reminder data
   */
  async sendTimeEntryReminderNotification(data) {
    try {
      const { employee, date, missingEntries } = data;

      // Skip if no employee email
      if (!employee || !employee.email) {
        console.warn('Missing employee information, skipping notification');
        return false;
      }

      // Prepare template data
      const templateData = {
        employee: employee,
        date: this.formatDate(date),
        missingEntries: missingEntries || []
      };

      // Send to employee
      return await emailService.sendTemplateEmail(
        employee.email,
        'Time Entry Reminder',
        'time_entry_reminder',
        templateData
      );
    } catch (error) {
      console.error('Error sending time entry reminder notification:', error);
      return false;
    }
  }

  /**
   * Send time entry approved notification
   * @param {object} data - Time entry data
   */
  async sendTimeEntryApprovedNotification(data) {
    try {
      const { timeEntry, employee, approvedBy } = data;

      // Skip if no employee email
      if (!employee || !employee.email) {
        console.warn('Missing employee information, skipping notification');
        return false;
      }

      // Prepare template data
      const templateData = {
        employee: employee,
        timeEntry: {
          ...timeEntry,
          date: this.formatDate(timeEntry.date)
        },
        approvedBy: approvedBy || 'System'
      };

      // Send to employee
      return await emailService.sendTemplateEmail(
        employee.email,
        'Your Time Entry Has Been Approved',
        'time_entry_approved',
        templateData
      );
    } catch (error) {
      console.error('Error sending time entry approved notification:', error);
      return false;
    }
  }

  /**
   * Send monthly report notification
   * @param {object} data - Report data
   */
  async sendMonthlyReportNotification(data) {
    try {
      const { employee, month, year, report, reportUrl } = data;

      // Skip if no employee email
      if (!employee || !employee.email) {
        console.warn('Missing employee information, skipping notification');
        return false;
      }

      // Prepare template data
      const templateData = {
        employee: employee,
        month: month,
        year: year,
        report: report || {},
        reportUrl: reportUrl || ''
      };

      // Send to employee
      return await emailService.sendTemplateEmail(
        employee.email,
        `Your Monthly Time Report for ${month}/${year}`,
        'monthly_report',
        templateData
      );
    } catch (error) {
      console.error('Error sending monthly report notification:', error);
      return false;
    }
  }

  /**
   * Send password reset notification
   * @param {object} data - Password reset data
   */
  async sendPasswordResetNotification(data) {
    try {
      const { user, resetToken, resetUrl } = data;

      // Skip if no user email
      if (!user || !user.email) {
        console.warn('Missing user information, skipping notification');
        return false;
      }

      // Prepare template data
      const templateData = {
        user: user,
        resetToken: resetToken,
        resetUrl: resetUrl
      };

      // Send to user
      return await emailService.sendTemplateEmail(
        user.email,
        'Password Reset Request',
        'password_reset',
        templateData
      );
    } catch (error) {
      console.error('Error sending password reset notification:', error);
      return false;
    }
  }

  /**
   * Send account created notification
   * @param {object} data - Account data
   */
  async sendAccountCreatedNotification(data) {
    try {
      const { user, initialPassword, loginUrl } = data;

      // Skip if no user email
      if (!user || !user.email) {
        console.warn('Missing user information, skipping notification');
        return false;
      }

      // Prepare template data
      const templateData = {
        user: user,
        initialPassword: initialPassword,
        loginUrl: loginUrl
      };

      // Send to user
      return await emailService.sendTemplateEmail(
        user.email,
        'Welcome to Schwarzenberg Tech Time Management System',
        'account_created',
        templateData
      );
    } catch (error) {
      console.error('Error sending account created notification:', error);
      return false;
    }
  }

  /**
   * Get all available notification templates
   */
  getAllTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates');
      const files = fs.readdirSync(templatesDir);
      
      // Filter HTML files and remove _custom suffix and .html extension
      return files
        .filter(file => file.endsWith('.html'))
        .map(file => file.replace('_custom', '').replace('.html', ''));
    } catch (error) {
      console.error('Error getting templates:', error);
      return [];
    }
  }

  /**
   * Get template content
   * @param {string} templateName - Template name
   */
  getTemplateContent(templateName) {
    try {
      // Check for a customized template first
      const customTemplatePath = path.join(__dirname, '../templates', `${templateName}_custom.html`);
      const defaultTemplatePath = path.join(__dirname, '../templates', `${templateName}.html`);
      
      let templatePath;
      if (fs.existsSync(customTemplatePath)) {
        templatePath = customTemplatePath;
      } else if (fs.existsSync(defaultTemplatePath)) {
        templatePath = defaultTemplatePath;
      } else {
        throw new Error(`Template not found: ${templateName}`);
      }
      
      return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.error('Error getting template content:', error);
      return null;
    }
  }

  /**
   * Save custom template
   * @param {string} templateName - Template name
   * @param {string} content - Template content
   */
  saveCustomTemplate(templateName, content) {
    try {
      const templatesDir = path.join(__dirname, '../templates');
      
      // Ensure the directory exists
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }
      
      const customTemplatePath = path.join(templatesDir, `${templateName}_custom.html`);
      
      // Validate that the template compiles
      try {
        const handlebars = require('handlebars');
        handlebars.compile(content);
      } catch (error) {
        throw new Error(`Invalid template: ${error.message}`);
      }
      
      fs.writeFileSync(customTemplatePath, content, 'utf8');
      
      // Clear template cache in email service
      if (emailService.templateCache) {
        delete emailService.templateCache[templateName];
      }
      
      return true;
    } catch (error) {
      console.error('Error saving custom template:', error);
      return false;
    }
  }

  /**
   * Reset custom template (delete custom version)
   * @param {string} templateName - Template name
   */
  resetCustomTemplate(templateName) {
    try {
      const customTemplatePath = path.join(__dirname, '../templates', `${templateName}_custom.html`);
      
      if (fs.existsSync(customTemplatePath)) {
        fs.unlinkSync(customTemplatePath);
        
        // Clear template cache in email service
        if (emailService.templateCache) {
          delete emailService.templateCache[templateName];
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error resetting custom template:', error);
      return false;
    }
  }

  /**
   * Update notification settings
   * @param {object} newSettings - New settings
   */
  updateSettings(newSettings) {
    Object.entries(newSettings).forEach(([key, value]) => {
      configManager.set(`modules.notifications.settings.${key}`, value);
    });
    
    configManager.save();
    this.settings = this.loadSettings();
    
    return this.settings;
  }
}

// Export singleton instance
module.exports = new NotificationService();