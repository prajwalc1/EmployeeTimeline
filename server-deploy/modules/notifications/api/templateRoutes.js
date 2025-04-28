/**
 * Template API Routes for Notifications Module
 */

const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

/**
 * Get all available templates
 * GET /api/notifications/templates
 */
router.get('/templates', (req, res) => {
  try {
    const templates = notificationService.getAllTemplates();
    res.json({
      success: true,
      templates: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      message: error.message
    });
  }
});

/**
 * Get a specific template content
 * GET /api/notifications/templates/:templateName
 */
router.get('/templates/:templateName', (req, res) => {
  try {
    const { templateName } = req.params;
    const content = notificationService.getTemplateContent(templateName);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        message: `Template ${templateName} not found`
      });
    }
    
    res.json({
      success: true,
      template: {
        name: templateName,
        content: content
      }
    });
  } catch (error) {
    console.error('Error fetching template content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template content',
      message: error.message
    });
  }
});

/**
 * Save a template (create custom version)
 * POST /api/notifications/templates/:templateName
 */
router.post('/templates/:templateName', (req, res) => {
  try {
    const { templateName } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Template content is required'
      });
    }
    
    const result = notificationService.saveCustomTemplate(templateName, content);
    
    if (!result) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save template',
        message: 'An error occurred while saving the template'
      });
    }
    
    res.json({
      success: true,
      message: `Template ${templateName} saved successfully`
    });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save template',
      message: error.message
    });
  }
});

/**
 * Reset a template to default
 * DELETE /api/notifications/templates/:templateName
 */
router.delete('/templates/:templateName', (req, res) => {
  try {
    const { templateName } = req.params;
    const result = notificationService.resetCustomTemplate(templateName);
    
    res.json({
      success: true,
      message: result 
        ? `Template ${templateName} reset to default` 
        : `No custom template found for ${templateName}`
    });
  } catch (error) {
    console.error('Error resetting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset template',
      message: error.message
    });
  }
});

/**
 * Get email and notification settings
 * GET /api/notifications/settings
 */
router.get('/settings', (req, res) => {
  try {
    const emailSettings = emailService.loadSettings();
    const notificationSettings = notificationService.loadSettings();
    
    // Remove sensitive information
    if (emailSettings.smtpPassword) {
      emailSettings.smtpPassword = '•••••••••';
    }
    
    res.json({
      success: true,
      settings: {
        email: emailSettings,
        notifications: notificationSettings
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
      message: error.message
    });
  }
});

/**
 * Update email and notification settings
 * PUT /api/notifications/settings
 */
router.put('/settings', (req, res) => {
  try {
    const { email, notifications } = req.body;
    
    // Update settings
    const updatedSettings = {
      email: email ? emailService.updateSettings(email) : undefined,
      notifications: notifications ? notificationService.updateSettings(notifications) : undefined
    };
    
    // Remove sensitive information
    if (updatedSettings.email && updatedSettings.email.smtpPassword) {
      updatedSettings.email.smtpPassword = '•••••••••';
    }
    
    res.json({
      success: true,
      settings: updatedSettings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

/**
 * Test email configuration
 * POST /api/notifications/test-email
 */
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Email address is required'
      });
    }
    
    const result = await emailService.testEmailConfiguration(email);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test email configuration',
      message: error.message
    });
  }
});

/**
 * Test a notification
 * POST /api/notifications/test-notification
 */
router.post('/test-notification', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Notification type is required'
      });
    }
    
    const result = await notificationService.sendNotification(type, data || {});
    
    res.json({
      success: !!result,
      message: result 
        ? `Test notification ${type} sent successfully` 
        : `Failed to send test notification ${type}`
    });
  } catch (error) {
    console.error('Error testing notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test notification',
      message: error.message
    });
  }
});

module.exports = router;