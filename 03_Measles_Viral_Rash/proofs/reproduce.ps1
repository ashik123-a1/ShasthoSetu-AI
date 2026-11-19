# ShasthoSetu AI — 03_Measles_Viral_Rash Reproduction Script
# Enforces strict non-zero exit code checks for complete reproducibility
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ShasthoSetu AI: Measles & Viral Skin Lesions Vision Pipeline" -ForegroundColor Cyan
Write-Host "NVIDIA GeForce RTX 5060 Ti (CUDA 12.8 / sm_120)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$python = "$scriptDir\..\_shared\venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $python = "python"
}

function Run-PythonStep {
    param(
        [string]$StepNumber,
        [string]$StepDescription,
        [string]$ScriptPath
    )
    Write-Host "`n[$StepNumber] $StepDescription..." -ForegroundColor Green
    & $python $ScriptPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[FATAL ERROR] Step $StepNumber failed with exit code $LASTEXITCODE!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host "[PASSED] Step $StepNumber completed successfully." -ForegroundColor Cyan
}

Run-PythonStep "Step 1/4" "Dataset Inspection, Integrity & Duplicate Audit" "src\inspect_and_audit.py"
Run-PythonStep "Step 2/4" "Deduplicated Stratified Splitting (70/15/15)" "src\split_data.py"
Run-PythonStep "Step 3/4" "ResNet18 & MobileNetV3 Training on RTX 5060 Ti GPU" "src\train_vision.py"
Run-PythonStep "Step 4/4" "Proof Packaging & Master Sync" "src\package_proofs.py"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "Measles & Viral Rash pipeline reproduced successfully!" -ForegroundColor Green
Write-Host "All outputs verified in 'outputs/', 'runs/', and 'proofs/'." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
