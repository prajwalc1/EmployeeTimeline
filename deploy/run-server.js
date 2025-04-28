/**
 * Schwarzenberg Tech Time Management System
 * Server Entry Point
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Default port and host
const DEFAULT_PORT = 5000;
const DEFAULT_HOST = '0.0.0.0';

function runServer() {
  // Load configuration if exists
  let config = {};
  const configPath = path.join(__dirname, 'config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('Error reading config file:', error);
      createDefaultConfig();
    }
  } else {
    createDefaultConfig();
  }
  
  const port = process.env.PORT || config.server?.port || DEFAULT_PORT;
  const host = process.env.HOST || config.server?.host || DEFAULT_HOST;
  
  // Start the server
  console.log(`Starting Schwarzenberg Tech Time Management System on ${host}:${port}...`);
  
  const server = spawn('node', ['server-deploy/index.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port.toString(),
      HOST: host
    }
  });
  
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    server.kill('SIGTERM');
    process.exit(0);
  });
}

function createDefaultConfig() {
  console.log('Creating default configuration file...');
  
  const defaultConfig = {
    server: {
      port: DEFAULT_PORT,
      host: DEFAULT_HOST,
      sessionSecret: Math.random().toString(36).substring(2, 15),
      dataDir: './data',
    },
    database: {
      type: 'sqlite',
      file: './data/database.sqlite',
    },
    email: {
      enabled: false,
      provider: 'smtp',
      host: 'smtp.example.com',
      port: 587,
      secure: false,
    },
    modules: {
      core: { enabled: true },
      timeTracking: { enabled: true },
      leaveManagement: { enabled: true },
      notifications: { enabled: true },
    },
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'config.json'),
    JSON.stringify(defaultConfig, null, 2)
  );
}

// Run the server
runServer();
