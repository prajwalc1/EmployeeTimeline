#!/bin/bash
# Deployment script for AWS EC2

# Text formatting
BOLD="\033[1m"
RESET="\033[0m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"

echo -e "${BOLD}Schwarzenberg Tech Time Management System - AWS Deployment${RESET}"
echo "========================================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed.${RESET}"
    echo "Please install AWS CLI and configure it with your credentials."
    echo "https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not configured.${RESET}"
    echo "Please run 'aws configure' to set up your AWS credentials."
    exit 1
fi

# Get AWS region
DEFAULT_REGION=$(aws configure get region)
read -p "AWS Region [$DEFAULT_REGION]: " REGION
REGION=${REGION:-$DEFAULT_REGION}

# Get EC2 instance name
read -p "EC2 Instance Name [timemanagement-server]: " INSTANCE_NAME
INSTANCE_NAME=${INSTANCE_NAME:-timemanagement-server}

# Get instance type
read -p "Instance Type [t2.micro]: " INSTANCE_TYPE
INSTANCE_TYPE=${INSTANCE_TYPE:-t2.micro}

# Get SSH key pair name
read -p "SSH Key Pair Name: " KEY_NAME
if [ -z "$KEY_NAME" ]; then
    echo -e "${RED}Error: SSH Key Pair Name is required.${RESET}"
    exit 1
fi

# Get security group
read -p "Security Group ID [create new]: " SECURITY_GROUP
if [ -z "$SECURITY_GROUP" ]; then
    echo "Creating new security group..."
    SECURITY_GROUP=$(aws ec2 create-security-group \
        --group-name "timemanagement-sg" \
        --description "Security group for Time Management System" \
        --query "GroupId" --output text)
    
    echo "Security group created: $SECURITY_GROUP"
    
    # Add inbound rules
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP \
        --protocol tcp \
        --port 5000 \
        --cidr 0.0.0.0/0
fi

# Create user data script
cat > user-data.sh << 'EOL'
#!/bin/bash
# Update system
apt-get update
apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Docker
apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt-get update
apt-get install -y docker-ce

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/timemanagement
cd /opt/timemanagement

# Create directories
mkdir -p data logs backups config

# Create a script to update the application
cat > /opt/timemanagement/update.sh << 'EOF'
#!/bin/bash
cd /opt/timemanagement
git pull
docker-compose down
docker-compose build
docker-compose up -d
EOF

chmod +x /opt/timemanagement/update.sh

# Set up systemd service
cat > /etc/systemd/system/timemanagement.service << 'EOF'
[Unit]
Description=Schwarzenberg Tech Time Management System
After=docker.service
Requires=docker.service

[Service]
WorkingDirectory=/opt/timemanagement
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0
Restart=on-failure
StartLimitIntervalSec=60
StartLimitBurst=3

[Install]
WantedBy=multi-user.target
EOF

systemctl enable timemanagement.service
systemctl start timemanagement.service

# Set up backup cron job
cat > /etc/cron.daily/timemanagement-backup << 'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR=/opt/timemanagement/backups
mkdir -p $BACKUP_DIR
cd /opt/timemanagement
docker-compose exec -T db pg_dump -U postgres timemanagement > $BACKUP_DIR/timemanagement-$DATE.sql
EOF

chmod +x /etc/cron.daily/timemanagement-backup
EOL

# Launch EC2 instance
echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c7217cdde317cfec \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SECURITY_GROUP \
    --user-data file://user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --query "Instances[0].InstanceId" \
    --output text)

echo "Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --output text)

echo -e "${GREEN}EC2 instance deployed successfully!${RESET}"
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo ""
echo -e "${YELLOW}Next steps:${RESET}"
echo "1. SSH into your instance:"
echo "   ssh -i /path/to/$KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo ""
echo "2. Clone your repository:"
echo "   git clone https://github.com/yourusername/timemanagement.git /opt/timemanagement"
echo ""
echo "3. Configure the application:"
echo "   cd /opt/timemanagement"
echo "   cp .env.example .env"
echo "   vi .env  # Edit environment variables"
echo ""
echo "4. Start the application:"
echo "   docker-compose up -d"
echo ""
echo "5. Access the application:"
echo "   http://$PUBLIC_IP:5000"

# Clean up
rm -f user-data.sh