# ShasthoSetu AI — One-Click Interactive Functional Demo Launcher
# Hardware: NVIDIA GeForce RTX 5060 Ti 16GB GPU

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$VenvPython = Join-Path (Split-Path -Parent $ScriptDir) "_shared\venv\Scripts\python.exe"
$StreamlitExe = Join-Path (Split-Path -Parent $ScriptDir) "_shared\venv\Scripts\streamlit.exe"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Launching ShasthoSetu AI Multimodal Clinical Safety Demo..." -ForegroundColor Cyan
Write-Host "Hardware: NVIDIA GeForce RTX 5060 Ti (CUDA 12.8 / PyTorch 2.11)" -ForegroundColor Cyan
Write-Host "URL: http://localhost:8501" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

& $StreamlitExe run "app.py" --server.port 8501 --server.headless false
