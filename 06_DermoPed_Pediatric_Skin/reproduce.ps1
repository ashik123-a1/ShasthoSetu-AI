# ShasthoSetu AI — 06_DermoPed_Pediatric_Skin Reproduction Script
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ShasthoSetu AI: DermoPed Pediatric Vision Pipeline (EXP_D)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$python = "$scriptDir\venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Host "Virtual environment not found at $python. Falling back to system python." -ForegroundColor Yellow
    $python = "python"
}

Write-Host "`n[Step 1/2] Ingesting & Verifying DermoPed Dataset..." -ForegroundColor Green
& $python "src\ingest.py"

Write-Host "`n[Step 2/2] Running Controlled Training (EXP_D: Frozen Backbone + Sampler)..." -ForegroundColor Green
& $python "src\train.py"

Write-Host "`nReproduction completed successfully. Results saved in 'outputs/' and 'models/'." -ForegroundColor Green
