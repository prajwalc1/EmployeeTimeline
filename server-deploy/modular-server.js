/**
 * Schwarzenberg Tech Employee Time Management System
 * Modular Server - Inspired by Odoo's architecture
 * 
 * This is the main server entry point using the modular architecture.
 */

const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const { WebSocketServer } = require('ws');
const yaml = require('yaml');

// Load environment variables
dotenv.config();

// Load configuration
const configManager = require('./server-config');
const config = configManager.load();

// Initialize module system
const moduleManager = require('./modules/module-manager');

// Create Express app
const app = express();

// Setup middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(bodyParser.json({ limit: config.server.maxUploadSize }));
app.use(bodyParser.urlencoded({ extended: true, limit: config.server.maxUploadSize }));

// Session configuration
app.use(session({
  secret: config.security.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Initialize logging system
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  debug: (...args) => {
    if (config.logging.level === 'debug') {
      console.log('[DEBUG]', ...args);
    }
  }
};

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

// WebSocket connections
const clients = new Map();

wss.on('connection', (ws, req) => {
  const id = Math.random().toString(36).substring(2, 10);
  const ip = req.socket.remoteAddress;
  
  // Store client connection
  clients.set(id, {
    id,
    ip,
    ws,
    userId: null,
    authenticated: false,
    connectedAt: new Date()
  });
  
  logger.info(`WebSocket client connected: ${id} from ${ip}`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    connectionId: id,
    timestamp: new Date().toISOString()
  }));
  
  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.debug(`Received WebSocket message from ${id}:`, data);
      
      // Process message based on type
      switch(data.type) {
        case 'auth':
          // Authentication would be handled here
          break;
          
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
          
        default:
          logger.warn(`Unknown WebSocket message type: ${data.type}`);
      }
    } catch (error) {
      logger.error(`Error processing WebSocket message from ${id}:`, error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    logger.info(`WebSocket client disconnected: ${id}`);
    clients.delete(id);
  });
});

// Broadcast to all clients
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.ws.readyState === 1) { // 1 = OPEN
      client.ws.send(messageStr);
    }
  });
}

// Broadcast to specific user
function broadcastToUser(userId, message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === 1) {
      client.ws.send(messageStr);
    }
  });
}

// API routes
app.use('/api', (req, res, next) => {
  // Add timestamp to all API requests
  req.requestTime = Date.now();
  
  // Log API requests
  logger.debug(`${req.method} ${req.path}`);
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    modules: moduleManager.getLoadedModules().map(m => m.name)
  });
});

// System info endpoint
app.get('/system/info', (req, res) => {
  res.json({
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    dbType: config.database.type,
    modules: moduleManager.getLoadedModules(),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      cpus: require('os').cpus().length,
      memory: {
        total: require('os').totalmem(),
        free: require('os').freemem()
      }
    }
  });
});

// Initialize the system
async function initializeSystem() {
  try {
    logger.info('Initializing system...');
    
    // Check if the configuration was loaded successfully
    if (!configManager.loaded) {
      logger.error('Configuration not loaded');
      process.exit(1);
    }
    
    // Initialize module system
    await moduleManager.initialize();
    
    // Register API routes for each module
    setupModuleRoutes();
    
    // Set up static file serving
    setupStaticServing();
    
    // Error handling middleware
    setupErrorHandling();
    
    // Start listening
    const port = config.server.port || 5000;
    server.listen(port, config.server.host, () => {
      logger.info(`Server running on http://${config.server.host}:${port}`);
      
      // Display loaded modules
      const loadedModules = moduleManager.getLoadedModules();
      logger.info(`Loaded modules (${loadedModules.length}): ${loadedModules.map(m => m.name).join(', ')}`);
    });
  } catch (error) {
    logger.error('Error initializing system:', error);
    process.exit(1);
  }
}

