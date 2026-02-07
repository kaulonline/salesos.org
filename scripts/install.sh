#!/bin/bash
set -e

# SalesOS Installation Script for Ubuntu 22.04+
# This script installs all prerequisites and sets up the SalesOS platform

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/salesos-install.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Run as a regular user with sudo privileges."
    fi
}

# Check Ubuntu version
check_ubuntu() {
    if [[ ! -f /etc/os-release ]]; then
        error "Cannot detect OS. This script is designed for Ubuntu."
    fi

    . /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        warn "This script is designed for Ubuntu. Detected: $ID"
    fi
    log "Detected OS: $PRETTY_NAME"
}

# Install Node.js 20
install_nodejs() {
    header "Installing Node.js 20"

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        log "Node.js already installed: $NODE_VERSION"
        if [[ "$NODE_VERSION" == v20* ]] || [[ "$NODE_VERSION" == v21* ]] || [[ "$NODE_VERSION" == v22* ]]; then
            log "Node.js version is compatible"
            return
        fi
        warn "Node.js version may not be compatible. Recommended: v20+"
    fi

    log "Installing Node.js 20 via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

    log "Node.js installed: $(node -v)"
    log "npm installed: $(npm -v)"
}

# Install PostgreSQL
install_postgresql() {
    header "Installing PostgreSQL"

    if command -v psql &> /dev/null; then
        log "PostgreSQL already installed"
        return
    fi

    log "Installing PostgreSQL 15..."
    sudo apt-get install -y postgresql postgresql-contrib

    # Start PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql

    log "PostgreSQL installed and running"
}

# Install Redis
install_redis() {
    header "Installing Redis"

    if command -v redis-cli &> /dev/null; then
        log "Redis already installed"
        return
    fi

    log "Installing Redis..."
    sudo apt-get install -y redis-server

    # Start Redis
    sudo systemctl start redis-server
    sudo systemctl enable redis-server

    log "Redis installed and running"
}

# Install PM2
install_pm2() {
    header "Installing PM2"

    if command -v pm2 &> /dev/null; then
        log "PM2 already installed"
        return
    fi

    log "Installing PM2 globally..."
    sudo npm install -g pm2

    # Setup PM2 startup script
    pm2 startup systemd -u $USER --hp $HOME | tail -1 | sudo bash || true

    log "PM2 installed: $(pm2 -v)"
}

# Setup PostgreSQL database
setup_database() {
    header "Setting up PostgreSQL Database"

    read -p "Enter database name [salesos]: " DB_NAME
    DB_NAME=${DB_NAME:-salesos}

    read -p "Enter database user [salesos]: " DB_USER
    DB_USER=${DB_USER:-salesos}

    read -sp "Enter database password: " DB_PASS
    echo

    if [[ -z "$DB_PASS" ]]; then
        DB_PASS=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
        log "Generated random password for database"
    fi

    # Create user and database
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || warn "User may already exist"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || warn "Database may already exist"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

    # Store connection string
    DB_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"
    echo "$DB_URL" > /tmp/salesos_db_url.txt

    log "Database '$DB_NAME' created with user '$DB_USER'"
    log "Connection URL saved to /tmp/salesos_db_url.txt"
}

