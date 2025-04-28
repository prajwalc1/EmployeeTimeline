FROM node:18-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p data logs backups config

# Set environment to production
ENV NODE_ENV=production

# Expose the port
EXPOSE 5000

# Start the application
CMD ["node", "run-server.js"]