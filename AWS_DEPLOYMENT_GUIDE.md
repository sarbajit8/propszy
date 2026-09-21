# Propszy — AWS Deployment Guide (Without XAMPP)

Complete guide for deploying **Propszy** to **Amazon Web Services (AWS)** using standard **Ubuntu Linux**, **Native MySQL 8 / AWS RDS**, **Nginx**, and **PM2**.

---

## Architecture Overview

```
                        Internet (Users & Admins)
                                   │
                                   ▼
                         AWS EC2 (Port 80 / 443)
                                   │
                      ┌────────────┴────────────┐
                      │    Nginx Web Server     │
                      └────────────┬────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
     Static Frontend         Backend API             Media Files
  /var/www/propszy/      http://127.0.0.1:5050      /var/www/propszy/
   frontend/dist/          (Node.js / PM2)          backend/uploads/
                                   │
                                   ▼
                       MySQL 8 (Port 3306)
                   (Local EC2 MySQL or AWS RDS)
```

---

## 1. AWS EC2 Instance & Security Group

### 1.1 Launch Instance
1. Go to **AWS Console → EC2 → Launch Instance**.
2. **Name**: `propszy-production`
3. **AMI**: Ubuntu Server 24.04 LTS or 22.04 LTS (64-bit x86).
4. **Instance Type**:
   - Minimum: `t3.small` (2 vCPU, 2 GB RAM)
   - Recommended for production: `t3.medium` (2 vCPU, 4 GB RAM)
5. **Key Pair**: Create or select an existing `.pem` key pair.
6. **Storage**: At least 30 GB gp3 SSD.

### 1.2 Security Group Rules
Configure your inbound rules in AWS:

| Type | Protocol | Port Range | Source | Purpose |
|---|---|---|---|---|
| **SSH** | TCP | 22 | Your IP / Anywhere | Server SSH access |
| **HTTP** | TCP | 80 | 0.0.0.0/0 | Public web traffic |
| **HTTPS** | TCP | 443 | 0.0.0.0/0 | Encrypted web traffic |

> [!CAUTION]
> **Do NOT expose Port 3306 (MySQL) or Port 5050 (Node.js) to 0.0.0.0/0**. Keep them closed to the outside world; only Nginx and local processes will communicate with them.

---

## 2. Server Setup (One-Shot or Manual)

Connect to your EC2 instance:
```bash
ssh -i /path/to/your-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
```

### Option A: Automated One-Shot Script
Clone your repository and run the automated setup script:
```bash
# Clone the repository
git clone <YOUR-GIT-REPO-URL> /var/www/propszy
cd /var/www/propszy

# Make script executable and run
chmod +x scripts/setup-aws-ubuntu.sh
./scripts/setup-aws-ubuntu.sh
```
*This installs Node.js 20 LTS, MySQL 8, Nginx, PM2, and configures the firewall automatically.*

---

### Option B: Manual Installation
If you prefer installing step-by-step:

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential libssl-dev pkg-config nginx mysql-server

# 2. Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 globally
sudo npm install -g pm2
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -n 1 | sudo bash
```

---

## 3. Database Setup (Normal MySQL — No XAMPP)

Propszy uses **Prisma ORM** which connects to standard MySQL wire protocol on port `3306`.

### Option A: Local MySQL on the same EC2 instance (Standard)
1. Initialize the database and user using the provided `init-mysql.sql`:
```bash
cd /var/www/propszy
sudo mysql < init-mysql.sql
```
*(Creates database `propszy_re` and user `propszy_user` with password `PropszySecure2026!` on `localhost:3306`)*

2. To change the password to your own custom strong password:
```bash
sudo mysql -e "ALTER USER 'propszy_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_HERE';"
```

---

### Option B: Using AWS RDS MySQL
If you are using AWS RDS:
1. In RDS console, ensure your RDS Security Group allows inbound MySQL traffic (Port 3306) from your EC2 Security Group.
2. Connect to RDS once and create the database:
```bash
mysql -h <YOUR-RDS-ENDPOINT> -u <RDS_ADMIN_USER> -p -e "CREATE DATABASE propszy_re CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## 4. Environment Variables Configuration

### 4.1 Backend `.env`
Navigate to the backend directory and copy the production template:
```bash
cd /var/www/propszy/backend
cp .env.production.example .env
nano .env
```

