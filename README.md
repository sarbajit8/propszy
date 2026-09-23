# Propszy — Real Estate Project & Property Listing Platform

Full-stack platform for managing **Projects** (townships/societies) and **Properties/Units** under them,
with three roles — **Admin**, **Agent** (MLM referral hierarchy) and **Customer** — plus a
**lead + commission engine** driven by project-wise commission rules.

## Tech Stack

| Layer     | Choice |
|-----------|--------|
| Backend   | Node.js + Express (REST), Prisma ORM |
| Database  | Standard MySQL 8 (port 3306) / AWS RDS (or local XAMPP in dev) |
| Auth      | JWT access + refresh tokens, RBAC |
| Frontend  | React (Vite) + React Router + Redux Toolkit + React Query + Tailwind CSS |
| Media     | Local disk in dev (`/uploads`), pluggable AWS S3 adapter |
| Maps      | Google Maps JS API (`@react-google-maps/api`) |
| Charts    | Recharts |
| Tree view | `react-d3-tree` |

Theme: **violet** (Tailwind `violet` palette, primary `#7c3aed`).

## AWS Deployment Guide

For full step-by-step instructions to deploy on AWS (EC2 / RDS) with standard MySQL, Nginx, PM2, and SSL without XAMPP, see:
👉 **[AWS_DEPLOYMENT_GUIDE.md](AWS_DEPLOYMENT_GUIDE.md)**

---

## Prerequisites (Local Development)

- **MySQL 8** (standard MySQL on `localhost:3306` or XAMPP on `localhost:3307`).
- **Node.js** — v20+ or v24 LTS (npm 10+).

## Database Setup (Standard MySQL — No XAMPP)

Run the included initialization script:
```bash
mysql -u root -p < init-mysql.sql
```
Or create it manually:
```sql
CREATE DATABASE IF NOT EXISTS propszy_re CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'propszy_user'@'localhost' IDENTIFIED BY 'PropszySecure2026!';
GRANT ALL PRIVILEGES ON propszy_re.* TO 'propszy_user'@'localhost';
FLUSH PRIVILEGES;
```

## Setup

```bash
# Backend
cd backend
# .env is already present (DATABASE_URL -> propszy_re, JWT secrets, ports)
npm install
npx prisma migrate deploy     # applies prisma/migrations/0_init  (creates 26 tables)
npm run seed                  # default admin + MLM levels + lead statuses + demo project
npm run dev                   # http://localhost:5050/api

# Frontend  (separate terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

> `prisma migrate dev` needs an interactive TTY. The baseline migration was generated
> with `prisma migrate diff` and is committed under `prisma/migrations/0_init/`; use
> `prisma migrate deploy` to apply it. For future schema changes run `prisma migrate dev`
> in a real terminal.

Default admin after seed: `admin@propszy.test` / `Admin@12345`
Demo agents: `agent@propszy.test` (code `RAVI2026`) → `subagent@propszy.test` (`NEHA2026`), password `Admin@12345`.

## API keys — add them from the app

No `.env` editing needed for integrations. Sign in as admin → **Settings** (`/admin/settings`):

| Setting | What it does |
|---|---|
| **Google Maps** | one key for Maps JS + Places + Geocoding; the public map uses it immediately |
| **Email (SMTP)** | host/port/user/pass/from + a **Send test** button |
| **SMS / WhatsApp** | provider + API key + sender id + endpoint; toggle `enabled` |
| **Media storage** | `local` / `s3` / `cloudinary` (applies on backend restart) |
| **Analytics** | GA4 measurement id (injected on the public site) |
| **Branding** | company name, support email/phone, primary colour |

Stored in the `Setting` table. Secrets show as `••••••••` and survive a save unless replaced.
`.env` keys (`GOOGLE_MAPS_API_KEY`, `SMTP_*`, …) are just the fallback until an admin saves.

## Status

Both servers were started and smoke-tested end-to-end: auth/login, project listing,
map pins, favorites, the Vite proxy, and the **commission engine** (a referral lead
marked *Converted* correctly wrote level-1 and level-2 ledger entries up the sponsor
chain). See [docs/PROGRESS.md](docs/PROGRESS.md).

## Build Phases

1. **Auth + Project/Property CRUD + media + public listings** ← current
2. Google Maps (single + all-projects map), favorites, enquiry history, activity log
3. Agent panel, KYC flow, MLM tree, commission config
4. Lead pipeline + automatic commission calculation on "Converted"
5. Reports/exports, dashboards, notifications, mobile QA

See [docs/PROGRESS.md](docs/PROGRESS.md) for module status.




