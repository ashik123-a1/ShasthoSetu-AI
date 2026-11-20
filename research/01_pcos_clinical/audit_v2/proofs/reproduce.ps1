# ShasthoSetu AI — 01_PCOS_Clinical Audit V2 Reproduction Script
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ShasthoSetu AI: PCOS Clinical ML Audit V2 Reproduction" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$python = "$scriptDir\..\venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $python = "python"
}

Write-Host "`n[Step 1/2] Running Data Integrity & Leakage Audit..." -ForegroundColor Green
& $python "src\leakage_and_data_audit.py"

Write-Host "`n[Step 2/2] Running 50-Fold Repeated CV & Test Evaluation..." -ForegroundColor Green
& $python "src\train_audit.py"

Write-Host "`nAudit V2 reproduction completed successfully." -ForegroundColor Green
