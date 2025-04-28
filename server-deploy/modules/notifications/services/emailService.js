/**
 * Email Service for Schwarzenberg Tech Time Management System
 * 
 * Provides functionality to send emails using configurable providers.
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const configManager = require('../../../server-config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.settings = {};
    this.templateCache = {};
  }

  /**
   * Initialize the email service
   */
  async initialize() {
    try {
      // Load settings
      this.settings = this.loadSettings();
      
      if (!this.settings.enableNotifications) {
        console.log('Email notifications are disabled in settings');
        return false;
      }

      await this.createTransporter();
      this.initialized = true;
      
      console.log('Email service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      return false;
    }
  }

  /**
   * Load email settings from configuration
   */
  loadSettings() {
    const defaultSettings = {
      emailProvider: 'smtp',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: '',
      smtpPassword: '',
      emailFrom: 'timemanagement@example.com',
      emailFromName: 'Time Management System',
      bccAdmin: false,
      adminEmail: '',
      dailyEmailLimit: 1000,
      enableNotifications: true
    };

    const settings = {};
    // Get each setting with default fallback
    Object.entries(defaultSettings).forEach(([key, defaultValue]) => {
      settings[key] = configManager.get(`modules.notifications.settings.${key}`, defaultValue);
    });

    return settings;
  }

  /**
   * Create email transport based on configuration
   */
  async createTransporter() {
    const { emailProvider, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword } = this.settings;

    switch (emailProvider) {
      case 'smtp':
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPassword
          }
        });
        break;
        
      case 'sendmail':
        this.transporter = nodemailer.createTransport({
          sendmail: true,
          newline: 'unix',
          path: '/usr/sbin/sendmail'
        });
        break;
        
      case 'preview':
        // For development - opens preview in browser
        this.transporter = nodemailer.createTransport({
          jsonTransport: true
        });
        break;
        
      case 'memory':
        // For testing
        this.transporter = nodemailer.createTransport({
          jsonTransport: true
        });
        break;
        
      default:
        throw new Error(`Unsupported email provider: ${emailProvider}`);
    }

    // Verify the connection
    if (emailProvider === 'smtp') {
      await this.transporter.verify();
    }
  }

  /**
   * Get email template
   * @param {string} templateName - Template name
   * @returns {Function} Compiled template function
   */
  getTemplate(templateName) {
    if (this.templateCache[templateName]) {
      return this.templateCache[templateName];
    }

    // Check for a customized template first
    const customTemplatePath = path.join(__dirname, '../templates', `${templateName}_custom.html`);
    const defaultTemplatePath = path.join(__dirname, '../templates', `${templateName}.html`);
    
    let templatePath;
    if (fs.existsSync(customTemplatePath)) {
      templatePath = customTemplatePath;
    } else if (fs.existsSync(defaultTemplatePath)) {
      templatePath = defaultTemplatePath;
    } else {
      throw new Error(`Email template not found: ${templateName}`);
    }
    
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    
    // Cache the template for future use
    this.templateCache[templateName] = template;
    
    return template;
  }

  /**
   * Send an email using a template
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} templateName - Template name
   * @param {object} data - Data to pass to the template
   * @param {object} options - Additional options (cc, bcc, attachments)
   */
  async sendTemplateEmail(to, subject, templateName, data, options = {}) {
    if (!this.initialized) {
      console.warn('Email service is not initialized');
      return false;
    }

    try {
      const template = this.getTemplate(templateName);
      const html = template(data);

      // Get company settings from core module
      const coreSettings = configManager.get('modules.core.settings', {});
      
      // Prepare email data with company information
      const fullData = {
        ...data,
        company: {
          name: coreSettings.companyName || 'Schwarzenberg Tech',
          logo: coreSettings.logoUrl || '',
          address: coreSettings.address || '',
          website: coreSettings.website || ''
        }
      };

      const mailOptions = {
        from: `"${this.settings.emailFromName}" <${this.settings.emailFrom}>`,
        to,
        subject,
        html: template(fullData),
        ...options
      };

      // Add BCC to admin if enabled
      if (this.settings.bccAdmin && this.settings.adminEmail) {
        mailOptions.bcc = this.settings.adminEmail;
      }

      // Add custom headers
      mailOptions.headers = {
        'X-Application': 'Schwarzenberg Tech Time Management',
        'X-Template': templateName
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent: ${result.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send a simple email without a template
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} text - Email text
   * @param {string} html - Email HTML content (optional)
   * @param {object} options - Additional options (cc, bcc, attachments)
   */
  async sendEmail(to, subject, text, html, options = {}) {
    if (!this.initialized) {
      console.warn('Email service is not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${this.settings.emailFromName}" <${this.settings.emailFrom}>`,
        to,
        subject,
        text,
        ...options
      };

      if (html) {
        mailOptions.html = html;
      }

      // Add BCC to admin if enabled
      if (this.settings.bccAdmin && this.settings.adminEmail) {
        mailOptions.bcc = this.settings.adminEmail;
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent: ${result.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Check if email notifications are enabled
   */
  isEnabled() {
    return this.settings.enableNotifications && this.initialized;
  }

  /**
   * Update email settings
   * @param {object} newSettings - New settings
   */
  updateSettings(newSettings) {
    Object.entries(newSettings).forEach(([key, value]) => {
      configManager.set(`modules.notifications.settings.${key}`, value);
    });
    
    configManager.save();
    this.settings = this.loadSettings();
    
    // Re-initialize the transporter with new settings
    this.initialized = false;
    this.initialize();
    
    return this.settings;
  }

  /**
   * Test the email configuration
   * @param {string} testEmail - Email to send test to
   */
  async testEmailConfiguration(testEmail) {
    try {
      const result = await this.sendEmail(
        testEmail,
        'Test Email Configuration',
        'This is a test email from the Schwarzenberg Tech Time Management System.',
        '<p>This is a test email from the Schwarzenberg Tech Time Management System.</p><p>If you received this email, the email configuration is working correctly.</p>'
      );
      
      return {
        success: result,
        message: result ? 'Test email sent successfully' : 'Failed to send test email'
      };
    } catch (error) {
      return {
        success: false,
        message: `Error testing email configuration: ${error.message}`
      };
    }
  }

  /**
   * Register a custom helper for templates
   * @param {string} name - Helper name
   * @param {Function} fn - Helper function
   */
  registerTemplateHelper(name, fn) {
    handlebars.registerHelper(name, fn);
  }
}

module.exports = new EmailService();