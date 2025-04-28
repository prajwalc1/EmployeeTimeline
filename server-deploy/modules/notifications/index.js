/**
 * Notifications Module for Schwarzenberg Tech Time Management
 * 
 * This module provides customizable email notifications for HR workflows.
 */

const path = require('path');
const fs = require('fs');
const notificationService = require('./services/notificationService');
const emailService = require('./services/emailService');
const configManager = require('../../server-config');

class NotificationsModule {
  constructor() {
    this.name = 'notifications';
    this.version = '1.0.0';
    this.coreModule = null;
    this.api = {};
    
    // Load default settings from manifest
    const manifestPath = path.join(__dirname, 'manifest.json');
    this.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  
  /**
   * Initialize the notifications module
   */
  async initialize() {
    console.log('Initializing Notifications Module...');
    
    try {
      // Get module manager and core module
      const moduleManager = require('../module-manager');
      this.coreModule = moduleManager.getModule('core');
      
      if (!this.coreModule) {
        throw new Error('Core module is required but not loaded');
      }
      
      // Initialize services
      await notificationService.initialize();
      
      // Register with core hooks
      this.registerHooks();
      
      // Initialize API
      this.initializeApi();
      
      // Create default templates
      await this.createDefaultTemplates();
      
      console.log('Notifications Module initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Notifications Module:', error);
      return false;
    }
  }
  
  /**
   * Register with core hooks
   */
  registerHooks() {
    if (!this.coreModule) {
      console.warn('Core module not available, skipping hook registration');
      return;
    }
    
    // System startup hook
    this.coreModule.registerHook('onSystemStartup', () => {
      console.log('Notifications module responding to system startup');
    }, this.name);
    
    // Try to register hooks with time tracking module if available
    const moduleManager = require('../module-manager');
    const timeTrackingModule = moduleManager.getModule('timeTracking');
    
    if (timeTrackingModule) {
      // Check if the timeTracking module has these hooks
      if (timeTrackingModule.registerHook) {
        timeTrackingModule.registerHook('onTimeEntryCreate', this.handleTimeEntryCreate.bind(this), this.name);
        timeTrackingModule.registerHook('onTimeEntryUpdate', this.handleTimeEntryUpdate.bind(this), this.name);
      }
    }
    
    // Try to register hooks with leave management module if available
    const leaveManagementModule = moduleManager.getModule('leaveManagement');
    
    if (leaveManagementModule) {
      // Check if the leaveManagement module has these hooks
      if (leaveManagementModule.registerHook) {
        leaveManagementModule.registerHook('onLeaveRequestCreate', this.handleLeaveRequestCreate.bind(this), this.name);
        leaveManagementModule.registerHook('onLeaveRequestUpdate', this.handleLeaveRequestUpdate.bind(this), this.name);
        leaveManagementModule.registerHook('onLeaveRequestDelete', this.handleLeaveRequestDelete.bind(this), this.name);
      }
    }
  }
  
  /**
   * Initialize API handlers
   */
  initializeApi() {
    this.api = {
      // Template management
      getTemplates: this.getTemplates.bind(this),
      getTemplateContent: this.getTemplateContent.bind(this),
      saveTemplate: this.saveTemplate.bind(this),
      resetTemplate: this.resetTemplate.bind(this),
      
      // Settings management
      getSettings: this.getSettings.bind(this),
      updateSettings: this.updateSettings.bind(this),
      
      // Notification testing
      testEmailConfiguration: this.testEmailConfiguration.bind(this),
      sendTestNotification: this.sendTestNotification.bind(this)
    };
  }
  
  /**
   * Create default email templates
   */
  async createDefaultTemplates() {
    const templatesDir = path.join(__dirname, 'templates');
    
    // Create templates directory if it doesn't exist
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    
    // Check if templates exist
    const requiredTemplates = [
      'leave_request_created',
      'leave_request_created_confirmation',
      'leave_request_approved',
      'leave_request_denied',
      'leave_request_cancelled',
      'time_entry_reminder',
      'time_entry_approved',
      'monthly_report',
      'password_reset',
      'account_created'
    ];
    
    for (const template of requiredTemplates) {
      const templatePath = path.join(templatesDir, `${template}.html`);
      
      if (!fs.existsSync(templatePath)) {
        const defaultTemplate = this.getDefaultTemplate(template);
        fs.writeFileSync(templatePath, defaultTemplate, 'utf8');
        console.log(`Created default template: ${template}`);
      }
    }
  }
  
  /**
   * Get default template content
   * @param {string} templateName - Template name
   * @returns {string} Template content
   */
  getDefaultTemplate(templateName) {
    // Common CSS
    const css = `
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #004a87; color: white; padding: 10px 20px; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { padding: 20px; border: 1px solid #ddd; }
      .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #777; }
      .button { display: inline-block; padding: 10px 20px; background-color: #004a87; color: white; text-decoration: none; border-radius: 4px; }
      table { width: 100%; border-collapse: collapse; }
      table th, table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
      table th { background-color: #f2f2f2; }
    `;
    
    // Company header and footer
    const companyHeader = `
      <div class="header">
        <h1>{{company.name}}</h1>
      </div>
    `;
    
    const companyFooter = `
      <div class="footer">
        <p>
          {{company.name}}<br>
          {{#if company.address}}{{company.address}}<br>{{/if}}
          {{#if company.website}}<a href="{{company.website}}">{{company.website}}</a>{{/if}}
        </p>
      </div>
    `;
    
    // Template-specific content
    let content = '';
    
    switch (templateName) {
      case 'leave_request_created':
        content = `
          <h2>New Leave Request to Review</h2>
          <p>Dear {{manager.name}},</p>
          <p>A new leave request has been submitted and requires your review:</p>
          <table>
            <tr>
              <th>Employee:</th>
              <td>{{employee.name}}</td>
            </tr>
            <tr>
              <th>Department:</th>
              <td>{{employee.department}}</td>
            </tr>
            <tr>
              <th>Leave Type:</th>
              <td>{{leaveRequest.type}}</td>
            </tr>
            <tr>
              <th>Start Date:</th>
              <td>{{leaveRequest.startDate}}</td>
            </tr>
            <tr>
              <th>End Date:</th>
              <td>{{leaveRequest.endDate}}</td>
            </tr>
            <tr>
              <th>Notes:</th>
              <td>{{leaveRequest.notes}}</td>
            </tr>
          </table>
          <p>Please login to the Time Management System to approve or deny this request.</p>
          <p><a href="#" class="button">Review Request</a></p>
        `;
        break;
        
      case 'leave_request_created_confirmation':
        content = `
          <h2>Leave Request Confirmation</h2>
          <p>Dear {{employee.name}},</p>
          <p>Your leave request has been submitted successfully and is now pending approval:</p>
          <table>
            <tr>
              <th>Leave Type:</th>
              <td>{{leaveRequest.type}}</td>
            </tr>
            <tr>
              <th>Start Date:</th>
              <td>{{leaveRequest.startDate}}</td>
            </tr>
            <tr>
              <th>End Date:</th>
              <td>{{leaveRequest.endDate}}</td>
            </tr>
          </table>
          <p>Your request will be reviewed by {{manager.name}}. You will be notified once a decision has been made.</p>
        `;
        break;
        
      case 'leave_request_approved':
        content = `
          <h2>Leave Request Approved</h2>
          <p>Dear {{employee.name}},</p>
          <p>Your leave request has been approved:</p>
          <table>
            <tr>
              <th>Leave Type:</th>
              <td>{{leaveRequest.type}}</td>
            </tr>
            <tr>
              <th>Start Date:</th>
              <td>{{leaveRequest.startDate}}</td>
            </tr>
            <tr>
              <th>End Date:</th>
              <td>{{leaveRequest.endDate}}</td>
            </tr>
          </table>
          <p>Approved by: {{manager.name}}</p>
          <p>If you need to cancel this leave, please do so at least 3 days in advance.</p>
        `;
        break;
        
      case 'leave_request_denied':
        content = `
          <h2>Leave Request Denied</h2>
          <p>Dear {{employee.name}},</p>
          <p>Unfortunately, your leave request has been denied:</p>
          <table>
            <tr>
              <th>Leave Type:</th>
              <td>{{leaveRequest.type}}</td>
            </tr>
            <tr>
              <th>Start Date:</th>
              <td>{{leaveRequest.startDate}}</td>
            </tr>
            <tr>
              <th>End Date:</th>
              <td>{{leaveRequest.endDate}}</td>
            </tr>
          </table>
          <p>Denied by: {{manager.name}}</p>
          <p>Reason: {{reason}}</p>
          <p>If you have any questions, please contact your manager.</p>
        `;
        break;
        
      case 'leave_request_cancelled':
        content = `
          <h2>Leave Request Cancelled</h2>
          <p>Dear {{#if manager}}{{manager.name}}{{else}}{{employee.name}}{{/if}},</p>
          <p>A leave request has been cancelled by {{cancelledBy}}:</p>
          <table>
            <tr>
              <th>Employee:</th>
              <td>{{employee.name}}</td>
            </tr>
            <tr>
              <th>Leave Type:</th>
              <td>{{leaveRequest.type}}</td>
            </tr>
            <tr>
              <th>Start Date:</th>
              <td>{{leaveRequest.startDate}}</td>
            </tr>
            <tr>
              <th>End Date:</th>
              <td>{{leaveRequest.endDate}}</td>
            </tr>
          </table>
          <p>No further action is required.</p>
        `;
        break;
        
      case 'time_entry_reminder':
        content = `
          <h2>Time Entry Reminder</h2>
          <p>Dear {{employee.name}},</p>
          <p>This is a friendly reminder to submit your time entries for the following dates:</p>
          <ul>
            {{#each missingEntries}}
              <li>{{this}}</li>
            {{/each}}
          </ul>
          <p>Please login to the Time Management System to complete your time entries.</p>
          <p><a href="#" class="button">Enter Time</a></p>
        `;
        break;
        
      case 'time_entry_approved':
        content = `
          <h2>Time Entry Approved</h2>
          <p>Dear {{employee.name}},</p>
          <p>Your time entry for {{timeEntry.date}} has been approved:</p>
          <table>
            <tr>
              <th>Date:</th>
              <td>{{timeEntry.date}}</td>
            </tr>
            <tr>
              <th>Start Time:</th>
              <td>{{timeEntry.startTime}}</td>
            </tr>
            <tr>
              <th>End Time:</th>
              <td>{{timeEntry.endTime}}</td>
            </tr>
            <tr>
              <th>Break:</th>
              <td>{{timeEntry.breakDuration}} minutes</td>
            </tr>
            <tr>
              <th>Project:</th>
              <td>{{timeEntry.project}}</td>
            </tr>
            <tr>
              <th>Approved By:</th>
              <td>{{approvedBy}}</td>
            </tr>
          </table>
        `;
        break;
        
      case 'monthly_report':
        content = `
          <h2>Monthly Time Report</h2>
          <p>Dear {{employee.name}},</p>
          <p>Your monthly time report for {{month}}/{{year}} is now available.</p>
          <table>
            <tr>
              <th>Total Days:</th>
              <td>{{report.totalDays}}</td>
            </tr>
            <tr>
              <th>Working Days:</th>
              <td>{{report.workingDays}}</td>
            </tr>
            <tr>
              <th>Total Hours:</th>
              <td>{{report.totalHours}}</td>
            </tr>
            <tr>
              <th>Overtime Hours:</th>
              <td>{{report.overtimeHours}}</td>
            </tr>
            <tr>
              <th>Leave Days:</th>
              <td>{{report.leaveDays}}</td>
            </tr>
          </table>
          <p>You can view the full report in the Time Management System.</p>
          {{#if reportUrl}}
          <p><a href="{{reportUrl}}" class="button">View Full Report</a></p>
          {{/if}}
        `;
        break;
        
      case 'password_reset':
        content = `
          <h2>Password Reset</h2>
          <p>Dear {{user.name}},</p>
          <p>You have requested to reset your password for the Time Management System.</p>
          <p>Please use the following link to reset your password:</p>
          <p><a href="{{resetUrl}}" class="button">Reset Password</a></p>
          <p>If you did not request a password reset, please ignore this email or contact your administrator.</p>
          <p>This link will expire in 24 hours.</p>
        `;
        break;
        
      case 'account_created':
        content = `
          <h2>Welcome to the Time Management System</h2>
          <p>Dear {{user.name}},</p>
          <p>Your account for the Schwarzenberg Tech Time Management System has been created.</p>
          <p>You can login with the following credentials:</p>
          <table>
            <tr>
              <th>Username:</th>
              <td>{{user.email}}</td>
            </tr>
            <tr>
              <th>Password:</th>
              <td>{{initialPassword}}</td>
            </tr>
          </table>
          <p>Please login and change your password immediately.</p>
          <p><a href="{{loginUrl}}" class="button">Login Now</a></p>
        `;
        break;
        
      default:
        content = `
          <h2>Notification</h2>
          <p>This is a default notification template.</p>
        `;
        break;
    }
    
    // Construct the full template
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Time Management System</title>
  <style>
    ${css}
  </style>
</head>
<body>
  <div class="container">
    ${companyHeader}
    <div class="content">
      ${content}
    </div>
    ${companyFooter}
  </div>
</body>
</html>`;
  }
  
  /**
   * Handler for time entry creation
   * @param {object} timeEntry - Time entry data
   */
  async handleTimeEntryCreate(timeEntry) {
    // Implementation would send notifications as needed
    console.log('Handling time entry creation for notifications', timeEntry.id);
  }
  
  /**
   * Handler for time entry updates
   * @param {object} timeEntry - Time entry data
   * @param {object} update - Update data
   */
  async handleTimeEntryUpdate(timeEntry, update) {
    // Check if status was changed to approved
    if (update.status === 'APPROVED' && timeEntry.status !== 'APPROVED') {
      try {
        // Get employee data
        const employeeService = this.coreModule.getService('employee');
        const employee = await employeeService.getEmployeeById(timeEntry.employeeId);
        
        if (employee) {
          // Send notification
          await notificationService.sendNotification('timeEntryApproved', {
            timeEntry,
            employee,
            approvedBy: update.approvedBy || 'System'
          });
        }
      } catch (error) {
        console.error('Error handling time entry update notification:', error);
      }
    }
  }
  
  /**
   * Handler for leave request creation
   * @param {object} leaveRequest - Leave request data
   */
  async handleLeaveRequestCreate(leaveRequest) {
    try {
      // Get employee and manager data
      const employeeService = this.coreModule.getService('employee');
      const employee = await employeeService.getEmployeeById(leaveRequest.employeeId);
      
      if (employee && employee.managerId) {
        const manager = await employeeService.getEmployeeById(employee.managerId);
        
        if (manager) {
          // Send notification
          await notificationService.sendNotification('leaveRequestCreated', {
            leaveRequest,
            employee,
            manager
          });
        }
      }
    } catch (error) {
      console.error('Error handling leave request creation notification:', error);
    }
  }
  
  /**
   * Handler for leave request updates
   * @param {object} leaveRequest - Leave request data
   * @param {object} update - Update data
   */
  async handleLeaveRequestUpdate(leaveRequest, update) {
    try {
      // Get employee data
      const employeeService = this.coreModule.getService('employee');
      const employee = await employeeService.getEmployeeById(leaveRequest.employeeId);
      
      if (!employee) {
        console.warn('Employee not found for leave request notification');
        return;
      }
      
      // Get manager data if available
      let manager = null;
      if (employee.managerId) {
        manager = await employeeService.getEmployeeById(employee.managerId);
      }
      
      // Check what was updated
      if (update.status === 'APPROVED' && leaveRequest.status !== 'APPROVED') {
        // Send approval notification
        await notificationService.sendNotification('leaveRequestApproved', {
          leaveRequest: { ...leaveRequest, ...update },
          employee,
          manager
        });
      } else if (update.status === 'DENIED' && leaveRequest.status !== 'DENIED') {
        // Send denial notification
        await notificationService.sendNotification('leaveRequestDenied', {
          leaveRequest: { ...leaveRequest, ...update },
          employee,
          manager,
          reason: update.notes || 'No reason provided'
        });
      } else if (update.status === 'CANCELLED' && leaveRequest.status !== 'CANCELLED') {
        // Send cancellation notification
        await notificationService.sendNotification('leaveRequestCancelled', {
          leaveRequest: { ...leaveRequest, ...update },
          employee,
          manager,
          cancelledBy: update.cancelledBy || employee.name
        });
      }
    } catch (error) {
      console.error('Error handling leave request update notification:', error);
    }
  }
  
  /**
   * Handler for leave request deletion
   * @param {object} leaveRequest - Leave request data
   */
  async handleLeaveRequestDelete(leaveRequest) {
    // Usually, leave requests should be cancelled, not deleted
    console.log('Handling leave request deletion for notifications', leaveRequest.id);
  }
  
  /**
   * Get all available templates
   */
  getTemplates() {
    return notificationService.getAllTemplates();
  }
  
  /**
   * Get template content
   * @param {string} templateName - Template name
   */
  getTemplateContent(templateName) {
    return notificationService.getTemplateContent(templateName);
  }
  
  /**
   * Save a template
   * @param {string} templateName - Template name
   * @param {string} content - Template content
   */
  saveTemplate(templateName, content) {
    return notificationService.saveCustomTemplate(templateName, content);
  }
  
  /**
   * Reset a template to the default
   * @param {string} templateName - Template name
   */
  resetTemplate(templateName) {
    return notificationService.resetCustomTemplate(templateName);
  }
  
  /**
   * Get notification settings
   */
  getSettings() {
    return {
      email: emailService.loadSettings(),
      notifications: notificationService.loadSettings()
    };
  }
  
  /**
   * Update notification settings
   * @param {object} settings - New settings
   */
  updateSettings(settings) {
    const result = {
      email: {},
      notifications: {}
    };
    
    if (settings.email) {
      result.email = emailService.updateSettings(settings.email);
    }
    
    if (settings.notifications) {
      result.notifications = notificationService.updateSettings(settings.notifications);
    }
    
    return result;
  }
  
  /**
   * Test email configuration
   * @param {string} testEmail - Email to send test to
   */
  async testEmailConfiguration(testEmail) {
    return emailService.testEmailConfiguration(testEmail);
  }
  
  /**
   * Send a test notification
   * @param {string} notificationType - Type of notification to test
   * @param {object} testData - Test data for the notification
   */
  async sendTestNotification(notificationType, testData) {
    try {
      if (!notificationService.handlers[notificationType]) {
        return {
          success: false,
          message: `Notification type not found: ${notificationType}`
        };
      }
      
      const result = await notificationService.sendNotification(notificationType, testData);
      
      return {
        success: !!result,
        message: result 
          ? `Test notification ${notificationType} sent successfully` 
          : `Failed to send test notification ${notificationType}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Error sending test notification: ${error.message}`
      };
    }
  }
  
  /**
   * Get API handlers
   */
  getApi() {
    return this.api;
  }
}

module.exports = NotificationsModule;