# Project Health Monitor - Frontend Startup Script
# Project Health Monitor - Frontend Startup Script

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Project Health Monitor - Frontend" -ForegroundColor Cyan
Write-Host "  Project Health Monitor - Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
$frontendPath = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Error "Error: Cannot find frontend directory. Please run this script in the project-health-monitor root directory."
    exit 1
}

# Check .env.local file
$envFile = Join-Path $frontendPath ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Warning "Warning: Cannot find .env.local file, will use default settings."
    Write-Host "Please copy .env.example to .env.local and configure API address." -ForegroundColor Yellow
}

# Check node_modules
if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install -C $frontendPath
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Dependency installation failed"
        exit 1
    }
}

Write-Host ""
Write-Host "Starting frontend server..." -ForegroundColor Green
Write-Host "Server will run at http://localhost:3000" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start development server (without changing directory)
npm run dev -C $frontendPath
