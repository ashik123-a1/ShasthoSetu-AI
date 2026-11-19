# ShasthoSetu AI — Final Integration & Verification Reproduction Script
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ShasthoSetu AI: Prescription OCR Final Integration Suite" -ForegroundColor Cyan
Write-Host "NVIDIA GeForce RTX 5060 Ti (CUDA 12.8 / sm_120)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$python = "$scriptDir\..\..\_shared\venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $python = "python"
}

function Run-Step {
    param(
        [string]$StepNumber,
        [string]$StepDescription,
        [scriptblock]$Action
    )
    Write-Host "`n[$StepNumber] $StepDescription..." -ForegroundColor Green
    & $Action
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[FATAL ERROR] Step $StepNumber failed with exit code $LASTEXITCODE!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host "[PASSED] Step $StepNumber completed successfully." -ForegroundColor Cyan
}

Run-Step "Step 1/4" "Verifying Quarantine Consistency & Zero Data Leakage" {
    & $python "$scriptDir\src\verify_quarantine_consistency.py"
}

Run-Step "Step 2/4" "Executing Automated Medical Safety Gate Test Suite (7 Tests)" {
    & $python -m unittest discover -s "$scriptDir\tests" -v
}

Run-Step "Step 3/4" "Verifying Interactive Demo Server on Local Loopback" {
    & $python "$scriptDir\tests\test_demo_server.py"
}

Run-Step "Step 4/4" "Packaging Final Integration Proof Archive (FINAL_INTEGRATION_PROOFS.zip)" {
    & $python "$scriptDir\src\package_final_proofs.py"
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "Final Integration & Safety Verification Pipeline Completed!" -ForegroundColor Green
Write-Host "All deliverables verified in: $scriptDir" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
