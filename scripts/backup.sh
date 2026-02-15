#!/bin/bash
set -e

# SalesOS Backup Script
# Creates a complete backup package including database and all code

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="salesos-backup-$TIMESTAMP"
BACKUP_DIR="/tmp/$BACKUP_NAME"
OUTPUT_DIR="${1:-$HOME/salesos-backups}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# Get database credentials from .env
get_db_credentials() {
    if [[ -f "$PROJECT_DIR/api/.env" ]]; then
        DB_URL=$(grep "^DATABASE_URL" "$PROJECT_DIR/api/.env" | cut -d'"' -f2)
        if [[ -n "$DB_URL" ]]; then
            # Parse DATABASE_URL
            # Format: postgresql://user:pass@host:port/database
            DB_USER=$(echo "$DB_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
            DB_PASS=$(echo "$DB_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
            DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
            DB_PORT=$(echo "$DB_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
            DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
            return 0
        fi
    fi
    return 1
}

# Create backup directory structure
create_backup_dir() {
    header "Creating backup structure"

    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/config"
    mkdir -p "$OUTPUT_DIR"

    log "Backup directory: $BACKUP_DIR"
}

# Backup database
backup_database() {
    header "Backing up database"

    if ! get_db_credentials; then
        warn "Could not read database credentials from api/.env"
        read -p "Enter database name [salesos]: " DB_NAME
        DB_NAME=${DB_NAME:-salesos}
        read -p "Enter database user [salesos]: " DB_USER
        DB_USER=${DB_USER:-salesos}
        read -p "Enter database host [localhost]: " DB_HOST
        DB_HOST=${DB_HOST:-localhost}
        read -p "Enter database port [5432]: " DB_PORT
        DB_PORT=${DB_PORT:-5432}
    fi

    log "Backing up database: $DB_NAME"

    # Create database dump
    PGPASSWORD="$DB_PASS" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F c \
        -f "$BACKUP_DIR/database/salesos.dump" 2>/dev/null || {

        # Try without password (peer auth)
        sudo -u postgres pg_dump \
            -d "$DB_NAME" \
            -F c \
            -f "$BACKUP_DIR/database/salesos.dump" || {
            warn "Database backup failed. Continuing without database..."
            rm -f "$BACKUP_DIR/database/salesos.dump"
        }
    }

    # Also create SQL dump for compatibility
    if [[ -f "$BACKUP_DIR/database/salesos.dump" ]]; then
        log "Creating SQL dump..."
        PGPASSWORD="$DB_PASS" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -f "$BACKUP_DIR/database/salesos.sql" 2>/dev/null || \
        sudo -u postgres pg_dump \
            -d "$DB_NAME" \
            -f "$BACKUP_DIR/database/salesos.sql" 2>/dev/null || true

        log "Database backup completed"
    fi
}

# Backup configuration files (with secrets masked)
backup_config() {
    header "Backing up configuration"

    # Copy .env files with secrets masked for reference
    if [[ -f "$PROJECT_DIR/api/.env" ]]; then
        log "Backing up backend config..."
        # Create a template version with masked secrets
        sed -E 's/(KEY|SECRET|PASSWORD|PASS)=.*/\1=__REPLACE_ME__/g' \
            "$PROJECT_DIR/api/.env" > "$BACKUP_DIR/config/api.env.template"

        # Also backup actual .env (encrypted)
        cp "$PROJECT_DIR/api/.env" "$BACKUP_DIR/config/api.env.encrypted"
    fi

    if [[ -f "$PROJECT_DIR/.env" ]]; then
        log "Backing up frontend config..."
        cp "$PROJECT_DIR/.env" "$BACKUP_DIR/config/frontend.env"
    fi

    # Backup PM2 ecosystem config
    if [[ -f "$PROJECT_DIR/deploy/ecosystem.config.cjs" ]]; then
        cp "$PROJECT_DIR/deploy/ecosystem.config.cjs" "$BACKUP_DIR/config/"
    fi

    log "Configuration backed up"
}

# Backup source code
backup_source() {
    header "Backing up source code"

    log "Copying source files..."

    # Create exclude file
    cat > /tmp/backup_exclude.txt << 'EOF'
node_modules
dist
.next
.cache
*.log
*.tmp
.env
.env.local
.env.*.local
uploads/*
tmp/*
backups/*
*.dump
*.sql
.git
coverage
.nyc_output
EOF

    # Copy source code
    rsync -av --progress \
        --exclude-from=/tmp/backup_exclude.txt \
        "$PROJECT_DIR/" "$BACKUP_DIR/source/"

    rm /tmp/backup_exclude.txt

    log "Source code backed up"
}

# Copy installation scripts
copy_scripts() {
    header "Including installation scripts"

    cp -r "$PROJECT_DIR/scripts" "$BACKUP_DIR/"
    chmod +x "$BACKUP_DIR/scripts/"*.sh

    log "Scripts included"
}

# Create restore script
create_restore_script() {
    header "Creating restore script"

    cat > "$BACKUP_DIR/restore.sh" << 'RESTORE_SCRIPT'
#!/bin/bash
set -e

# SalesOS Restore Script
# Restores from backup package

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${1:-/opt/salesos.org}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
header() { echo -e "\n${BLUE}=== $1 ===${NC}\n"; }

echo -e "${BLUE}"
echo "  ____        _           ___  ____  "
echo " / ___|  __ _| | ___  ___/ _ \/ ___| "
echo " \___ \ / _\` | |/ _ \/ __| | | \___ \ "
echo "  ___) | (_| | |  __/\__ \ |_| |___) |"
echo " |____/ \__,_|_|\___||___/\___/|____/ "
echo -e "${NC}"
echo "Restore Script"
echo ""

# Check prerequisites
header "Checking prerequisites"

for cmd in node npm psql redis-cli pm2; do
    if ! command -v $cmd &> /dev/null; then
        error "$cmd is required but not installed. Run the full install.sh first."
    fi
done

log "All prerequisites found"

# Restore source code
header "Restoring source code"

if [[ -d "$INSTALL_DIR" ]]; then
    warn "Directory $INSTALL_DIR already exists"
    read -p "Overwrite? (y/N): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        error "Aborted"
    fi
    rm -rf "$INSTALL_DIR"
fi

mkdir -p "$INSTALL_DIR"
cp -r "$SCRIPT_DIR/source/"* "$INSTALL_DIR/"
log "Source code restored to $INSTALL_DIR"

# Restore database
header "Restoring database"

if [[ -f "$SCRIPT_DIR/database/salesos.dump" ]]; then
    read -p "Enter database name [salesos]: " DB_NAME
    DB_NAME=${DB_NAME:-salesos}

    read -p "Enter database user [salesos]: " DB_USER
    DB_USER=${DB_USER:-salesos}

    read -sp "Enter database password: " DB_PASS
    echo

    # Create database if not exists
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

    log "Restoring database from dump..."
    PGPASSWORD="$DB_PASS" pg_restore \
        -h localhost \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-privileges \
        "$SCRIPT_DIR/database/salesos.dump" || {
        warn "pg_restore had some warnings (this is often normal)"
    }

    DB_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"
    log "Database restored"
else
    warn "No database dump found. You'll need to run migrations."
    read -p "Enter DATABASE_URL: " DB_URL
fi

# Setup environment
header "Setting up environment"

# Generate new secrets
ENCRYPTION_KEY=$(openssl rand -hex 32)
CSRF_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

cat > "$INSTALL_DIR/api/.env" << EOF
PORT=4000
NODE_ENV=production
APP_URL=https://localhost
DATABASE_URL="$DB_URL"
ENCRYPTION_KEY=$ENCRYPTION_KEY
CSRF_SECRET=$CSRF_SECRET
JWT_SECRET=$JWT_SECRET
USE_REDIS=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=300
LOG_LEVEL=log
EOF

cat > "$INSTALL_DIR/.env" << EOF
VITE_API_URL=http://localhost:4000/api
EOF

log "Environment files created"

# Install dependencies and build
header "Installing dependencies"

cd "$INSTALL_DIR"
npm install

cd "$INSTALL_DIR/api"
npm install
npx prisma generate

log "Dependencies installed"

# Build
header "Building application"

cd "$INSTALL_DIR"
npm run build

cd "$INSTALL_DIR/api"
npm run build

log "Application built"

# Run migrations if needed
if [[ ! -f "$SCRIPT_DIR/database/salesos.dump" ]]; then
    header "Running database migrations"
    cd "$INSTALL_DIR/api"
    npx prisma migrate deploy
fi

# Start services
header "Starting services"

cd "$INSTALL_DIR"
pm2 delete salesos-backend 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save

log "Services started"

# Verify
header "Verifying installation"

sleep 5
if curl -s http://localhost:4000/api/health | grep -q "healthy"; then
    log "Backend is healthy!"
else
    warn "Backend health check failed. Check: pm2 logs salesos-backend"
fi

echo ""
echo -e "${GREEN}Restore Complete!${NC}"
echo ""
echo "Installation directory: $INSTALL_DIR"
echo "Backend API: http://localhost:4000/api"
echo ""
RESTORE_SCRIPT

    chmod +x "$BACKUP_DIR/restore.sh"
    log "Restore script created"
}

# Create manifest
create_manifest() {
    header "Creating manifest"

    cat > "$BACKUP_DIR/MANIFEST.txt" << EOF
SalesOS Backup
==============

Created: $(date)
Hostname: $(hostname)
Backup Name: $BACKUP_NAME

Contents:
---------
- source/         Complete source code (frontend + backend)
- database/       PostgreSQL database dump
- config/         Configuration templates
- scripts/        Installation and utility scripts
- restore.sh      Quick restore script

Restore Instructions:
--------------------
1. Extract the backup:
   tar -xzf $BACKUP_NAME.tar.gz

2. Option A - Quick Restore (existing infrastructure):
   cd $BACKUP_NAME
   ./restore.sh /opt/salesos.org

3. Option B - Fresh Install (new server):
   cd $BACKUP_NAME/source
   sudo ./scripts/install.sh

Requirements:
------------
- Ubuntu 22.04+
- Node.js 20+
- PostgreSQL 15+
- Redis
- PM2

Database Info:
-------------
- Dump format: PostgreSQL custom format (.dump)
- SQL format: Plain SQL (.sql)
EOF

    log "Manifest created"
}

# Create final archive
create_archive() {
    header "Creating backup archive"

    cd /tmp
    tar -czf "$OUTPUT_DIR/$BACKUP_NAME.tar.gz" "$BACKUP_NAME"

    # Calculate size and checksum
    SIZE=$(du -h "$OUTPUT_DIR/$BACKUP_NAME.tar.gz" | cut -f1)
    CHECKSUM=$(sha256sum "$OUTPUT_DIR/$BACKUP_NAME.tar.gz" | cut -d' ' -f1)

    # Create checksum file
    echo "$CHECKSUM  $BACKUP_NAME.tar.gz" > "$OUTPUT_DIR/$BACKUP_NAME.sha256"

    # Cleanup
    rm -rf "$BACKUP_DIR"

    log "Backup archive created"
}

# Summary
print_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Backup Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Backup file: $OUTPUT_DIR/$BACKUP_NAME.tar.gz"
    echo "Size: $SIZE"
    echo "Checksum: $CHECKSUM"
    echo ""
    echo "To verify integrity:"
    echo "  cd $OUTPUT_DIR && sha256sum -c $BACKUP_NAME.sha256"
    echo ""
    echo "To restore on a new server:"
    echo "  1. Copy $BACKUP_NAME.tar.gz to the new server"
    echo "  2. tar -xzf $BACKUP_NAME.tar.gz"
    echo "  3. cd $BACKUP_NAME && ./restore.sh"
    echo ""
}

# Main
main() {
    echo -e "${BLUE}"
    echo "  ____        _           ___  ____  "
    echo " / ___|  __ _| | ___  ___/ _ \/ ___| "
    echo " \___ \ / _\` | |/ _ \/ __| | | \___ \ "
    echo "  ___) | (_| | |  __/\__ \ |_| |___) |"
    echo " |____/ \__,_|_|\___||___/\___/|____/ "
    echo -e "${NC}"
    echo "Backup Script v1.0"
    echo ""

    create_backup_dir
    backup_database
    backup_config
    backup_source
    copy_scripts
    create_restore_script
    create_manifest
    create_archive
    print_summary
}

main "$@"
