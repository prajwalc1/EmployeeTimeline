# Schwarzenberg Tech Time Management System (Odoo-style)

An Enterprise Employee Time and Leave Management System inspired by Odoo's architecture, designed to run on any server environment.

## Features

- **Modular Architecture**: Easily extend functionality with installable modules
- **Web-Based Interface**: Access from any browser, no need for desktop installation
- **Multi-Tenant Support**: Host multiple companies on a single installation
- **Cross-Platform**: Runs on Windows, Linux, macOS, and cloud platforms
- **Flexible Deployment**: Deploy as a standalone application, Docker container, or cloud service
- **Integrated Configuration**: Web-based admin dashboard for system settings
- **Automated Backup**: Scheduled backup and restore functionality

## Core Modules

- **Core**: Base functionality and system services
- **Time Tracking**: Record and manage employee working hours
- **Leave Management**: Handle vacation and sick leave requests
- **Reporting**: Generate reports and export data
- **Admin**: System administration and configuration

## Technical Stack

- **Backend**: Node.js with Express
- **Frontend**: React with TypeScript
- **Database**: SQLite (development) or PostgreSQL (production)
- **ORM**: Drizzle for database interactions
- **API**: RESTful JSON API
- **Real-time**: WebSocket support for notifications
- **Authentication**: Session-based and JWT authentication
- **Containerization**: Docker support for easy deployment

## Deployment Options

### 1. Standalone Server

The application can run on any server with Node.js installed:

```bash
# Clone the repository
git clone https://github.com/your-repo/timemanagement.git

# Navigate to the project
cd timemanagement

# Run the deployment script
node deploy-modular-app.js

# Navigate to the deploy directory
cd deploy

# Install dependencies
npm install

# Run setup
node setup.js

# Start the application
node modular-server.js
```

### 2. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### 3. Cloud Deployment

#### AWS

```bash
# Deploy to EC2
./deploy-aws.sh

# Deploy to Elastic Beanstalk
eb init
eb create production
```

#### Digital Ocean

```bash
# Deploy as App Platform application
doctl apps create --spec app-spec.yaml
```

## Configuration

Configuration is managed through a YAML file and environment variables:

```yaml
# Example config.yaml
server:
  port: 5000
  host: 0.0.0.0
database:
  type: postgres
  postgres:
    url: postgresql://username:password@host:port/dbname
modules:
  core:
    enabled: true
    settings:
      companyName: Schwarzenberg Tech
  timeTracking:
    enabled: true
    settings:
      workingHoursPerDay: 8
```

## Module Development

Extend the system by creating your own modules:

1. Create a new directory in the `modules` folder
2. Create a `manifest.json` file defining your module
3. Implement your module in `index.js`
4. Register with the module system

Example module structure:

```
modules/
  myModule/
    manifest.json
    index.js
    assets/
    data/
```

Example manifest:

```json
{
  "name": "myModule",
  "version": "1.0.0",
  "description": "My custom module",
  "depends": ["core"],
  "autoInstall": false
}
```

## Odoo-style Features

The system implements several Odoo-inspired features:

1. **Module System**: Install, uninstall, and update modules through the admin interface
2. **Configuration Panel**: Web-based settings management
3. **User Management**: Role-based access control
4. **Data Import/Export**: Import and export data in various formats
5. **Multi-company Support**: Manage multiple companies in one installation
6. **Automated Actions**: Schedule actions to run at specific times
7. **Reporting Engine**: Generate custom reports
8. **Email Templates**: Customizable email templates
9. **Workflow Management**: Define custom workflows for business processes
10. **Audit Logging**: Track changes to data

## Database Migration

When moving from SQLite to PostgreSQL:

```bash
# Set up environment variables
export DATABASE_URL=postgresql://username:password@host:port/dbname

# Run migration script
node db/postgres-migrate.ts
```

## Security Considerations

- Use HTTPS in production
- Configure secure session settings
- Set strong passwords for database access
- Use environment variables for sensitive information
- Keep the system updated

## Support and Documentation

For more information and documentation, visit [our website](https://example.com) or contact support@example.com.

## License

This project is licensed under the MIT License - see the LICENSE file for details.