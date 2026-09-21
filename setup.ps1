# Propszy one-shot local setup (run from the repo root in PowerShell).
# Node v24 is installed system-wide at C:\Program Files\nodejs.
# Requires: XAMPP MySQL/MariaDB running on localhost:3307.

$ErrorActionPreference = 'Stop'

function Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Magenta }

Step "Node / npm"
node -v; npm -v

Step "Database 'propszy_re'"
$mysql = "C:\xampp\mysql\bin\mysql.exe"
& $mysql -u root -e "CREATE DATABASE IF NOT EXISTS propszy_re CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Write-Host "ok"

Step "Backend: install + migrate + seed"
Push-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
Pop-Location

Step "Frontend: install"
Push-Location frontend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
Pop-Location

Step "Done"
Write-Host @"
Run the two dev servers in separate terminals:

  cd backend  ; npm run dev     ->  http://localhost:5050/api
  cd frontend ; npm run dev     ->  http://localhost:5173

Admin:  admin@propszy.com / Admin@12345
"@ -ForegroundColor Green
