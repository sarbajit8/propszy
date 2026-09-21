-- Propszy MySQL Database Initialization Script
-- Use this to set up standard MySQL (e.g., Ubuntu EC2, AWS RDS, or local MySQL without XAMPP).
--
-- How to run in Linux / EC2:
--   sudo mysql -u root < init-mysql.sql
--
-- How to run in Windows MySQL:
--   mysql -u root -p < init-mysql.sql

-- 1. Create database with full Unicode UTF-8 support
CREATE DATABASE IF NOT EXISTS `propszy_re`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 2. Create a dedicated application user (replace 'PropszySecure2026!' with your own strong password)
CREATE USER IF NOT EXISTS 'propszy_user'@'localhost' IDENTIFIED BY 'PropszySecure2026!';

-- Allow connections from any host if using an external database or RDS:
-- CREATE USER IF NOT EXISTS 'propszy_user'@'%' IDENTIFIED BY 'PropszySecure2026!';

-- 3. Grant full privileges to the database
GRANT ALL PRIVILEGES ON `propszy_re`.* TO 'propszy_user'@'localhost';
-- GRANT ALL PRIVILEGES ON `propszy_re`.* TO 'propszy_user'@'%';

-- 4. Apply changes
FLUSH PRIVILEGES;

-- Verification
SELECT User, Host FROM mysql.user WHERE User = 'propszy_user';
SHOW DATABASES LIKE 'propszy_re';
