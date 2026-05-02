# 项目健康监控系统 - 前端启动脚本
# Project Health Monitor - Frontend Startup Script

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  项目健康监控系统 - 前端启动" -ForegroundColor Cyan
Write-Host "  Project Health Monitor - Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在正确的目录
$frontendPath = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path $frontendPath)) {
    Write-Error "错误: 找不到 frontend 目录。请确保在 project-health-monitor 根目录运行此脚本。"
    exit 1
}

# 检查 .env.local 文件
$envFile = Join-Path $frontendPath ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Warning "警告: 找不到 .env.local 文件，将使用默认配置。"
    Write-Host "请复制 .env.example 到 .env.local 并配置 API 地址。" -ForegroundColor Yellow
}

# 进入前端目录
Set-Location $frontendPath

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
Write-Host "启动前端服务..." -ForegroundColor Green
Write-Host "服务将运行在 http://localhost:3000" -ForegroundColor Gray
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Gray
Write-Host ""

# 启动开发服务器
npm run dev
