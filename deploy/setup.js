/**
 * Schwarzenberg Tech Time Management System
 * Setup Script
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setup() {
  console.log('🚀 Starting Schwarzenberg Tech Time Management System setup...');
  
  // Ensure data directory exists
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Read config.json if it exists
  let config = {};
  const configPath = path.join(__dirname, 'config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('Error reading config file:', error);
    }
  }
  
  // Ask for configuration options
  config.server = config.server || {};
  config.server.port = await question('Enter server port [5000]: ', config.server.port || '5000');
  config.server.host = await question('Enter server host [0.0.0.0]: ', config.server.host || '0.0.0.0');
  config.server.sessionSecret = config.server.sessionSecret || Math.random().toString(36).substring(2, 15);
  
  // Database configuration
  config.database = config.database || {};
  const dbType = await question('Select database type (sqlite/postgres) [sqlite]: ', config.database.type || 'sqlite');
  config.database.type = dbType.toLowerCase();
  
  if (config.database.type === 'sqlite') {
    config.database.file = await question('Enter SQLite database file path [./data/database.sqlite]: ', 
      config.database.file || './data/database.sqlite');
  } else if (config.database.type === 'postgres') {
    config.database.host = await question('Enter PostgreSQL host [localhost]: ', 
      config.database.host || 'localhost');
    config.database.port = await question('Enter PostgreSQL port [5432]: ', 
      config.database.port || '5432');
    config.database.user = await question('Enter PostgreSQL username [postgres]: ', 
      config.database.user || 'postgres');
    config.database.password = await question('Enter PostgreSQL password: ', 
      config.database.password || '');
    config.database.database = await question('Enter PostgreSQL database name [timemanagement]: ', 
      config.database.database || 'timemanagement');
  }
  
  // Email configuration
  config.email = config.email || {};
  const emailEnabled = await question('Enable email notifications? (yes/no) [yes]: ', 
    config.email.enabled ? 'yes' : 'no');
  config.email.enabled = emailEnabled.toLowerCase() === 'yes';
  
  if (config.email.enabled) {
    config.email.provider = await question('Enter email provider (smtp/sendmail) [smtp]: ', 
      config.email.provider || 'smtp');
    
    if (config.email.provider === 'smtp') {
      config.email.host = await question('Enter SMTP host [smtp.example.com]: ', 
        config.email.host || 'smtp.example.com');
      config.email.port = await question('Enter SMTP port [587]: ', 
        config.email.port || '587');
      config.email.secure = (await question('Use secure connection? (yes/no) [no]: ', 
        config.email.secure ? 'yes' : 'no')).toLowerCase() === 'yes';
      
      config.email.auth = config.email.auth || {};
      config.email.auth.user = await question('Enter SMTP username: ', 
        config.email.auth.user || '');
      config.email.auth.pass = await question('Enter SMTP password: ', 
        config.email.auth.pass || '');
    }
    
    config.email.from = config.email.from || {};
    config.email.from.name = await question('Enter sender name [Time Management System]: ', 
      config.email.from.name || 'Time Management System');
    config.email.from.email = await question('Enter sender email [noreply@example.com]: ', 
      config.email.from.email || 'noreply@example.com');
  }
  
  // Module configuration
  config.modules = config.modules || {
    core: { enabled: true },
    timeTracking: { enabled: true },
    leaveManagement: { enabled: true },
    notifications: { enabled: true },
  };
  
  // Save config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log('✅ Setup completed successfully!');
  console.log('🚀 You can now start the server by running: npm start');
  
  rl.close();
}

function question(prompt, defaultValue) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer || defaultValue);
    });
  });
}

setup().catch(error => {
  console.error('Error during setup:', error);
  rl.close();
});
