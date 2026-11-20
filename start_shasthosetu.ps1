<#
.SYNOPSIS
    Launch ShasthoSetu AI full-stack platform (FastAPI + SQLite + Vite) with optional DB reset and Cloudflare Tunnel.
#>
param(
    [switch]$ResetDemoDb,
    [switch]$WithTunnel
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir = Join-Path $Root "services\api"
$WebDir = Join-Path $Root "apps\web"
$DbPath = Join-Path $ApiDir "data\shasthosetu.db"

# Resolve Python interpreter cleanly across standard virtualenv layouts or PATH
$PythonCandidates = @(
    (Join-Path $Root ".venv\Scripts\python.exe"),
    (Join-Path $Root "venv\Scripts\python.exe"),
    (Join-Path $Root "_shared\venv\Scripts\python.exe")
)
$PythonExe = $PythonCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $PythonExe) {
    $Cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($Cmd) { $PythonExe = $Cmd.Source }
}
if (-not $PythonExe) {
    throw "Python interpreter not found. Create a virtualenv (.venv or venv) and run: pip install -r requirements.txt"
}

$PyPath = "$ApiDir\src;$Root"

if ($ResetDemoDb -or -not (Test-Path $DbPath)) {
    Write-Host "[ShasthoSetu] Initializing synthetic SQLite database ($DbPath)..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $DbPath) | Out-Null
    if ($ResetDemoDb) {
        Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $ApiDir "data\shasthosetu.db*")
    }
    Push-Location $ApiDir
    $prevPyPath = $env:PYTHONPATH
    $env:PYTHONPATH = $PyPath
    & $PythonExe -m shasthosetu_api.seeds.seed_demo
    $env:PYTHONPATH = $prevPyPath
    Pop-Location
}

Write-Host "[ShasthoSetu] Starting FastAPI backend on http://0.0.0.0:8000 ..." -ForegroundColor Green
$BackendProc = Start-Process -FilePath $PythonExe `
    -ArgumentList "-m", "uvicorn", "shasthosetu_api.main:app", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory $ApiDir `
    -Environment @{ PYTHONPATH = $PyPath } `
    -PassThru

Write-Host "[ShasthoSetu] Starting Vite frontend on http://0.0.0.0:5173 ..." -ForegroundColor Green
$FrontendProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm.cmd run dev -- --host 0.0.0.0 --port 5173" `
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
