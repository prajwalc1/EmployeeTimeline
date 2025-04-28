# Email Notification System Documentation

This document provides information about the email notification system in the Schwarzenberg Tech Time Management System.

## Overview

The notification system allows the application to send customizable email notifications for various HR workflows, such as:

- Leave request creation, approval, and rejection
- Time entry reminders and approvals
- Monthly time reports
- Account creation and password resets

## System Architecture

The notification system is built as a modular component that integrates with the core application. It consists of:

1. **Email Service**: Handles the technical aspects of sending emails
2. **Notification Service**: Manages notification templates and sending logic
3. **Template Management**: Allows customization of email templates
4. **API Endpoints**: For testing and managing notifications

## Configuration

Email notifications can be configured in the admin interface under "Email Notification Management":

### Email Provider Settings

- **Provider Type**: Choose between SMTP, Sendmail, or Preview mode
- **SMTP Configuration**: Server address, port, authentication, and security settings
- **From Address**: The email address that will appear in the "From" field
- **From Name**: The name that will appear in the "From" field 

### Notification Settings

- **Enable/Disable**: Turn all notifications on or off
- **Notification Types**: Enable or disable specific types of notifications

## Templates

Email templates use HTML with Handlebars for dynamic content. The following templates are available:

| Template Name | Description | Variables |
|---------------|-------------|-----------|
| leave_request_created | Sent to managers when an employee submits a leave request | employee, manager, leaveRequest |
| leave_request_created_confirmation | Sent to employees when they submit a leave request | employee, manager, leaveRequest |
| leave_request_approved | Sent to employees when their leave request is approved | employee, manager, leaveRequest |
| leave_request_denied | Sent to employees when their leave request is denied | employee, manager, leaveRequest, reason |
| leave_request_cancelled | Sent when a leave request is cancelled | employee, manager, leaveRequest, cancelledBy |
| time_entry_reminder | Sent to employees to remind them to submit time entries | employee, date, missingEntries |
| time_entry_approved | Sent to employees when their time entry is approved | employee, timeEntry, approvedBy |
| monthly_report | Sent to employees with their monthly time report | employee, month, year, report, reportUrl |
| password_reset | Sent when a user requests a password reset | user, resetToken, resetUrl |
| account_created | Sent when a new account is created | user, initialPassword, loginUrl |

### Customizing Templates

Templates can be customized in the admin interface:

1. Go to "Email Notification Management"
2. Select the "Email Templates" tab
3. Choose a template from the dropdown
4. Click "Edit Template"
5. Make your changes to the HTML
6. Click "Save Changes"

The system will create a custom version of the template while preserving the original. You can always reset to the default template if needed.

## Testing

You can test email notifications:

1. Go to "Email Notification Management"
2. Select the "Test Notifications" tab
3. Choose a notification type
4. Fill in the test data (use real email addresses to receive the test)
5. Click "Send Test Notification"

## Integration with Other Modules

The notification system integrates with other modules through hooks:

- **Core Module**: For user and company information
- **Time Tracking Module**: For time entry events
- **Leave Management Module**: For leave request events

## Developer Information

If you're developing new features that need to send notifications:

1. Use the notification service's `sendNotification` method:

```javascript
const notificationService = require('../../modules/notifications/services/notificationService');

// Example: Send a notification when a time entry is approved
await notificationService.sendNotification('timeEntryApproved', {
  timeEntry: timeEntryData,
  employee: employeeData,
  approvedBy: approverName
});
```

2. To add a new template type:
   - Add the template name to the notifications module manifest
   - Create a default template in the templates directory
   - Add a handler function in the notification service
   - Register the handler in the `registerNotificationHandlers` method

## Troubleshooting

- **Emails not sending**: Check SMTP settings, ensure the email provider is correctly configured
- **Template errors**: Verify that your custom template includes all required variables
- **Incorrect email content**: Check the data being passed to the notification service

## Security Considerations

- SMTP passwords are stored securely and never exposed in the UI or API responses
- Templates are sanitized to prevent XSS attacks
- Email sending is rate-limited to prevent abuse