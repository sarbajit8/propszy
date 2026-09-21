#!/usr/bin/env bash
# ==============================================================================
# Propszy — AWS EC2 (Ubuntu 22.04 / 24.04 LTS) One-Shot Setup Script
# Run this on your clean EC2 instance as a non-root sudo user:
#   chmod +x scripts/setup-aws-ubuntu.sh
#   ./scripts/setup-aws-ubuntu.sh
# ==============================================================================

set -euo pipefail

echo "=========================================================="
echo " Starting Propszy AWS EC2 Server Setup"
echo "=========================================================="

# 1. Update system packages
echo "[1/7] Updating apt packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential libssl-dev pkg-config

# 2. Install Node.js 20 LTS (NodeSource)
echo "[2/7] Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "Node: $(node -v) | NPM: $(npm -v)"

# 3. Install and configure MySQL 8 (Native, No XAMPP)
echo "[3/7] Installing MySQL Server..."
sudo apt install -y mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql

# Run initial MySQL database creation
DB_NAME="propszy_re"
DB_USER="propszy_user"
DB_PASS="PropszySecure2026!"

echo "Setting up MySQL database: $DB_NAME and user: $DB_USER..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
echo "MySQL database and user configured successfully!"

# 4. Install Nginx and Certbot
echo "[4/7] Installing Nginx & Certbot..."
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 5. Install PM2 process manager
echo "[5/7] Installing PM2 globally..."
sudo npm install -g pm2
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -n 1 | sudo bash || true

# 6. Configure Firewall (UFW)
echo "[6/7] Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
# Do NOT expose MySQL port 3306 or Node port 5050 publicly:
sudo ufw deny 3306/tcp || true
sudo ufw deny 5050/tcp || true
echo "y" | sudo ufw enable || true

# 7. Summary
echo "=========================================================="
echo " Server Setup Complete!"
echo "=========================================================="
echo "Next Steps to deploy Propszy:"
echo "1. Configure .env in backend/ (using .env.production.example)"
echo "2. Configure .env in frontend/ (using .env.production.example)"
echo "3. Run database migrations: cd backend && npm run db:setup"
echo "4. Build frontend: cd frontend && npm install && npm run build"
echo "5. Start backend with PM2: cd backend && pm2 start ecosystem.config.js"
echo "6. Link Nginx site config: sudo cp nginx/propszy.conf /etc/nginx/sites-available/"
echo "   sudo ln -s /etc/nginx/sites-available/propszy.conf /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo "7. (Optional) Setup SSL certificate: sudo certbot --nginx -d propszy.com -d www.propszy.com"
echo "=========================================================="
