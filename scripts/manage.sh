#!/bin/bash

# SalesOS Service Management Script
# Provides easy commands to manage the SalesOS platform

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_banner() {
    echo -e "${BLUE}"
    echo "  ____        _           ___  ____  "
    echo " / ___|  __ _| | ___  ___/ _ \/ ___| "
    echo " \___ \ / _\` | |/ _ \/ __| | | \___ \ "
    echo "  ___) | (_| | |  __/\__ \ |_| |___) |"
    echo " |____/ \__,_|_|\___||___/\___/|____/ "
    echo -e "${NC}"
}

show_help() {
    show_banner
    echo "Service Management Script"
    echo ""
    echo -e "${CYAN}Usage:${NC} $0 <command>"
    echo ""
    echo -e "${CYAN}Commands:${NC}"
    echo "  start         Start all SalesOS services"
    echo "  stop          Stop all SalesOS services"
    echo "  restart       Restart all SalesOS services"
    echo "  status        Show service status"
    echo "  logs          Show backend logs (live)"
    echo "  logs-err      Show error logs only"
    echo "  health        Check API health"
    echo "  build         Build frontend and backend"
    echo "  build-fe      Build frontend only"
    echo "  build-be      Build backend only"
    echo "  migrate       Run database migrations"
    echo "  studio        Open Prisma Studio"
    echo "  dev           Start development servers"
    echo "  dev-fe        Start frontend dev server only"
    echo "  dev-be        Start backend dev server only"
    echo "  backup        Create a full backup"
    echo "  update        Pull latest code and rebuild"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  $0 start       # Start services"
    echo "  $0 logs        # View live logs"
    echo "  $0 health      # Check API health"
    echo ""
}

cmd_start() {
    echo -e "${GREEN}Starting SalesOS services...${NC}"
    cd "$PROJECT_DIR"
    pm2 start ecosystem.config.cjs
    pm2 save
    echo ""
    pm2 list
}

cmd_stop() {
    echo -e "${YELLOW}Stopping SalesOS services...${NC}"
    pm2 stop salesos-backend 2>/dev/null || true
    echo "Services stopped"
}

cmd_restart() {
    echo -e "${GREEN}Restarting SalesOS services...${NC}"
    pm2 restart salesos-backend
    echo ""
    pm2 list
}

cmd_status() {
    echo -e "${CYAN}SalesOS Service Status${NC}"
    echo ""
    pm2 list
    echo ""
    echo -e "${CYAN}System Resources:${NC}"
    pm2 monit --no-interactive 2>/dev/null || pm2 list
}

cmd_logs() {
    echo -e "${CYAN}SalesOS Backend Logs (Ctrl+C to exit)${NC}"
    pm2 logs salesos-backend --lines 100
}

cmd_logs_err() {
    echo -e "${RED}SalesOS Error Logs${NC}"
    pm2 logs salesos-backend --err --lines 200
}

cmd_health() {
    echo -e "${CYAN}Checking API Health...${NC}"
    echo ""

    response=$(curl -s -w "\n%{http_code}" http://localhost:4000/api/health 2>/dev/null)
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)

    if [[ "$http_code" == "200" ]]; then
        echo -e "${GREEN}API Status: HEALTHY${NC}"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo -e "${RED}API Status: UNHEALTHY (HTTP $http_code)${NC}"
        echo "$body"
    fi

    echo ""
    echo -e "${CYAN}Service Info:${NC}"
    pm2 show salesos-backend 2>/dev/null | grep -E "(status|uptime|restarts|memory|cpu)"
}

cmd_build() {
    echo -e "${GREEN}Building SalesOS...${NC}"
    cmd_build_fe
    cmd_build_be
    echo -e "${GREEN}Build complete!${NC}"
}

cmd_build_fe() {
    echo -e "${CYAN}Building frontend...${NC}"
    cd "$PROJECT_DIR"
    npm run build
    echo "Frontend built"
}

cmd_build_be() {
    echo -e "${CYAN}Building backend...${NC}"
    cd "$PROJECT_DIR/api"
    npm run build
    echo "Backend built"
}

cmd_migrate() {
    echo -e "${CYAN}Running database migrations...${NC}"
    cd "$PROJECT_DIR/api"
    npx prisma migrate deploy
    echo "Migrations complete"
}

cmd_studio() {
    echo -e "${CYAN}Opening Prisma Studio...${NC}"
    cd "$PROJECT_DIR/api"
    npx prisma studio
}

cmd_dev() {
    echo -e "${GREEN}Starting development servers...${NC}"
    echo "Frontend: http://localhost:5173"
    echo "Backend: http://localhost:4000"
    echo ""

    # Use tmux if available, otherwise run in background
    if command -v tmux &> /dev/null; then
        tmux new-session -d -s salesos-dev
        tmux send-keys -t salesos-dev "cd $PROJECT_DIR && npm run dev" C-m
        tmux split-window -h -t salesos-dev
        tmux send-keys -t salesos-dev "cd $PROJECT_DIR/api && npm run start:dev" C-m
        tmux attach -t salesos-dev
    else
        echo "Starting backend in background..."
        cd "$PROJECT_DIR/api" && npm run start:dev &
        echo "Starting frontend..."
        cd "$PROJECT_DIR" && npm run dev
    fi
}

cmd_dev_fe() {
    echo -e "${CYAN}Starting frontend dev server...${NC}"
    cd "$PROJECT_DIR"
    npm run dev
}

cmd_dev_be() {
    echo -e "${CYAN}Starting backend dev server...${NC}"
    cd "$PROJECT_DIR/api"
    npm run start:dev
}

cmd_backup() {
    echo -e "${GREEN}Creating backup...${NC}"
    "$SCRIPT_DIR/backup.sh"
}

cmd_update() {
    echo -e "${CYAN}Updating SalesOS...${NC}"

    cd "$PROJECT_DIR"

    echo "Pulling latest code..."
    git pull

    echo "Installing dependencies..."
    npm install
    cd "$PROJECT_DIR/api" && npm install

    echo "Building..."
    cmd_build

    echo "Running migrations..."
    cmd_migrate

    echo "Restarting services..."
    cmd_restart

    echo -e "${GREEN}Update complete!${NC}"
}

# Main
case "${1:-help}" in
    start)      cmd_start ;;
    stop)       cmd_stop ;;
    restart)    cmd_restart ;;
    status)     cmd_status ;;
    logs)       cmd_logs ;;
    logs-err)   cmd_logs_err ;;
    health)     cmd_health ;;
    build)      cmd_build ;;
    build-fe)   cmd_build_fe ;;
    build-be)   cmd_build_be ;;
    migrate)    cmd_migrate ;;
    studio)     cmd_studio ;;
    dev)        cmd_dev ;;
    dev-fe)     cmd_dev_fe ;;
    dev-be)     cmd_dev_be ;;
    backup)     cmd_backup ;;
    update)     cmd_update ;;
    help|--help|-h)
        show_help ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1 ;;
esac
