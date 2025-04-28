#!/bin/bash
# Start script for Schwarzenberg Tech Time Management System

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check if config exists
if [ ! -f "config.yaml" ]; then
    echo "Configuration file not found. Running setup..."
    node setup.js
fi

# Check if environment file exists
if [ ! -f ".env" ]; then
    echo "Environment file not found. Creating from example..."
    cp .env.example .env
    echo "Please edit .env file with your settings before starting the application."
    exit 1
fi

# Create required directories
mkdir -p data logs backups config

# Check if using Docker
if command -v docker-compose &> /dev/null; then
    read -p "Would you like to use Docker? (y/n) " use_docker
    if [[ $use_docker =~ ^[Yy]$ ]]; then
        echo "Starting application with Docker..."
        docker-compose up -d
        echo "Application started! Access at http://localhost:5000"
        exit 0
    fi
fi

# Start with Node.js
echo "Starting Schwarzenberg Tech Time Management System..."
node modular-server.js