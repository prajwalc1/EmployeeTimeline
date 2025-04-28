# Deploying Schwarzenberg Tech Employee Time Management System on Google Cloud Platform

This guide provides step-by-step instructions for deploying the Schwarzenberg Tech Employee Time Management System on Google Cloud Platform (GCP).

## Prerequisites

- Google Cloud Platform account
- Basic knowledge of Google Cloud services
- gcloud CLI installed locally (optional)
- Git installed locally

## Option 1: Deploy on Compute Engine (Virtual Server)

### Step 1: Create a Compute Engine VM Instance

1. Sign in to the Google Cloud Console
2. Navigate to Compute Engine > VM instances
3. Click "Create Instance"
4. Configure your instance:
   - Name: timemanagement-server
   - Region and Zone: Choose one close to your users
   - Machine type: e2-small (2 vCPU, 2 GB memory) or larger for production
   - Boot disk: Ubuntu 20.04 LTS
   - Allow HTTP and HTTPS traffic
5. Click "Create" to launch the instance
6. Wait for the instance to start

### Step 2: Connect to the VM Instance

1. Click the "SSH" button next to your instance in the Google Cloud Console, or
2. Use the gcloud command:

```bash
gcloud compute ssh timemanagement-server --zone=your-zone
```

### Step 3: Install Required Software

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install -y git

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 4: Clone and Set Up the Application

```bash
# Create application directory
mkdir -p ~/app
cd ~/app

# Clone your repository or copy deployment package
# Option 1: Clone from Git
git clone https://your-repository-url.git .

# Option 2: Upload your deployment package
# You can use gcloud scp to upload:
# gcloud compute scp ./deployment-package.tar.gz timemanagement-server:~/app/ --zone=your-zone
# Then extract it:
# tar -xzf deployment-package.tar.gz

# Install dependencies
npm install --production

# Build the application
npm run build
```

### Step 5: Configure the Application

```bash
# Create configuration file
cat > config.json << EOL
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0",
    "sessionSecret": "$(openssl rand -hex 16)",
    "dataDir": "./data"
  },
  "database": {
    "type": "sqlite",
    "file": "./data/database.sqlite"
  },
  "email": {
    "enabled": true,
    "provider": "smtp",
    "host": "your-smtp-server.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "your-email@example.com",
      "pass": "your-password"
    },
    "from": {
      "name": "Time Management System",
      "email": "noreply@your-domain.com"
    }
  },
  "modules": {
    "core": { "enabled": true },
    "timeTracking": { "enabled": true },
    "leaveManagement": { "enabled": true },
    "notifications": { "enabled": true }
  }
}
EOL

# Create data directory
mkdir -p ./data
```

### Step 6: Start the Application with PM2

```bash
# Start the application with PM2
pm2 start npm --name "timemanagement" -- start

# Configure PM2 to start on system boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp $HOME
pm2 save
```

### Step 7: Set Up Nginx as Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
sudo apt install -y nginx

# Configure Nginx
sudo cat > /etc/nginx/sites-available/timemanagement << EOL
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or VM IP

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

# Enable site
sudo ln -s /etc/nginx/sites-available/timemanagement /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Start Nginx and enable on boot
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 8: Set Up SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and configure SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Option 2: Deploy Using App Engine

### Step 1: Prepare Application for App Engine

1. Create a file named `app.yaml` in your project root:

```yaml
runtime: nodejs18
instance_class: F2

env_variables:
  NODE_ENV: 'production'

handlers:
- url: /.*
  script: auto
```

### Step 2: Install and Configure Google Cloud SDK

```bash
# Follow instructions at https://cloud.google.com/sdk/docs/install

# Initialize SDK
gcloud init

# Select your project
gcloud config set project your-project-id
```

### Step 3: Deploy to App Engine

```bash
# Navigate to your application directory
cd /path/to/your/app

# Deploy to App Engine
gcloud app deploy
```

### Step 4: Open Application in Browser

```bash
gcloud app browse
```

## Option 3: Deploy Using Docker on Google Cloud Run

### Step 1: Create a Docker Image

1. Ensure your application has a `Dockerfile` (as provided in the deployment package)
2. Build and tag the Docker image:

```bash
docker build -t gcr.io/your-project-id/timemanagement:latest .
```

### Step 2: Push to Google Container Registry

```bash
# Configure Docker to use gcloud credentials
gcloud auth configure-docker

# Push the image to GCR
docker push gcr.io/your-project-id/timemanagement:latest
```

### Step 3: Deploy to Cloud Run

```bash
gcloud run deploy timemanagement \
  --image gcr.io/your-project-id/timemanagement:latest \
  --platform managed \
  --allow-unauthenticated \
  --region us-central1 \
  --port 8080
```

## Database Considerations

### Option 1: Continue with SQLite (Simple)
- SQLite database will be stored in the VM's filesystem
- Works well for small deployments
- Set up regular backups using Cloud Storage

### Option 2: Migrate to Cloud SQL (Recommended for Production)
1. Create a Cloud SQL PostgreSQL instance:
   - Navigate to SQL in Google Cloud Console
   - Click "Create Instance"
   - Select PostgreSQL
   - Configure instance (name, password, region)
   - Create database "timemanagement"

2. Update the application's config.json to use PostgreSQL:
```json
"database": {
  "type": "postgres",
  "host": "your-cloudsql-ip",
  "port": 5432,
  "user": "postgres",
  "password": "your-password",
  "database": "timemanagement"
}
```

3. For App Engine and Cloud Run, use Cloud SQL Proxy or connection via private IP

## Monitoring and Maintenance

1. Set up Cloud Monitoring for your Compute Engine instance
2. Configure alerts for CPU, memory, and disk usage
3. Set up log forwarding from your application to Cloud Logging
4. Create a backup plan for your data using Cloud Storage
5. Regularly update the system and application dependencies

## Domain and HTTPS Setup

1. Add your domain to Cloud DNS or your preferred DNS provider
2. Point your domain to your Compute Engine instance or Cloud Run service
3. Configure HTTPS with Google-managed SSL certificates or Let's Encrypt

## Conclusion

Your Schwarzenberg Tech Employee Time Management System is now deployed on Google Cloud Platform. The application is accessible via your domain name or the provided Google Cloud URL. You've successfully migrated from the Windows desktop application to a browser-based cloud solution that follows Odoo-like architecture principles.

For additional support, refer to:
- Google Cloud documentation: https://cloud.google.com/docs
- Node.js on Google Cloud: https://cloud.google.com/nodejs/docs
- PM2 documentation: https://pm2.keymetrics.io/docs/usage/quick-start/