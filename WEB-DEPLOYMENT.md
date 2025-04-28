# Web Deployment Guide

This guide provides instructions for deploying the Schwarzenberg Tech Employee Time Management System to various web hosting platforms.

## Table of Contents

1. [AWS Deployment](#aws-deployment)
2. [Heroku Deployment](#heroku-deployment)
3. [DigitalOcean Deployment](#digitalocean-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Railway Deployment](#railway-deployment)
6. [Render Deployment](#render-deployment)
7. [Database Configuration](#database-configuration)
8. [Security Considerations](#security-considerations)

## Preparing for Web Deployment

Before deploying to any platform, you need to prepare a web-friendly version of the application:

```bash
# Generate the web deployment version
node web-version.js

# Navigate to the web deployment directory
cd web-deploy
```

## AWS Deployment

See the [AWS-DEPLOYMENT.md](AWS-DEPLOYMENT.md) file for detailed AWS deployment instructions.

## Heroku Deployment

### Prerequisites
- Heroku account
- Heroku CLI installed

### Steps

1. **Login to Heroku**:
   ```bash
   heroku login
   ```

2. **Create a new Heroku app**:
   ```bash
   heroku create schwarzenberg-timemanagement
   ```

3. **Add a PostgreSQL database**:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

4. **Configure environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set DB_TYPE=postgres
   heroku config:set SESSION_SECRET=your-secure-session-secret
   ```

5. **Deploy to Heroku**:
   ```bash
   git init
   heroku git:remote -a schwarzenberg-timemanagement
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

6. **Run database migration**:
   ```bash
   heroku run npm run migrate-postgres
   ```

7. **Open the application**:
   ```bash
   heroku open
   ```

## DigitalOcean Deployment

### Prerequisites
- DigitalOcean account
- doctl CLI (optional)

### Steps

1. **Create a new App Platform app in the DigitalOcean dashboard**:
   - Go to Apps in the DigitalOcean console
   - Click "Create App"
   - Connect your GitHub or GitLab repository
   - Select the repository and branch
   - Configure build and run commands:
     - Build Command: `npm install && npm run build`
     - Run Command: `npm start`

2. **Add a PostgreSQL database**:
   - In your app's Resources tab, click "Add Component"
   - Select Database
   - Choose PostgreSQL
   - Select the appropriate plan for your needs

3. **Configure environment variables**:
   - In your app's Settings, go to Environment Variables
   - Add the following variables:
     - NODE_ENV: production
     - DB_TYPE: postgres
     - SESSION_SECRET: your-secure-session-secret
     - DATABASE_URL: ${db.DATABASE_URL} (this automatically uses the connected database)

4. **Deploy the application**:
   - Click "Deploy to Production"

5. **Run database migration**:
   - Use the Console feature in the App Platform to run:
     ```bash
     npm run migrate-postgres
     ```

## Docker Deployment

### Prerequisites
- Docker installed
- Docker Hub account (optional for pushing the image)

### Steps

1. **Build the Docker image**:
   ```bash
   docker build -t schwarzenberg-timemanagement .
   ```

2. **Run the container locally**:
   ```bash
   docker run -p 5000:5000 \
     -e NODE_ENV=production \
     -e DB_TYPE=sqlite \
     -e SESSION_SECRET=your-secure-session-secret \
     schwarzenberg-timemanagement
   ```

3. **For production with PostgreSQL**:
   ```bash
   docker run -p 5000:5000 \
     -e NODE_ENV=production \
     -e DB_TYPE=postgres \
     -e DATABASE_URL=postgresql://username:password@host:port/dbname \
     -e SESSION_SECRET=your-secure-session-secret \
     schwarzenberg-timemanagement
   ```

4. **Push to Docker Hub (optional)**:
   ```bash
   docker tag schwarzenberg-timemanagement yourusername/schwarzenberg-timemanagement
   docker push yourusername/schwarzenberg-timemanagement
   ```

## Railway Deployment

### Prerequisites
- Railway account

### Steps

1. **Create a new project in Railway**:
   - Go to https://railway.app/
   - Create a new project
   - Choose "Deploy from GitHub repo"
   - Select your repository

2. **Add a PostgreSQL database**:
   - Click "New" > "Database" > "PostgreSQL"

3. **Configure environment variables**:
   - Go to the Variables tab of your service
   - Add the following variables:
     - NODE_ENV: production
     - DB_TYPE: postgres
     - SESSION_SECRET: your-secure-session-secret
     - PORT: 5000
     - DATABASE_URL: ${{DATABASE_URL}} (this will be linked to your PostgreSQL instance)

4. **Deploy the application**:
   - Railway will automatically deploy your application
   - You can trigger a redeploy from the Deployments tab if needed

5. **Run database migration**:
   - Go to your service
   - Click on the "Shell" tab
   - Run: `npm run migrate-postgres`

## Render Deployment

### Prerequisites
- Render account

### Steps

1. **Create a new Web Service**:
   - Go to https://render.com/
   - Click "New" > "Web Service"
   - Connect your GitHub or GitLab repository
   - Choose the repository

2. **Configure the web service**:
   - Name: schwarzenberg-timemanagement
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Select an appropriate plan

3. **Add a PostgreSQL database**:
   - Click "New" > "PostgreSQL"
   - Configure the database settings

4. **Configure environment variables**:
   - Go to your web service's Environment tab
   - Add the following variables:
     - NODE_ENV: production
     - DB_TYPE: postgres
     - SESSION_SECRET: your-secure-session-secret
     - DATABASE_URL: (copy from your PostgreSQL service)

5. **Deploy the application**:
   - Render will automatically deploy your application
   - You can manually deploy from the Manual Deploy tab

6. **Run database migration**:
   - Go to your web service's Shell tab
   - Run: `npm run migrate-postgres`

## Database Configuration

### SQLite (for development or small deployments)
- Default configuration uses SQLite
- Data is stored in a file, so ensure the storage is persistent
- Not recommended for high-traffic production environments

### PostgreSQL (recommended for production)
1. **Set environment variables**:
   - DB_TYPE: postgres
   - DATABASE_URL: postgresql://username:password@host:port/dbname

2. **Run migration script**:
   ```bash
   npm run migrate-postgres
   ```

## Security Considerations

1. **Environment Variables**:
   - Always use environment variables for sensitive information
   - Never commit secrets to your repository

2. **Session Security**:
   - Set a strong SESSION_SECRET
   - Configure secure cookies in production

3. **HTTPS**:
   - Always use HTTPS in production
   - Configure automatic redirection from HTTP to HTTPS

4. **Database Security**:
   - Use a secure password for PostgreSQL
   - Restrict database access to your application
   - Enable SSL for database connections

5. **Regular Updates**:
   - Keep dependencies updated
   - Apply security patches promptly

6. **Backups**:
   - Configure regular database backups
   - Test backup restoration procedures