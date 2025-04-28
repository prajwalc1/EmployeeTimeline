#!/bin/bash
# Stop script for Schwarzenberg Tech Time Management System

# Check if using Docker
if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    # Check if Docker containers are running
    if docker-compose ps | grep -q "Up"; then
        echo "Stopping Docker containers..."
        docker-compose down
        echo "Application stopped!"
        exit 0
    fi
fi

# Check if Node.js process is running
PID=$(pgrep -f "node modular-server.js")
if [ -n "$PID" ]; then
    echo "Stopping Node.js application (PID: $PID)..."
    kill $PID
    echo "Application stopped!"
else
    echo "No running application found."
fi