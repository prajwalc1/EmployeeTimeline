/**
 * Schwarzenberg Tech Time Management System
 * Server Test Script - Validates the installation
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('yaml');
const dotenv = require('dotenv');

// Banner
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Schwarzenberg Tech - Time Management System                 ║
║   Server Validation Test                                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';
const CONFIG_FILE = process.env.CONFIG_PATH || './config.yaml';
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

// Test results
const results = {
  node: { status: 'pending', version: null },
  npm: { status: 'pending', version: null },
  config: { status: 'pending', exists: false },
  database: { status: 'pending', type: DB_TYPE, connected: false },
  modules: { status: 'pending', count: 0, list: [] },
  server: { status: 'pending', reachable: false, response: null },
  docker: { status: 'pending', available: false, version: null },
  directories: { status: 'pending', missing: [] }
};

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('Running validation tests...\n');
    
    // Check Node.js
    checkNode();
    
    // Check npm
    checkNpm();
    
    // Check configuration
    checkConfig();
    
    // Check required directories
    checkDirectories();
    
    // Check server
    await checkServer();
    
    // Check Docker
    checkDocker();
    
    // Show results
    showResults();
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

/**
 * Check Node.js version
 */
function checkNode() {
  try {
    const nodeVersion = process.version;
    const versionNum = nodeVersion.substring(1); // Remove the 'v' prefix
    const major = parseInt(versionNum.split('.')[0]);
    
    results.node.version = nodeVersion;
    
    if (major >= 16) {
      results.node.status = 'pass';
      console.log(`✅ Node.js ${nodeVersion} - OK`);
    } else {
      results.node.status = 'fail';
      console.log(`❌ Node.js ${nodeVersion} - Version 16 or higher recommended`);
    }
  } catch (error) {
    results.node.status = 'error';
    console.log('❌ Error checking Node.js version:', error.message);
  }
}

/**
 * Check npm version
 */
function checkNpm() {
  try {
    const npmVersion = execSync('npm --version').toString().trim();
    results.npm.version = npmVersion;
    
    const major = parseInt(npmVersion.split('.')[0]);
    
    if (major >= 6) {
      results.npm.status = 'pass';
      console.log(`✅ npm ${npmVersion} - OK`);
    } else {
      results.npm.status = 'warn';
      console.log(`⚠️ npm ${npmVersion} - Version 6 or higher recommended`);
    }
  } catch (error) {
    results.npm.status = 'error';
    console.log('❌ Error checking npm version:', error.message);
  }
}

/**
 * Check configuration
 */
function checkConfig() {
  try {
    const configPath = path.resolve(CONFIG_FILE);
    
    if (fs.existsSync(configPath)) {
      results.config.exists = true;
      
      // Read and validate config
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.parse(configContent);
      
      let hasErrors = false;
      
      // Check required sections
      const requiredSections = ['server', 'database', 'modules'];
      for (const section of requiredSections) {
        if (!config[section]) {
          console.log(`❌ Missing '${section}' section in config`);
          hasErrors = true;
        }
      }
      
      // Check database config
      if (config.database && !config.database.type) {
        console.log('❌ Missing database type in config');
        hasErrors = true;
      }
      
      // Check server config
      if (config.server && (!config.server.port || !config.server.host)) {
        console.log('❌ Missing server port or host in config');
        hasErrors = true;
      }
      
      // Check module configs
      if (config.modules && !config.modules.core) {
        console.log('❌ Missing core module configuration');
        hasErrors = true;
      }
      
      results.config.status = hasErrors ? 'warn' : 'pass';
      console.log(hasErrors 
        ? '⚠️ Configuration file found but has some issues'
        : '✅ Configuration file - OK');
    } else {
      results.config.status = 'fail';
      console.log(`❌ Configuration file not found: ${configPath}`);
    }
  } catch (error) {
    results.config.status = 'error';
    console.log('❌ Error checking configuration:', error.message);
  }
}

/**
 * Check required directories
 */
