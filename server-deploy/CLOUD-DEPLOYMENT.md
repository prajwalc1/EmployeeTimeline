# Cloud Deployment Guide

This document provides instructions for deploying the Schwarzenberg Tech Time Management System to various cloud providers.

## Table of Contents

1. [AWS EC2 Deployment](#aws-ec2-deployment)
2. [AWS Elastic Beanstalk Deployment](#aws-elastic-beanstalk-deployment)
3. [Google Cloud Run Deployment](#google-cloud-run-deployment)
4. [DigitalOcean App Platform Deployment](#digitalocean-app-platform-deployment)
5. [Azure App Service Deployment](#azure-app-service-deployment)
6. [Heroku Deployment](#heroku-deployment)

## AWS EC2 Deployment

### Automated Deployment

We provide an automated deployment script for AWS EC2:

```bash
# Make the script executable
chmod +x deploy-aws.sh

# Run the deployment script
./deploy-aws.sh
```

The script will:
1. Launch an EC2 instance
2. Install all required dependencies
3. Set up Docker and Docker Compose
4. Configure a systemd service for automatic startup
5. Set up daily database backups

### Manual Deployment

1. Launch an EC2 instance with Amazon Linux 2 or Ubuntu
2. Connect to your instance via SSH
3. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. Install Docker (optional):
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose
   sudo systemctl enable docker
   sudo systemctl start docker
   sudo usermod -aG docker $USER
   ```
5. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/timemanagement.git /opt/timemanagement
   cd /opt/timemanagement
   ```
6. Set up the application:
   ```bash
   cp .env.example .env
   nano .env  # Edit environment variables
   node setup.js
   ```
7. Start the application:
   ```bash
   # With Docker
   docker-compose up -d
   
   # Without Docker
   npm install
   npm start
   ```
8. Set up NGINX as a reverse proxy (recommended):
   ```bash
   sudo apt-get install -y nginx
   sudo nano /etc/nginx/sites-available/timemanagement
   ```
   
   Add the following configuration:
   ```
   server {
       listen 80;
       server_name your_domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/timemanagement /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. Set up SSL with Let's Encrypt (recommended):
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your_domain.com
   ```

## AWS Elastic Beanstalk Deployment

1. Install the EB CLI:
   ```bash
   pip install awsebcli
   ```

2. Initialize EB in your project:
   ```bash
   eb init
   ```

3. Create a `.ebextensions` folder in your project root.

4. Create a configuration file `.ebextensions/nodecommand.config`:
   ```yaml
   option_settings:
     aws:elasticbeanstalk:container:nodejs:
       NodeCommand: "npm start"
     aws:elasticbeanstalk:application:environment:
       NODE_ENV: production
   ```

5. Create a `Procfile` in your project root:
   ```
   web: npm start
   ```

6. Deploy your application:
   ```bash
   eb create production
   ```

7. Open the application:
   ```bash
   eb open
   ```

## Google Cloud Run Deployment

1. Install Google Cloud SDK:
   ```bash
   # Follow instructions at https://cloud.google.com/sdk/docs/install
   ```

2. Initialize Google Cloud:
   ```bash
   gcloud init
   ```

3. Build and deploy with Cloud Build and Cloud Run:
   ```bash
   # Build using Cloud Build
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/timemanagement

   # Deploy to Cloud Run
   gcloud run deploy timemanagement \
     --image gcr.io/YOUR_PROJECT_ID/timemanagement \
     --platform managed \
     --allow-unauthenticated \
     --region us-central1 \
     --set-env-vars="NODE_ENV=production,PORT=8080"
   ```

4. Set up a database:
   ```bash
   # Create a Cloud SQL instance
   gcloud sql instances create timemanagement \
     --database-version=POSTGRES_13 \
     --tier=db-f1-micro \
     --region=us-central1

   # Create a database
   gcloud sql databases create timemanagement --instance=timemanagement

   # Set the root password
   gcloud sql users set-password postgres \
     --instance=timemanagement \
     --password=YOUR_PASSWORD
   ```

5. Connect your Cloud Run service to Cloud SQL:
   ```bash
   gcloud run services update timemanagement \
     --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:timemanagement \
     --set-env-vars="DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost/timemanagement,DB_TYPE=postgres"
   ```

## DigitalOcean App Platform Deployment

1. Create a `app.yaml` file in your project root:
   ```yaml
   name: timemanagement
   services:
   - name: api
     github:
       repo: yourusername/timemanagement
       branch: main
     build_command: npm ci && npm run build
     run_command: npm start
     http_port: 5000
     instance_count: 1
     instance_size_slug: basic-xs
     envs:
     - key: NODE_ENV
       value: production
     - key: DB_TYPE
       value: postgres
     - key: DATABASE_URL
       value: ${db.DATABASE_URL}
   databases:
   - name: db
     engine: pg
     version: "12"
     production: false
   ```

2. Use DigitalOcean CLI or the web UI to deploy:
   ```bash
   doctl apps create --spec app.yaml
   ```

## Azure App Service Deployment

1. Create a file called `.deployment` in your project root:
   ```
   [config]
   command = bash deploy.sh
   ```

2. Create a `deploy.sh` file:
   ```bash
   #!/bin/bash

   # Install dependencies
   npm install

   # Run setup if needed
   if [ ! -f "config.yaml" ]; then
     # Create default config
     cp config.yaml.example config.yaml
   fi

   # Start the application
   npm start
   ```

3. Deploy using Azure CLI:
   ```bash
   az webapp up --name timemanagement --location westeurope --sku F1
   ```

4. Configure environment variables:
   ```bash
   az webapp config appsettings set --name timemanagement --resource-group your-resource-group \
     --settings NODE_ENV=production DB_TYPE=sqlite
   ```

## Heroku Deployment

1. Create a `Procfile` in your project root:
   ```
   web: npm start
   ```

2. Add Heroku PostgreSQL addon:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

3. Deploy to Heroku:
   ```bash
   # Login to Heroku
   heroku login

   # Create a Heroku app
   heroku create timemanagement

   # Push to Heroku
   git push heroku main

   # Open the app
   heroku open
   ```

4. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set DB_TYPE=postgres
   ```

## Additional Considerations

### Database Migration

When migrating from SQLite to PostgreSQL in a production environment:

1. Take a database backup:
   ```bash
   # Export data
   node db/export-data.js > data-backup.json
   ```

2. Change database settings to PostgreSQL:
   ```bash
   # Update .env file
   DB_TYPE=postgres
   DATABASE_URL=postgresql://username:password@host:port/database
   ```

3. Run the migration script:
   ```bash
   node db/postgres-migrate.js
   ```

### Performance Tuning

For high-traffic deployments, consider the following:

1. Increase Node.js memory limit:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

2. Enable clustering to use multiple CPU cores:
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start with PM2
   pm2 start modular-server.js -i max
   ```

3. Set up caching with Redis:
   ```bash
   # Install Redis client
   npm install redis
   
   # Configure Redis connection in .env
   REDIS_URL=redis://localhost:6379
   ```

4. Use a CDN for static assets:
   ```
   # In your NGINX configuration
   location /static/ {
       proxy_pass http://your-cdn-url/;
       expires max;
   }
   ```

### Security Recommendations

1. Always use HTTPS in production
2. Set strong passwords for database access
3. Use environment variables for sensitive information
4. Keep the system updated with security patches
5. Implement appropriate firewall rules
6. Set up regular backups

### Monitoring

Consider setting up monitoring with tools like:

1. PM2 for process monitoring
2. Prometheus and Grafana for metrics
3. ELK Stack for centralized logging
4. New Relic or Datadog for application performance monitoring