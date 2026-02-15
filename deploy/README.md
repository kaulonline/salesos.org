# Deployment & Infrastructure Configuration

Server and deployment configuration files for SalesOS.

## Files

| File | Purpose |
|------|---------|
| `ecosystem.config.cjs` | PM2 process manager configuration |
| `nginx.conf` | Nginx web server configuration |
| `nginx-security.conf` | Nginx security headers & rate limiting |
| `.htaccess` | Apache web server configuration (alternative) |
| `setup_alb_ssl.sh` | AWS ALB + SSL/TLS setup script |

## Usage

### PM2 (from project root)
```bash
pm2 start deploy/ecosystem.config.cjs
pm2 restart salesos-frontend
pm2 restart salesos-backend
```

### Nginx
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/salesos
sudo ln -s /etc/nginx/sites-available/salesos /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```
