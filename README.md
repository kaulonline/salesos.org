# SalesOS

AI-powered Sales CRM and Revenue Intelligence Platform.

## Repository Structure

```
salesos.org/
├── api/                    # NestJS Backend API
│   ├── src/               # API source code
│   ├── prisma/            # Database schema & migrations
│   └── package.json
├── src/                    # React Frontend
│   ├── api/               # API client
│   ├── components/        # React components
│   ├── context/           # React contexts
│   └── hooks/             # Custom hooks
├── pages/                  # Page components
├── components/             # Shared UI components
├── layouts/                # Layout components
└── ecosystem.config.cjs    # PM2 configuration
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
pm2 start ecosystem.config.cjs

# Start specific service
pm2 start ecosystem.config.cjs --only salesos-backend

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

## License

Proprietary - All rights reserved.
