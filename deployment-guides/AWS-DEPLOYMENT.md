# Deploying Schwarzenberg Tech Employee Time Management System on AWS

This guide provides step-by-step instructions for deploying the Schwarzenberg Tech Employee Time Management System on Amazon Web Services (AWS).

## Prerequisites

- AWS account with appropriate permissions
- Basic knowledge of AWS services
- SSH client (for connecting to EC2 instances)
- Git installed locally

## Option 1: Deploy on EC2 (Virtual Server)

### Step 1: Launch an EC2 Instance

1. Sign in to the AWS Management Console
2. Navigate to EC2 service
3. Click "Launch Instance"
4. Choose a suitable AMI (Amazon Linux 2 or Ubuntu recommended)
5. Select instance type (t2.micro for testing, t2.small or better for production)
6. Configure security groups:
   - Allow SSH (port 22) from your IP
   - Allow HTTP (port 80) from anywhere
   - Allow HTTPS (port 443) from anywhere
   - Allow custom TCP (port 5000) from anywhere (or use a load balancer)
7. Launch the instance with a new or existing key pair
8. Wait for the instance to start

### Step 2: Connect to the EC2 Instance

```bash
# Replace with your key path and instance public DNS
ssh -i /path/to/your-key.pem ec2-user@your-instance-public-dns
```

### Step 3: Install Required Software

```bash
# Update system packages
sudo yum update -y  # Amazon Linux
# or
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -  # Amazon Linux
sudo yum install -y nodejs  # Amazon Linux
# or
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -  # Ubuntu
sudo apt-get install -y nodejs  # Ubuntu

# Install Git
sudo yum install -y git  # Amazon Linux
# or
sudo apt install -y git  # Ubuntu

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 4: Clone and Set Up the Application

```bash
# Create application directory
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

# Clone your repository or copy deployment package
# Option 1: Clone from Git
git clone https://your-repository-url.git .

# Option 2: Upload your deployment package
# (Use SCP to upload the deployment package to the EC2 instance)
# Then extract it:
# tar -xzf your-deployment-package.tar.gz

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
    "port": 5000,
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
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
pm2 save
```

### Step 7: Set Up Nginx as Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
sudo yum install -y nginx  # Amazon Linux
# or
sudo apt install -y nginx  # Ubuntu

# Configure Nginx
sudo cat > /etc/nginx/conf.d/timemanagement.conf << EOL
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

# Test Nginx configuration
sudo nginx -t

# Start Nginx and enable on boot
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 8: Set Up SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx  # Amazon Linux
# or
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu

# Obtain and configure SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Option 2: Deploy Using AWS Elastic Beanstalk

### Step 1: Prepare Application for Elastic Beanstalk

1. Create a file named `.ebextensions/nodecommand.config` with:
```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
```

2. Create a file named `Procfile` with:
```
web: npm start
```

3. Ensure your package.json includes:
```json
"scripts": {
  "start": "node index.js"
}
```

### Step 2: Install and Configure AWS CLI and EB CLI

```bash
# Install AWS CLI
pip install awscli

# Install Elastic Beanstalk CLI
pip install awsebcli

# Configure AWS CLI
aws configure
# Enter your AWS Access Key ID, Secret Access Key, region, and output format
```

### Step 3: Initialize EB Application

```bash
# Navigate to your application directory
cd /path/to/your/app

# Initialize Elastic Beanstalk application
eb init

# Choose your region
# Choose application name
# Select Node.js platform version
# Set up SSH for your instances (optional)
```

### Step 4: Create Environment and Deploy

```bash
# Create and deploy to a new environment
eb create time-management-prod

# Alternatively, deploy to an existing environment
# eb deploy time-management-prod
```

### Step 5: Configure Environment Variables (Optional)

```bash
# Set environment variables
eb setenv NODE_ENV=production PORT=8081 SESSION_SECRET=your-secret
```

### Step 6: Open Application in Browser

```bash
eb open
```

## Option 3: Deploy Using Docker on AWS ECS

### Step 1: Create a Docker Image

1. Ensure your application has a `Dockerfile` (as provided in the deployment package)
2. Build and test the Docker image locally
3. Push the image to Amazon ECR or Docker Hub

### Step 2: Set Up ECS Cluster

1. Navigate to the ECS service in AWS Console
2. Create a new ECS cluster (using Fargate for simplicity)
3. Create a task definition using your Docker image
4. Configure the task to run on port 5000
5. Set environment variables as needed

### Step 3: Create ECS Service

1. Create a new service within your cluster
2. Configure desired number of tasks
3. Set up load balancing if needed
4. Configure auto-scaling rules

### Step 4: Set Up Networking

1. Configure security groups to allow traffic on port 5000
2. Set up an Application Load Balancer (if needed)
3. Configure route to your domain name

## Database Considerations

### Option 1: Continue with SQLite (Simple)
- SQLite database will be stored in the EC2 instance's filesystem
- Works well for small deployments
- Set up regular backups using AWS Backup or custom scripts

### Option 2: Migrate to Amazon RDS (Recommended for Production)
1. Create an Amazon RDS PostgreSQL instance
2. Update the application's config.json to use PostgreSQL:
```json
"database": {
  "type": "postgres",
  "host": "your-rds-endpoint.rds.amazonaws.com",
  "port": 5432,
  "user": "postgres",
  "password": "your-password",
  "database": "timemanagement"
}
```

## Monitoring and Maintenance

1. Set up CloudWatch monitoring for your EC2 instance
2. Configure CloudWatch alarms for CPU, memory, and disk usage
3. Set up log forwarding from your application to CloudWatch Logs
4. Create a backup plan for your data
5. Regularly update the system and application dependencies

## Conclusion

Your Schwarzenberg Tech Employee Time Management System is now deployed on AWS. The application is accessible via your domain name or the EC2 instance's public IP/DNS. You've successfully migrated from the Windows desktop application to a browser-based cloud solution that follows Odoo-like architecture principles.

For additional support, refer to:
- AWS documentation: https://docs.aws.amazon.com/
- Node.js deployment best practices: https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
- PM2 documentation: https://pm2.keymetrics.io/docs/usage/quick-start/