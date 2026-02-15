# SalesOS

AI-powered Sales CRM and Revenue Intelligence Platform.

## Repository Structure

```
salesos.org/
├── api/                    # NestJS Backend API
│   ├── src/               # API source code
│   ├── prisma/            # Database schema & migrations
│   └── package.json
├── src/                    # React Frontend (app logic)
│   ├── api/               # API client
│   ├── components/        # React components
│   ├── context/           # React contexts
│   ├── hooks/             # Custom hooks
│   └── types/             # TypeScript types
├── pages/                  # Page components
├── components/             # Shared UI components
├── layouts/                # Layout components
├── docs/                   # Documentation site (Next.js)
├── docs-internal/          # Internal project docs & guides
│   ├── guides/            # Admin, navigation, setup guides
│   ├── plans/             # Roadmaps & feature plans
│   ├── seo/               # SEO checklists & guides
│   ├── security/          # Security documentation
│   ├── infrastructure/    # AWS & SSL setup docs
│   └── migration/         # Data migration docs
├── deploy/                 # Deployment & infrastructure configs
│   ├── ecosystem.config.cjs  # PM2 configuration
│   ├── nginx.conf         # Nginx configuration
│   ├── nginx-security.conf# Nginx security headers
│   ├── .htaccess          # Apache configuration
│   └── setup_alb_ssl.sh   # AWS ALB/SSL setup script
├── scripts/                # Operational scripts
│   ├── install.sh         # Fresh installation script
│   ├── backup.sh          # Create backup package
│   ├── manage.sh          # Service management CLI
│   └── setup-systemd.sh   # Auto-start configuration
├── e2e/                    # End-to-end tests (Playwright)
└── public/                 # Static assets
```

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TanStack Query (server state)
- React Router (routing)
- Tailwind CSS (styling)
- Lucide React (icons)

### Backend
- NestJS (Node.js framework)
- Prisma ORM
- PostgreSQL
- Redis (caching)
- Socket.io (real-time)

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis

## Setup

### 1. Frontend

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Run development server
npm run dev

# Build for production
npm run build
```

### 2. Backend

```bash
cd api

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your database credentials and secrets

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build
npm run build

# Start
npm run start:prod
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:4000/api
```

### Backend (api/.env)
```
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/salesos"

# Auth (required in production)
JWT_SECRET=your-jwt-secret
CSRF_SECRET=your-csrf-secret
ENCRYPTION_KEY=your-encryption-key

# Server
PORT=4000
NODE_ENV=production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## PM2 Services

```bash
# Start all services
pm2 start deploy/ecosystem.config.cjs

# Start specific service
pm2 start deploy/ecosystem.config.cjs --only salesos-backend

# View logs
pm2 logs salesos-backend

# Restart
pm2 restart salesos-backend
```

### Services
| Service | Port | Description |
|---------|------|-------------|
| salesos-backend | 4000 | NestJS API |
| salesos-frontend | 3000 | Static frontend (production) |

## Database

- **Database name**: `salesos`
- **ORM**: Prisma
- **Migrations**: `api/prisma/migrations/`

```bash
# Run migrations
cd api && npx prisma migrate deploy

# Open Prisma Studio
cd api && npx prisma studio
```

## API Health Check

```bash
curl http://localhost:4000/api/health
# {"status":"healthy","database":true}
```

## Development

```bash
# Frontend (port 5173)
npm run dev

# Backend (port 4000)
cd api && npm run start:dev

# Run tests
npm test

# Lint
npm run lint
```

## Deployment & Backup

### Fresh Installation (New Server)

```bash
# Clone the repository
git clone <repo-url> /opt/salesos.org
cd /opt/salesos.org

# Run the installation script (installs Node.js, PostgreSQL, Redis, PM2)
./scripts/install.sh
```

### Create Backup Package

```bash
# Creates a complete backup including database
./scripts/backup.sh

# Backup is saved to ~/salesos-backups/
# Output: salesos-backup-YYYYMMDD_HHMMSS.tar.gz
```

### Restore from Backup

```bash
# Extract backup
tar -xzf salesos-backup-*.tar.gz
cd salesos-backup-*

# Run restore script
./restore.sh /opt/salesos.org
```

### Service Management

```bash
# Use the management script for common operations
./scripts/manage.sh help

# Available commands:
./scripts/manage.sh start       # Start services
./scripts/manage.sh stop        # Stop services
./scripts/manage.sh restart     # Restart services
./scripts/manage.sh status      # Show status
./scripts/manage.sh logs        # View live logs
./scripts/manage.sh health      # Check API health
./scripts/manage.sh build       # Build frontend + backend
./scripts/manage.sh migrate     # Run database migrations
./scripts/manage.sh backup      # Create backup
./scripts/manage.sh update      # Pull & rebuild
```

### Auto-Start on Boot

```bash
# Configure PM2 to start automatically on system boot
./scripts/setup-systemd.sh
```

## License

Proprietary - All rights reserved.