function checkDirectories() {
  try {
    const requiredDirs = [
      'data',
      'logs',
      'backups',
      'modules',
      'modules/core',
      'client'
    ];
    
    const missingDirs = [];
    
    for (const dir of requiredDirs) {
      const dirPath = path.resolve(dir);
      if (!fs.existsSync(dirPath)) {
        missingDirs.push(dir);
      }
    }
    
    results.directories.missing = missingDirs;
    
    if (missingDirs.length === 0) {
      results.directories.status = 'pass';
      console.log('✅ Required directories - OK');
    } else {
      results.directories.status = 'warn';
      console.log(`⚠️ Missing directories: ${missingDirs.join(', ')}`);
    }
  } catch (error) {
    results.directories.status = 'error';
    console.log('❌ Error checking directories:', error.message);
  }
}

/**
 * Check server connectivity
 */
async function checkServer() {
  return new Promise((resolve) => {
    try {
      const url = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/health`;
      console.log(`🔍 Checking server at ${url}...`);
      
      const req = http.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              results.server.response = response;
              results.server.reachable = true;
              results.server.status = 'pass';
              
              if (response.modules) {
                results.modules.count = response.modules.length;
                results.modules.list = response.modules;
                results.modules.status = 'pass';
              }
              
              console.log('✅ Server is running and reachable');
              console.log(`✅ Modules loaded: ${results.modules.count}`);
            } catch (error) {
              results.server.status = 'warn';
              results.server.reachable = true;
              console.log('⚠️ Server is running but returned invalid JSON');
            }
          } else {
            results.server.status = 'warn';
            results.server.reachable = true;
            console.log(`⚠️ Server returned status code ${res.statusCode}`);
          }
          
          resolve();
        });
      });
      
      req.on('error', (error) => {
        results.server.status = 'fail';
        results.server.reachable = false;
        
        if (error.code === 'ECONNREFUSED') {
          console.log('❌ Server is not running or not reachable');
        } else {
          console.log('❌ Error connecting to server:', error.message);
        }
        
        resolve();
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        results.server.status = 'fail';
        results.server.reachable = false;
        console.log('❌ Connection to server timed out');
        resolve();
      });
    } catch (error) {
      results.server.status = 'error';
      console.log('❌ Error checking server:', error.message);
      resolve();
    }
  });
}

/**
 * Check Docker availability
 */
function checkDocker() {
  try {
    const dockerOutput = execSync('docker --version').toString().trim();
    results.docker.available = true;
    results.docker.version = dockerOutput;
    results.docker.status = 'pass';
    
    const dockerComposeOutput = execSync('docker-compose --version').toString().trim();
    results.docker.composeVersion = dockerComposeOutput;
    
    console.log(`✅ Docker - ${dockerOutput}`);
    console.log(`✅ Docker Compose - ${dockerComposeOutput}`);
  } catch (error) {
    results.docker.status = 'info';
    console.log('ℹ️ Docker is not installed or not in PATH');
  }
}

/**
 * Show test results
 */
function showResults() {
  console.log('\n===== Test Results =====');
  
  let hasFailures = false;
  let hasWarnings = false;
  
  for (const [category, result] of Object.entries(results)) {
    if (result.status === 'fail' || result.status === 'error') {
      hasFailures = true;
    } else if (result.status === 'warn') {
      hasWarnings = true;
    }
  }
  
  if (hasFailures) {
    console.log('❌ Some critical tests failed. Please fix the issues before proceeding.');
  } else if (hasWarnings) {
    console.log('⚠️ Tests completed with warnings. The application may work but some features might be limited.');
  } else {
    console.log('✅ All tests passed! The system is correctly configured and ready to use.');
  }
  
  console.log('\n===== Next Steps =====');
  
  if (results.server.reachable) {
    console.log('The server is running! Access the application at:');
    console.log(`http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  } else {
    console.log('To start the server:');
    console.log('1. With Docker: docker-compose up -d');
    console.log('2. Without Docker: node modular-server.js');
    console.log('   Or run: ./start.sh');
  }
}

// Run tests
runTests();