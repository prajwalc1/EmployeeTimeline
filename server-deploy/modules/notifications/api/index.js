/**
 * Notifications API Module
 */

const express = require('express');
const router = express.Router();
const templateRoutes = require('./templateRoutes');
const demoRoutes = require('./demoRoutes');

// Register template routes
router.use('/', templateRoutes);

// Register demo routes
router.use('/', demoRoutes);

/**
 * Register notification API routes
 * @param {Express} app - Express app instance
 */
function registerNotificationRoutes(app) {
  app.use('/api/notifications', router);
  console.log('Notification API routes registered');
}

module.exports = {
  registerNotificationRoutes
};