Set your values:
```ini
NODE_ENV=production
PORT=5050
API_PREFIX=/api

# Allowed origins for CORS (your domain or public IP):
CLIENT_ORIGIN=https://propszy.com,https://www.propszy.com

# Database URL for standard MySQL (EC2):
DATABASE_URL="mysql://propszy_user:YOUR_STRONG_PASSWORD_HERE@localhost:3306/propszy_re"

# OR Database URL for AWS RDS:
# DATABASE_URL="mysql://admin:YourRDSPassword@propszy-db.c9xxxx.us-east-1.rds.amazonaws.com:3306/propszy_re?sslaccept=strict"

# Generate 64-character random strings:
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_ACCESS_SECRET=your-random-64-character-access-secret
JWT_REFRESH_SECRET=your-random-64-character-refresh-secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# Cookies:
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax

# Storage:
STORAGE_DRIVER=local
UPLOAD_DIR=uploads
PUBLIC_BASE_URL=https://propszy.com
MAX_UPLOAD_MB=50

# Seed Admin (Used on first setup):
SEED_ADMIN_EMAIL=admin@propszy.com
SEED_ADMIN_PASSWORD=AdminPassword@2026!
SEED_ADMIN_NAME=Propszy Admin
```

---

### 4.2 Frontend `.env`
Navigate to the frontend directory and copy the production template:
```bash
cd /var/www/propszy/frontend
cp .env.production.example .env
nano .env
```

Ensure it contains:
```ini
VITE_API_URL=/api
VITE_UPLOADS_URL=/uploads
```

---

## 5. Database Migration & Seed

Run the single setup command to apply all migrations and seed initial master data:
```bash
cd /var/www/propszy/backend
npm install
npm run db:setup
```

Expected output:
```
Prisma Migrate applied 18 migrations cleanly.
✔ admin: admin@propszy.com
✔ 6 lead statuses
✔ 3 MLM levels
✔ 12 amenities
✔ default settings initialized
```

---

## 6. Build the Frontend

Build the Vite React single-page application:
```bash
cd /var/www/propszy/frontend
npm install
npm run build
```
*This compiles the minified client bundle into `/var/www/propszy/frontend/dist`.*

---

## 7. Start the Backend with PM2

Start the Node.js API cluster in production mode:
```bash
cd /var/www/propszy/backend
pm2 start ecosystem.config.js
pm2 save
```

Verify the API status:
```bash
pm2 status
pm2 logs propszy-backend --lines 20
```

---

## 8. Configure Nginx

Copy the production Nginx configuration:
```bash
sudo cp /var/www/propszy/nginx/propszy.conf /etc/nginx/sites-available/propszy.conf
```

Edit the file and update `server_name` with your domain:
```bash
sudo nano /etc/nginx/sites-available/propszy.conf
```
*Domain preconfigured for `propszy.com www.propszy.com`.*

Enable the site and reload Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/propszy.conf /etc/nginx/sites-enabled/
# Remove default site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 9. Enable HTTPS (Free SSL via Let's Encrypt)

Run Certbot to automatically fetch and install a free SSL certificate:
```bash
sudo certbot --nginx -d propszy.com -d www.propszy.com
```

Certbot will automatically update `/etc/nginx/sites-available/propszy.conf` with HTTPS redirection and SSL certificates that auto-renew every 90 days.

---

## 10. Docker Deployment Alternative

If you prefer running everything in Docker containers:
```bash
cd /var/www/propszy
docker compose up -d --build
```
This boots:
1. `propszy-mysql` (MySQL 8 with persistent volume)
2. `propszy-backend` (Node.js API container)
3. `propszy-frontend` (Nginx + built static frontend on port 80)

---

## 11. Maintenance & Useful Commands

| Task | Command |
|---|---|
| **View API logs** | `pm2 logs propszy-backend` |
| **Restart backend** | `pm2 reload propszy-backend` |
| **Restart Nginx** | `sudo systemctl reload nginx` |
| **Backup MySQL** | `mysqldump -u propszy_user -p propszy_re > backup_$(date +%F).sql` |
| **Update Code** | `git pull && cd frontend && npm run build && cd ../backend && npm run db:migrate && pm2 reload propszy-backend` |
| **Health Check** | `curl http://localhost:5050/health` or `curl https://propszy.com/health` |
