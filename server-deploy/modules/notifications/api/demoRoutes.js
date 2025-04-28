/**
 * Demo routes for testing notification functionality
 */

const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

/**
 * Send a leave request created notification (demo)
 * POST /api/notifications/demo/leave-request-created
 */
router.post('/demo/leave-request-created', async (req, res) => {
  try {
    const { employeeId, managerId } = req.body;
    
    // Get employee data from database or use mock data for demo
    const employee = {
      id: employeeId || 1,
      name: req.body.employeeName || 'Test Employee',
      email: req.body.employeeEmail || 'employee@example.com', 
      department: req.body.department || 'IT'
    };
    
    // Get manager data
    const manager = {
      id: managerId || 2,
      name: req.body.managerName || 'Test Manager',
      email: req.body.managerEmail || 'manager@example.com'
    };
    
    // Create a sample leave request
    const leaveRequest = {
      id: 123,
      employeeId: employee.id,
      startDate: req.body.startDate || '2025-05-01',
      endDate: req.body.endDate || '2025-05-05',
      type: req.body.type || 'VACATION',
      status: 'PENDING',
      notes: req.body.notes || 'Annual vacation'
    };
    
    // Send the notification
    const result = await notificationService.sendNotification('leaveRequestCreated', {
      leaveRequest,
      employee,
      manager
    });
    
    if (result) {
      res.json({
        success: true,
        message: 'Leave request created notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send notification',
        message: 'Notification service failed to send the notification'
      });
    }
  } catch (error) {
    console.error('Error sending demo notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      message: error.message
    });
  }
});

/**
 * Send a leave request approved notification (demo)
 * POST /api/notifications/demo/leave-request-approved
 */
router.post('/demo/leave-request-approved', async (req, res) => {
  try {
    const { employeeId, managerId } = req.body;
    
    // Get employee data
    const employee = {
      id: employeeId || 1,
      name: req.body.employeeName || 'Test Employee',
      email: req.body.employeeEmail || 'employee@example.com', 
      department: req.body.department || 'IT'
    };
    
    // Get manager data
    const manager = {
      id: managerId || 2,
      name: req.body.managerName || 'Test Manager',
      email: req.body.managerEmail || 'manager@example.com'
    };
    
    // Create a sample leave request
    const leaveRequest = {
      id: 123,
      employeeId: employee.id,
      startDate: req.body.startDate || '2025-05-01',
      endDate: req.body.endDate || '2025-05-05',
      type: req.body.type || 'VACATION',
      status: 'APPROVED',
      notes: req.body.notes || 'Annual vacation'
    };
    
    // Send the notification
    const result = await notificationService.sendNotification('leaveRequestApproved', {
      leaveRequest,
      employee,
      manager
    });
    
    if (result) {
      res.json({
        success: true,
        message: 'Leave request approved notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send notification',
        message: 'Notification service failed to send the notification'
      });
    }
  } catch (error) {
    console.error('Error sending demo notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      message: error.message
    });
  }
});

/**
 * Send a time entry reminder notification (demo)
 * POST /api/notifications/demo/time-entry-reminder
 */
router.post('/demo/time-entry-reminder', async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    // Get employee data
    const employee = {
      id: employeeId || 1,
      name: req.body.employeeName || 'Test Employee',
      email: req.body.employeeEmail || 'employee@example.com', 
      department: req.body.department || 'IT'
    };
    
    // Create sample missing entries
    const missingEntries = [
      req.body.date1 || '2025-04-28',
      req.body.date2 || '2025-04-29'
    ];
    
    // Send the notification
    const result = await notificationService.sendNotification('timeEntryReminder', {
      employee,
      date: new Date().toISOString().split('T')[0],
      missingEntries
    });
    
    if (result) {
      res.json({
        success: true,
        message: 'Time entry reminder notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send notification',
        message: 'Notification service failed to send the notification'
      });
    }
  } catch (error) {
    console.error('Error sending demo notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      message: error.message
    });
  }
});

/**
 * Send a monthly report notification (demo)
 * POST /api/notifications/demo/monthly-report
 */
router.post('/demo/monthly-report', async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    // Get employee data
    const employee = {
      id: employeeId || 1,
      name: req.body.employeeName || 'Test Employee',
      email: req.body.employeeEmail || 'employee@example.com', 
      department: req.body.department || 'IT'
    };
    
    // Current month and year
    const now = new Date();
    const month = req.body.month || now.getMonth() + 1;
    const year = req.body.year || now.getFullYear();
    
    // Sample report data
    const report = {
      totalDays: 30,
      workingDays: 21,
      totalHours: 168,
      averageDailyHours: 8,
      overtimeHours: 4,
      leaveDays: 1,
      projects: [
        { name: 'INTERNAL', hours: 120, percentage: 71 },
        { name: 'PROJECT-A', hours: 24, percentage: 14 },
        { name: 'PROJECT-B', hours: 24, percentage: 14 }
      ]
    };
    
    // Send the notification
    const result = await notificationService.sendNotification('monthlyReport', {
      employee,
      month,
      year,
      report,
      reportUrl: `https://example.com/reports/${year}/${month}/${employeeId}`
    });
    
    if (result) {
      res.json({
        success: true,
        message: 'Monthly report notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send notification',
        message: 'Notification service failed to send the notification'
      });
    }
  } catch (error) {
    console.error('Error sending demo notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      message: error.message
    });
  }
});

module.exports = router;