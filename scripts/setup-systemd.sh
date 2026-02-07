#!/bin/bash

# Setup PM2 as a systemd service for automatic startup
# This ensures SalesOS starts automatically after system reboot

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check if running as regular user
if [[ $EUID -eq 0 ]]; then
    error "Run this script as a regular user, not root"
fi

log "Setting up PM2 systemd service..."

# Generate startup script
pm2 startup systemd -u $USER --hp $HOME

# The above command outputs a sudo command that needs to be run
# Extract and run it
STARTUP_CMD=$(pm2 startup systemd -u $USER --hp $HOME 2>&1 | grep "sudo" | head -1)

if [[ -n "$STARTUP_CMD" ]]; then
    log "Running startup command..."
    eval "$STARTUP_CMD"
fi

# Save current PM2 process list
log "Saving PM2 process list..."
pm2 save

# Verify
log "Verifying systemd service..."
if systemctl is-enabled pm2-$USER &>/dev/null; then
    log "PM2 service is enabled for auto-start"
else
    warn "PM2 service may not be enabled. Run: sudo systemctl enable pm2-$USER"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "PM2 will now automatically start on system boot."
echo ""
echo "Useful commands:"
echo "  systemctl status pm2-$USER    # Check PM2 service status"
echo "  sudo systemctl restart pm2-$USER  # Restart PM2 service"
echo "  pm2 list                      # List running processes"
echo ""
