$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example. Replace placeholder secrets before external integrations."
}

if (-not (Test-Path "node_modules")) {
  npm install
}

docker compose up -d postgres

Write-Host "PostgreSQL is starting."
Write-Host "Run: npm run check"
Write-Host "Run: npm run dev"
Write-Host "For web: cd apps/web; npm install; npm run dev"
