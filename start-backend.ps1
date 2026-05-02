# 项目健康监控系统 - 后端启动脚本
# Project Health Monitor - Backend Startup Script

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  项目健康监控系统 - 后端启动" -ForegroundColor Cyan
Write-Host "  Project Health Monitor - Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在正确的目录
$backendPath = Join-Path $PSScriptRoot "backend"
if (-not (Test-Path $backendPath)) {
    Write-Error "错误: 找不到 backend 目录。请确保在 project-health-monitor 根目录运行此脚本。"
    exit 1
}

# 检查 .env 文件
$envFile = Join-Path $backendPath ".env"
if (-not (Test-Path $envFile)) {
    Write-Warning "警告: 找不到 .env 文件，将使用默认配置。"
    Write-Host "请复制 .env.example 到 .env 并配置数据库连接。" -ForegroundColor Yellow
}

# 进入后端目录
Set-Location $backendPath

# 检查 node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "正在安装依赖..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "依赖安装失败"
        exit 1
    }
}

Write-Host ""
Write-Host "启动后端服务..." -ForegroundColor Green
Write-Host "服务将运行在 http://localhost:3001" -ForegroundColor Gray
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Gray
Write-Host ""

# 启动开发服务器
npm run dev
