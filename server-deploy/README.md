# Schwarzenberg Tech Time Management System (Server Version)

An Enterprise Employee Time and Leave Management System with modular architecture designed to run on any server environment, from on-premises to cloud platforms like AWS, Google Cloud, or Azure.

## Overview

This application has been redesigned with an Odoo-like architecture to provide:

- **Web-based interface**: Access from any browser, no Windows installation required
- **Modular architecture**: Easy to extend and customize
- **Cloud-ready deployment**: Run on any server environment
- **Multi-tenant support**: Host multiple companies on a single installation
- **Docker support**: Simple containerized deployment
- **Configuration flexibility**: Easy setup and configuration

## Quick Start

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/timemanagement.git
   cd timemanagement
   ```

2. **Run the setup wizard**:
   ```bash
   node setup.js
   ```

3. **Start with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

4. **Access the application** at http://localhost:5000

### Option 2: Direct Node.js Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/timemanagement.git
   cd timemanagement
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the setup wizard**:
   ```bash
   node setup.js
   ```

4. **Start the application**:
   ```bash
   npm start
   ```
   
   Or use the start script:
   ```bash
   ./start.sh
   ```

5. **Access the application** at http://localhost:5000

## Cloud Deployment

This application can be deployed to any cloud provider. For detailed instructions, see [CLOUD-DEPLOYMENT.md](CLOUD-DEPLOYMENT.md).

Quick links:
- [AWS EC2 Deployment](CLOUD-DEPLOYMENT.md#aws-ec2-deployment)
- [Google Cloud Run Deployment](CLOUD-DEPLOYMENT.md#google-cloud-run-deployment)
- [DigitalOcean App Platform Deployment](CLOUD-DEPLOYMENT.md#digitalocean-app-platform-deployment)
- [Azure App Service Deployment](CLOUD-DEPLOYMENT.md#azure-app-service-deployment)

## Feature Highlights

### Core System
- User authentication and authorization
- Role-based access control
- Configuration management
- Multi-language support
- Theme customization

### Time Tracking Module
- Employee time entry and management
- Automatic break calculation
- Project time allocation
- Daily, weekly, and monthly views
- Time rounding and validation rules

### Leave Management Module
- Leave request submission and approval workflow
- Multiple leave types (vacation, sick, etc.)
- Leave balance tracking
- Calendar integration
- Substitution management

### Reporting Module
- Customizable reports
- Export to multiple formats (CSV, Excel, PDF)
- Scheduled report generation
- Visualizations and charts
- Data aggregation and filtering

### Admin Module
- System configuration
- User management
- Data import/export
- Audit logging
- Module management

## Modular Architecture

The system follows an Odoo-inspired modular architecture:

```
├── modules/                  # Module directory
│   ├── core/                 # Core module
│   │   ├── manifest.json     # Module definition
│   │   ├── index.js          # Module entry point
│   │   └── services/         # Module services
│   ├── timeTracking/         # Time tracking module
│   ├── leaveManagement/      # Leave management module
│   └── ...                   # Other modules
├── client/                   # Frontend React application
├── db/                       # Database models and migration
├── config/                   # Configuration files
├── data/                     # Data directory
├── logs/                     # Log files
├── backups/                  # Database backups
├── modular-server.js         # Main server
└── run-server.js             # Entry point script
```

## Configuration

The application can be configured through:

1. **Environment variables** (.env file)
2. **Configuration file** (config.yaml)
3. **Setup wizard** (setup.js)

## Database Options

The system supports both SQLite and PostgreSQL:

- **SQLite**: Good for development or small deployments
- **PostgreSQL**: Recommended for production and multi-user deployments

To migrate from SQLite to PostgreSQL:

```bash
# Set database environment variables
export DB_TYPE=postgres
export DATABASE_URL=postgresql://username:password@host:port/dbname

# Run migration script
node db/postgres-migrate.js
```

## API Documentation

The system provides a comprehensive REST API:

- **Authentication**: `/api/auth/*`
- **Employees**: `/api/employees/*`
- **Time Entries**: `/api/time-entries/*`
- **Leave Requests**: `/api/leave-requests/*`
- **Reports**: `/api/reports/*`
- **Admin**: `/api/admin/*`

## Extending the System

Create new modules by following these steps:

1. Create a new directory in `modules/`
2. Create a `manifest.json` file with module metadata
3. Implement the module in `index.js`
4. Register with the module system

Example manifest.json:
```json
{
  "name": "myModule",
  "version": "1.0.0",
  "description": "My custom module",
  "depends": ["core"],
  "autoInstall": false
}
```

## Production Deployment Tips

- Always use HTTPS in production
- Set up a reverse proxy (NGINX, Apache) in front of the application
- Use a process manager like PM2 for Node.js processes
- Configure automatic backups
- Set up monitoring and logging
- Keep the system updated regularly

## Troubleshooting

Common issues and solutions:

- **Database connection issues**: Check connection string and permissions
- **Port conflicts**: Change the port in config.yaml or .env file
- **Module loading errors**: Check module dependencies
- **Permission issues**: Ensure proper file permissions for data/logs directories

For more help, see the logs in the `logs/` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, contact support@example.com