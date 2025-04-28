# Deploying Schwarzenberg Tech Employee Time Management System on Microsoft Azure

This guide provides step-by-step instructions for deploying the Schwarzenberg Tech Employee Time Management System on Microsoft Azure.

## Prerequisites

- Microsoft Azure account
- Basic knowledge of Azure services
- Azure CLI installed locally (optional)
- Git installed locally

## Option 1: Deploy on Azure Virtual Machines

### Step 1: Create an Azure Virtual Machine

1. Sign in to the Azure Portal (https://portal.azure.com)
2. Click "Create a resource" and search for "Virtual Machine"
3. Configure your VM:
   - Subscription: Select your subscription
   - Resource group: Create new or use existing
   - Virtual machine name: timemanagement-server
   - Region: Choose one close to your users
   - Image: Ubuntu Server 20.04 LTS
   - Size: Standard B2s (2 vCPU, 4 GB memory) or larger for production
   - Authentication: Password or SSH key
   - Inbound port rules: Allow SSH (22), HTTP (80), and HTTPS (443)
4. Complete the remaining wizard steps with default settings
5. Review and create the VM
6. Wait for deployment to complete

### Step 2: Connect to the VM

Use SSH to connect to your VM:

```bash
ssh azureuser@your-vm-ip
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

# Option 2: Upload your deployment package using SCP
# scp ./deployment-package.tar.gz azureuser@your-vm-ip:~/app/
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
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u azureuser --hp /home/azureuser
pm2 save
```

### Step 7: Set Up Nginx as Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Configure Nginx
sudo tee /etc/nginx/sites-available/timemanagement > /dev/null << EOL
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

### Step 8: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and configure SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Step 9: Configure Azure Network Security Group

1. In the Azure Portal, navigate to your VM
2. Click on "Networking" under Settings
3. Add inbound port rules for HTTP (80) and HTTPS (443) if not already done
4. Save the changes

## Option 2: Deploy Using Azure App Service

### Step 1: Prepare Your Application

1. Make sure your application listens on the port provided by the environment variable `PORT`:

Update your server code to use:
```javascript
const port = process.env.PORT || 8080;
```

2. Create a `web.config` file in your project root:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <webSocket enabled="false" />
    <handlers>
      <add name="iisnode" path="index.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^index.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="dist/public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="index.js"/>
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <remove segment="bin"/>
        </hiddenSegments>
      </requestFiltering>
    </security>
    <httpErrors existingResponse="PassThrough" />
  </system.webServer>
</configuration>
```

### Step 2: Create Azure App Service Using Azure Portal

1. Sign in to the Azure Portal
2. Click "Create a resource" and search for "Web App"
3. Configure the web app:
   - Subscription: Select your subscription
   - Resource Group: Create new or use existing
   - Name: timemanagement-app (must be unique across Azure)
   - Publish: Code
   - Runtime stack: Node.js 18 LTS
   - Operating System: Linux
   - Region: Choose one close to your users
   - App Service Plan: Create new or select existing
   - SKU and size: B1 (min for production) or higher
4. Click "Review + create"
5. Review and create the app service
6. Wait for deployment to complete

### Step 3: Configure Deployment Settings

1. Navigate to your App Service in Azure Portal
2. Go to "Deployment Center"
3. Select your source control system (GitHub, Azure Repos, or other)
4. Configure the connection and repository details
5. Complete the wizard to set up continuous deployment

Alternatively, use Azure CLI for deployment:

```bash
# Install Azure CLI if not already installed
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login to Azure
az login

# Set the subscription
az account set --subscription <your-subscription-id>

# Create a ZIP package of your application
npm run build
zip -r app.zip . -x "node_modules/*" ".git/*"

# Deploy to App Service
az webapp deployment source config-zip --resource-group <your-resource-group> --name timemanagement-app --src app.zip
```

### Step 4: Configure Application Settings

1. In the Azure Portal, navigate to your App Service
2. Go to "Configuration" under Settings
3. Add these application settings:
   - NODE_ENV: production
   - SESSION_SECRET: [generate a random string]
   - DATABASE_TYPE: sqlite (or postgres if using Azure Database)
   - DATABASE_FILE_PATH: data/database.sqlite
   - EMAIL_ENABLED: true
   - EMAIL_HOST: your-smtp-server.com
   - EMAIL_PORT: 587
   - EMAIL_SECURE: false
   - EMAIL_USER: your-email@example.com
   - EMAIL_PASS: your-password
   - EMAIL_FROM_NAME: Time Management System
   - EMAIL_FROM_EMAIL: noreply@your-domain.com
4. Save the settings

### Step 5: Configure Custom Domain and SSL (Optional)

1. In the Azure Portal, navigate to your App Service
2. Go to "Custom domains" under Settings
3. Click "Add custom domain"
4. Follow the wizard to add your domain and configure SSL

## Option 3: Deploy Using Azure Container Apps

### Step 1: Create a Docker Image for Your Application

1. Ensure your application has a `Dockerfile` (as provided in the deployment package)
2. Build the Docker image:

```bash
docker build -t timemanagement:latest .
```

### Step 2: Push to Azure Container Registry (ACR)

First, create an Azure Container Registry:

```bash
# Create a resource group (if not already created)
az group create --name timemanagement-rg --location eastus

# Create an Azure Container Registry
az acr create --resource-group timemanagement-rg --name timemanagementacr --sku Basic

# Log in to the registry
az acr login --name timemanagementacr

# Tag your image
docker tag timemanagement:latest timemanagementacr.azurecr.io/timemanagement:latest

# Push the image
docker push timemanagementacr.azurecr.io/timemanagement:latest
```

### Step 3: Deploy to Azure Container Apps

```bash
# Create Container App environment
az containerapp env create \
  --name timemanagement-env \
  --resource-group timemanagement-rg \
  --location eastus

# Create Container App
az containerapp create \
  --name timemanagement-app \
  --resource-group timemanagement-rg \
  --environment timemanagement-env \
  --image timemanagementacr.azurecr.io/timemanagement:latest \
  --target-port 8080 \
  --ingress external \
  --registry-server timemanagementacr.azurecr.io \
  --registry-username timemanagementacr \
  --registry-password $(az acr credential show -n timemanagementacr --query "passwords[0].value" -o tsv)
```

## Database Considerations

### Option 1: Continue with SQLite (Simple)
- SQLite database will be stored in the VM's or App Service's filesystem
- Works well for small deployments
- Set up regular backups using Azure Blob Storage

### Option 2: Migrate to Azure Database for PostgreSQL (Recommended for Production)

1. Create an Azure Database for PostgreSQL:
   - In the Azure Portal, click "Create a resource"
   - Search for "Azure Database for PostgreSQL"
   - Select "Single server" or "Flexible server" (recommended)
   - Fill in the required details
   - Complete the wizard to create the database

2. Configure server firewall:
   - Navigate to your PostgreSQL server in Azure Portal
   - Go to "Connection security"
   - Add your client IP address or allow Azure services
   - Save the changes

3. Create the database:
   - Connect to the PostgreSQL server
   - Create a new database named "timemanagement"

4. Update the application's config.json to use PostgreSQL:
```json
"database": {
  "type": "postgres",
  "host": "your-postgres-server.postgres.database.azure.com",
  "port": 5432,
  "user": "your-username@your-postgres-server",
  "password": "your-password",
  "database": "timemanagement",
  "ssl": true
}
```

## Storage Considerations

### Using Azure Blob Storage for File Storage

If your application needs to store files (like attachments or exports), consider using Azure Blob Storage:

1. Create a Storage Account:
   - In the Azure Portal, click "Create a resource"
   - Search for "Storage account"
   - Fill in the required details
   - Complete the wizard to create the storage account

2. Create a container for your application files
3. Update your application to use Azure Blob Storage for file storage

## Monitoring and Maintenance

### Application Insights

1. In the Azure Portal, navigate to your resource
2. Go to "Application Insights" under Settings
3. Click "Turn on Application Insights"
4. Follow the wizard to enable monitoring

### Azure Monitor

1. In the Azure Portal, navigate to your resource
2. Go to "Metrics" or "Logs" under Monitoring
3. Configure alerts for important metrics

### Backup Strategy

1. For Virtual Machines, use Azure Backup:
   - In the Azure Portal, navigate to your VM
   - Go to "Backup" under Operations
   - Configure backup settings

2. For databases, use the automated backup feature of Azure Database for PostgreSQL

## Microsoft Integrations

### Office 365 / Exchange Email Integration

If your organization uses Microsoft Office 365, you can integrate your application with Exchange for email notifications:

```json
"email": {
  "enabled": true,
  "provider": "smtp",
  "host": "smtp.office365.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "your-office365-email@yourdomain.com",
    "pass": "your-password"
  },
  "from": {
    "name": "Time Management System",
    "email": "your-office365-email@yourdomain.com"
  }
}
```

### Azure Active Directory Integration (Single Sign-On)

For enterprise deployments, consider integrating with Azure Active Directory for authentication:

1. Register your application in Azure AD
2. Implement the authentication flow in your application
3. Update your configuration to use Azure AD authentication

## Conclusion

Your Schwarzenberg Tech Employee Time Management System is now deployed on Microsoft Azure. The application is accessible via your domain name or the provided Azure URL. You've successfully migrated from the Windows desktop application to a browser-based cloud solution that follows Odoo-like architecture principles and integrates with Microsoft services.

For additional support, refer to:
- Azure documentation: https://docs.microsoft.com/en-us/azure/
- Node.js on Azure: https://docs.microsoft.com/en-us/azure/app-service/quickstart-nodejs
- PM2 documentation: https://pm2.keymetrics.io/docs/usage/quick-start/