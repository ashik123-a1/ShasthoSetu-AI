# ShasthoSetu AI — 03_Measles_Viral_Rash Reproduction Script
# Enforces strict non-zero exit code checks for complete reproducibility
param(
    [switch]$IncludeHistoricalTraining = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ShasthoSetu AI: Measles & Viral Skin Lesions Vision Pipeline" -ForegroundColor Cyan
Write-Host "NVIDIA GeForce RTX 5060 Ti (CUDA 12.8 / sm_120)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$sharedPython = Join-Path (Split-Path -Parent $scriptDir) "_shared\venv\Scripts\python.exe"
$localPython = "$scriptDir\venv\Scripts\python.exe"

if (Test-Path $sharedPython) {
    $python = $sharedPython
} elseif (Test-Path $localPython) {
    $python = $localPython
} else {
    Write-Host "Virtual environment not found. Falling back to system python." -ForegroundColor Yellow
    $python = "python"
}

Write-Host "Using Python: $python" -ForegroundColor Cyan

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

Run-PythonStep "Step 1/5" "Dataset Inspection, Integrity & Duplicate Audit" "src\inspect_and_audit.py"
Run-PythonStep "Step 2/5" "Historical Stratified Image Splitting" "src\split_data.py"
Run-PythonStep "Step 3/5" "Group-Isolated Source-Family Splitting (0% Leakage)" "src\split_grouped_data.py"

if ($IncludeHistoricalTraining) {
    Run-PythonStep "Step 4A/5" "Historical Contaminated Model Training (ResNet18 / MobileNetV3)" "src\train_vision.py"
}

Run-PythonStep "Step 4/5" "Group-Isolated Vision Model Training on RTX 5060 Ti GPU" "src\train_grouped_vision.py"
Run-PythonStep "Step 5/5" "Proof Packaging & Master Sync" "src\package_proofs.py"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "Measles & Viral Rash pipeline reproduced successfully!" -ForegroundColor Green
Write-Host "All outputs verified in 'outputs/', 'models/', and 'proofs/'." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
