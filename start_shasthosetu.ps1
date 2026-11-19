<#
.SYNOPSIS
    Launch ShasthoSetu AI full-stack platform (FastAPI + SQLite + Vite) and optional Cloudflare Quick Tunnel.
#>
param(
    [switch]$ResetDemoDb,
    [switch]$WithTunnel
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonExe = Join-Path $Root "_reference_repos\.ref_venv\Scripts\python.exe"
$ApiDir = Join-Path $Root "services\api"
$WebDir = Join-Path $Root "apps\web"

if ($ResetDemoDb) {
    Write-Host "[ShasthoSetu] Resetting synthetic SQLite database..." -ForegroundColor Cyan
    Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $ApiDir "data\shasthosetu.db*")
    Push-Location $ApiDir
    $env:PYTHONPATH = "src"
    & $PythonExe -m shasthosetu_api.seeds.seed_demo
    Pop-Location
}

Write-Host "[ShasthoSetu] Starting FastAPI backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
$BackendProc = Start-Process -FilePath $PythonExe `
    -ArgumentList "-m", "uvicorn", "shasthosetu_api.main:app", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $ApiDir `
    -Environment @{ PYTHONPATH = "src" } `
    -PassThru

Write-Host "[ShasthoSetu] Starting Vite frontend on http://127.0.0.1:5173 ..." -ForegroundColor Green
$FrontendProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev -- --host 127.0.0.1 --port 5173" `
    -WorkingDirectory $WebDir `
    -PassThru

Write-Host "Local App:  http://127.0.0.1:5173" -ForegroundColor Yellow
Write-Host "Local API:  http://127.0.0.1:8000/docs" -ForegroundColor Yellow

if ($WithTunnel) {
    Write-Host "[ShasthoSetu] Opening Cloudflare Quick Tunnel -> http://127.0.0.1:5173 ..." -ForegroundColor Cyan
    Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "--url", "http://127.0.0.1:5173"
}

Write-Host "Press Enter to stop backend (PID $($BackendProc.Id)) & frontend (PID $($FrontendProc.Id))..."
[void][System.Console]::ReadLine()
Stop-Process -Id $BackendProc.Id, $FrontendProc.Id -Force -ErrorAction SilentlyContinue
