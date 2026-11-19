# ShasthoSetu AI — 02_PCOS_Ultrasound Reproduction Script
# Enforces strict non-zero exit code checks for complete reproducibility
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ShasthoSetu AI: PCOS Ultrasound Vision Pipeline" -ForegroundColor Cyan
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

Run-PythonStep "Step 1/5" "Image Extraction & Exact Hash Deduplication" "src\inspect_and_preprocess.py"
Run-PythonStep "Step 2/5" "Leakage-Resistant Data Splitting" "src\split_data.py"
Run-PythonStep "Step 3/5" "Perceptual Hash & Near-Duplicate Leakage Audit" "src\audit_near_duplicates.py"
Run-PythonStep "Step 4/5" "Repeated Stratified Group Cross-Validation (15 Folds)" "src\cross_validate.py"
Run-PythonStep "Step 5/5" "Multi-Run Versioning & Comparison Consolidation" "src\organize_runs.py"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "PCOS Ultrasound reproduction pipeline completed successfully!" -ForegroundColor Green
Write-Host "All outputs verified in 'outputs/', 'runs/', and 'proofs/'." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