// Set up API routes for each module
function setupModuleRoutes() {
  // Core module API routes
  const coreModule = moduleManager.getModule('core');
  if (coreModule) {
    // Authentication routes
    app.post('/api/auth/login', (req, res) => {
      const { username, password } = req.body;
      
      coreModule.getService('auth').validateUser(username, password)
        .then(user => {
          if (user) {
            req.session.userId = user.id;
            req.session.authenticated = true;
            res.json({
              authenticated: true,
              user: {
                id: user.id,
                username: user.username,
                name: user.name,
                roles: user.roles
              }
            });
          } else {
            res.status(401).json({
              authenticated: false,
              message: 'Invalid username or password'
            });
          }
        })
        .catch(error => {
          logger.error('Authentication error:', error);
          res.status(500).json({
            authenticated: false,
            message: 'Authentication error'
          });
        });
    });
    
    app.post('/api/auth/logout', (req, res) => {
      req.session.destroy();
      res.json({ success: true });
    });
    
    app.get('/api/auth/check', (req, res) => {
      if (req.session.authenticated && req.session.userId) {
        coreModule.getService('auth').getUserById(req.session.userId)
          .then(user => {
            if (user) {
              res.json({
                authenticated: true,
                user: {
                  id: user.id,
                  username: user.username,
                  name: user.name,
                  roles: user.roles
                }
              });
            } else {
              req.session.authenticated = false;
              req.session.userId = null;
              res.json({
                authenticated: false
              });
            }
          })
          .catch(error => {
            logger.error('Auth check error:', error);
            res.status(500).json({
              authenticated: false,
              message: 'Authentication check error'
            });
          });
      } else {
        res.json({
          authenticated: false
        });
      }
    });
    
    // Settings routes
    app.get('/api/settings', (req, res) => {
      res.json(coreModule.getService('settings').getSystemSettings());
    });
  }
  
  // Time tracking module API routes
  const timeTrackingModule = moduleManager.getModule('timeTracking');
  if (timeTrackingModule) {
    const timeTrackingApi = timeTrackingModule.getApi();
    
    app.get('/api/time-entries', (req, res) => {
      const filters = req.query;
      
      timeTrackingApi.getTimeEntries(filters)
        .then(entries => {
          res.json(entries);
        })
        .catch(error => {
          logger.error('Error getting time entries:', error);
          res.status(500).json({
            message: 'Error retrieving time entries',
            error: error.message
          });
        });
    });
    
    app.post('/api/time-entries', (req, res) => {
      const entry = req.body;
      
      timeTrackingApi.createTimeEntry(entry)
        .then(result => {
          res.json(result);
        })
        .catch(error => {
          logger.error('Error creating time entry:', error);
          res.status(500).json({
            message: 'Error creating time entry',
            error: error.message
          });
        });
    });
    
    app.put('/api/time-entries/:id', (req, res) => {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      timeTrackingApi.updateTimeEntry(id, updates)
        .then(result => {
          res.json(result);
        })
        .catch(error => {
          logger.error(`Error updating time entry ${id}:`, error);
          res.status(500).json({
            message: 'Error updating time entry',
            error: error.message
          });
        });
    });
    
    app.delete('/api/time-entries/:id', (req, res) => {
      const id = parseInt(req.params.id);
      
      timeTrackingApi.deleteTimeEntry(id)
        .then(result => {
          res.json(result);
        })
        .catch(error => {
          logger.error(`Error deleting time entry ${id}:`, error);
          res.status(500).json({
            message: 'Error deleting time entry',
            error: error.message
          });
        });
    });
    
    app.get('/api/time-entries/monthly-total/:employeeId', (req, res) => {
      const employeeId = parseInt(req.params.employeeId);
      const yearMonth = req.query.yearMonth || 
                         new Date().toISOString().substring(0, 7); // current YYYY-MM
      
      timeTrackingApi.getMonthlyTotal(employeeId, yearMonth)
        .then(result => {
          res.json(result);
        })
        .catch(error => {
          logger.error(`Error getting monthly total for employee ${employeeId}:`, error);
          res.status(500).json({
            message: 'Error calculating monthly total',
            error: error.message
          });
        });
    });
    
    app.get('/api/time-entries/export', (req, res) => {
      const filters = req.query;
      const format = req.query.format || 'csv';
      
      timeTrackingApi.exportTimeEntries(filters, format)
        .then(result => {
          res.json(result);
        })
        .catch(error => {
          logger.error('Error exporting time entries:', error);
          res.status(500).json({
            message: 'Error exporting time entries',
            error: error.message
          });
        });
    });
  }
  
  // Leave management module API routes would go here
  
  // Reporting module API routes would go here
  
  // Admin module API routes would go here
  
  // Module management routes
  app.get('/api/modules', (req, res) => {
    res.json(moduleManager.getAvailableModules());
  });
  
  app.post('/api/modules/:name/install', (req, res) => {
    const moduleName = req.params.name;
    
    moduleManager.installModule(moduleName)
      .then(success => {
        if (success) {
          res.json({
            success: true,
            message: `Module ${moduleName} installed successfully`
          });
        } else {
          res.status(400).json({
            success: false,
            message: `Failed to install module ${moduleName}`
          });
        }
      })
      .catch(error => {
        logger.error(`Error installing module ${moduleName}:`, error);
        res.status(500).json({
          success: false,
          message: `Error installing module ${moduleName}`,
          error: error.message
        });
      });
  });
  
  app.post('/api/modules/:name/uninstall', (req, res) => {
    const moduleName = req.params.name;
    
    moduleManager.uninstallModule(moduleName)
      .then(success => {
        if (success) {
          res.json({
            success: true,
            message: `Module ${moduleName} uninstalled successfully`
          });
        } else {
          res.status(400).json({
            success: false,
            message: `Failed to uninstall module ${moduleName}`
          });
        }
      })
      .catch(error => {
        logger.error(`Error uninstalling module ${moduleName}:`, error);
        res.status(500).json({
          success: false,
          message: `Error uninstalling module ${moduleName}`,
          error: error.message
        });
      });
  });
}

// Set up static file serving
function setupStaticServing() {
  // Serve frontend from client/dist in production
  if (process.env.NODE_ENV === 'production') {
    const clientPath = path.join(__dirname, 'client/dist');
    
    // Ensure the path exists
    if (fs.existsSync(clientPath)) {
      app.use(express.static(clientPath));
      
      // Serve index.html for all client-side routes
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/system')) {
          return next();
        }
        res.sendFile(path.join(clientPath, 'index.html'));
      });
    } else {
      logger.error(`Client path not found: ${clientPath}`);
    }
  } else {
    // In development, use Vite
    logger.info('Development mode: using Vite for frontend');
    
    // This would integrate with Vite for development
    // Similar to your existing Vite setup in server/vite.ts
  }
}

// Set up error handling
function setupErrorHandling() {
  // 404 handler
  app.use((req, res, next) => {
    if (res.headersSent) {
      return next();
    }
    
    if (req.path.startsWith('/api')) {
      res.status(404).json({
        message: 'API endpoint not found'
      });
    } else {
      next();
    }
  });
  
  // Error handler
  app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    res.status(status).json({ message });
  });
}

// Handle graceful shutdown
function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  
  // Close server
  server.close(() => {
    logger.info('Server closed');
    
    // Perform cleanup
    // ...
    
    process.exit(0);
  });
  
  // Force exit after timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle process signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the system
initializeSystem();