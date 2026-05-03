# Project Health Monitor - Backend Startup Script
# Project Health Monitor - Backend Startup Script

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Project Health Monitor - Backend" -ForegroundColor Cyan
Write-Host "  Project Health Monitor - Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
$backendPath = Join-Path $PSScriptRoot "backend"
if (-not (Test-Path $backendPath)) {
    Write-Error "Error: Cannot find backend directory. Please run this script in the project-health-monitor root directory."
    exit 1
}

# Check .env file
$envFile = Join-Path $backendPath ".env"
if (-not (Test-Path $envFile)) {
    Write-Warning "Warning: Cannot find .env file, will use default settings."
    Write-Host "Please copy .env.example to .env and configure database connection." -ForegroundColor Yellow
}

# Check node_modules
if (-not (Test-Path (Join-Path $backendPath "node_modules"))) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install -C $backendPath
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Dependency installation failed"
        exit 1
    }
}

Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor Green
Write-Host "Server will run at http://localhost:3001" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start development server (without changing directory)
npm run dev -C $backendPath
