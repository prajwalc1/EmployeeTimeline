# Schwarzenberg Tech Time Management System - Deployment Guide

This guide provides instructions for deploying the Schwarzenberg Tech Time Management System to various cloud environments.

## Prerequisites

- Node.js 18 or later
- npm 8 or later
- (Optional) Docker and Docker Compose for containerized deployment

## Standard Deployment

1. Extract the deployment package to your server.
2. Navigate to the extracted directory.
3. Run the setup script:
   ```bash
   node setup.js
   ```
4. Follow the prompts to configure the application.
5. Start the application:
   ```bash
   npm start
   ```

## Docker Deployment

1. Extract the deployment package to your server.
2. Navigate to the extracted directory.
3. (Optional) Edit the `config.json` file to configure the application.
4. Build and start the Docker containers:
   ```bash
   docker-compose up -d
   ```

## AWS Deployment

### Using EC2

1. Launch an EC2 instance with Amazon Linux 2 or Ubuntu.
2. Connect to the instance using SSH.
3. Install Node.js:
   ```bash
   # For Amazon Linux 2
   curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs

   # For Ubuntu
   curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. Upload the deployment package to the instance.
5. Extract the package and follow the Standard Deployment steps above.

### Using Elastic Beanstalk

1. Create a new Elastic Beanstalk application.
2. Choose the Node.js platform.
3. Upload the deployment package as a ZIP file.
4. Configure environment variables in the Elastic Beanstalk console.

## Google Cloud Deployment

### Using Compute Engine

1. Create a new VM instance.
2. Connect to the instance using SSH.
3. Install Node.js:
   ```bash
   curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. Upload the deployment package to the instance.
5. Extract the package and follow the Standard Deployment steps above.

### Using App Engine

1. Ensure you have the Google Cloud SDK installed.
2. Create a new `app.yaml` file in the deployment directory:
   ```yaml
   runtime: nodejs18
   instance_class: F2
   ```
3. Deploy the application:
   ```bash
   gcloud app deploy
   ```

## Configuration

The application can be configured by editing the `config.json` file. The following options are available:

### Server Configuration

- `port`: The port on which the application will listen.
- `host`: The host address to bind to.
- `sessionSecret`: A secret string used to sign session cookies.
- `dataDir`: The directory where application data will be stored.

### Database Configuration

- `type`: The database type (`sqlite` or `postgres`).
- `file`: The path to the SQLite database file (for SQLite only).
- `host`: The PostgreSQL host address (for PostgreSQL only).
- `port`: The PostgreSQL port (for PostgreSQL only).
- `user`: The PostgreSQL username (for PostgreSQL only).
- `password`: The PostgreSQL password (for PostgreSQL only).
- `database`: The PostgreSQL database name (for PostgreSQL only).

### Email Configuration

- `enabled`: Whether email notifications are enabled.
- `provider`: The email provider (`smtp` or `sendmail`).
- `host`: The SMTP host address (for SMTP only).
- `port`: The SMTP port (for SMTP only).
- `secure`: Whether to use a secure connection (for SMTP only).
- `auth.user`: The SMTP username (for SMTP only).
- `auth.pass`: The SMTP password (for SMTP only).
- `from.name`: The sender name.
- `from.email`: The sender email address.

## Troubleshooting

### Application won't start

- Check that Node.js is installed and is version 18 or later.
- Check that the port specified in the configuration is available.
- Check the logs for errors:
  ```bash
  npm start > app.log 2>&1
  ```

### Database connection issues

- For SQLite, check that the data directory is writable.
- For PostgreSQL, check that the database is running and accessible.
- Check that the database credentials are correct.

### Email notifications aren't being sent

- Check that email notifications are enabled in the configuration.
- Check that the SMTP settings are correct.
- Check that the SMTP server is accessible from the application server.

## Support

For support, please contact Schwarzenberg Tech at support@example.com.