# Setup environment files
setup_environment() {
    header "Setting up Environment Files"

    # Read database URL
    if [[ -f /tmp/salesos_db_url.txt ]]; then
        DB_URL=$(cat /tmp/salesos_db_url.txt)
    else
        read -p "Enter DATABASE_URL: " DB_URL
    fi

    # Generate secrets
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    CSRF_SECRET=$(openssl rand -hex 32)
    JWT_SECRET=$(openssl rand -hex 32)

    # Backend .env
    log "Creating backend environment file..."
    cat > "$PROJECT_DIR/api/.env" << EOF
# Server
PORT=4000
NODE_ENV=production
APP_URL=https://localhost

# Database
DATABASE_URL="$DB_URL"

# Security (auto-generated)
ENCRYPTION_KEY=$ENCRYPTION_KEY
CSRF_SECRET=$CSRF_SECRET
JWT_SECRET=$JWT_SECRET

# Redis
USE_REDIS=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=300

# LLM Configuration (configure as needed)
USE_AZURE_OPENAI=false
# AZURE_OPENAI_API_KEY=
# AZURE_OPENAI_ENDPOINT=
# AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Logging
LOG_LEVEL=log
EOF

    # Frontend .env
    log "Creating frontend environment file..."
    cat > "$PROJECT_DIR/.env" << EOF
VITE_API_URL=http://localhost:4000/api
EOF

    log "Environment files created"
    warn "Remember to configure additional API keys in api/.env as needed"
}

# Install dependencies
install_dependencies() {
    header "Installing Dependencies"

    cd "$PROJECT_DIR"

    log "Installing frontend dependencies..."
    npm install

    log "Installing backend dependencies..."
    cd "$PROJECT_DIR/api"
    npm install

    cd "$PROJECT_DIR"
    log "All dependencies installed"
}

# Build application
build_application() {
    header "Building Application"

    cd "$PROJECT_DIR"

    log "Building frontend..."
    npm run build

    log "Building backend..."
    cd "$PROJECT_DIR/api"
    npm run build

    log "Generating Prisma client..."
    npx prisma generate

    cd "$PROJECT_DIR"
    log "Application built successfully"
}

# Run database migrations
run_migrations() {
    header "Running Database Migrations"

    cd "$PROJECT_DIR/api"

    log "Running Prisma migrations..."
    npx prisma migrate deploy

    cd "$PROJECT_DIR"
    log "Migrations completed"
}

# Setup PM2 services
setup_services() {
    header "Setting up PM2 Services"

    cd "$PROJECT_DIR"

    log "Starting SalesOS services..."
    pm2 start ecosystem.config.cjs

    log "Saving PM2 configuration..."
    pm2 save

    log "Services started"
    pm2 list
}

# Verify installation
verify_installation() {
    header "Verifying Installation"

    sleep 5  # Wait for services to start

    log "Checking backend health..."
    if curl -s http://localhost:4000/api/health | grep -q "healthy"; then
        log "Backend is healthy!"
    else
        warn "Backend health check failed. Check logs with: pm2 logs salesos-backend"
    fi

    log "\n${GREEN}Installation Complete!${NC}"
    echo ""
    echo "Quick Start Commands:"
    echo "  pm2 list                    - View running services"
    echo "  pm2 logs salesos-backend    - View backend logs"
    echo "  pm2 restart all             - Restart all services"
    echo ""
    echo "URLs:"
    echo "  Backend API: http://localhost:4000/api"
    echo "  Health Check: http://localhost:4000/api/health"
    echo ""
    echo "Configuration files:"
    echo "  Frontend: $PROJECT_DIR/.env"
    echo "  Backend:  $PROJECT_DIR/api/.env"
}

# Main installation
main() {
    clear
    echo -e "${BLUE}"
    echo "  ____        _           ___  ____  "
    echo " / ___|  __ _| | ___  ___/ _ \/ ___| "
    echo " \___ \ / _\` | |/ _ \/ __| | | \___ \ "
    echo "  ___) | (_| | |  __/\__ \ |_| |___) |"
    echo " |____/ \__,_|_|\___||___/\___/|____/ "
    echo -e "${NC}"
    echo "AI-powered Sales CRM Platform"
    echo "Installation Script v1.0"
    echo ""

    check_root
    check_ubuntu

    header "Updating System Packages"
    sudo apt-get update
    sudo apt-get install -y curl git build-essential

    install_nodejs
    install_postgresql
    install_redis
    install_pm2

    setup_database
    setup_environment
    install_dependencies
    build_application
    run_migrations
    setup_services
    verify_installation
}

# Run main function
main "$@"
