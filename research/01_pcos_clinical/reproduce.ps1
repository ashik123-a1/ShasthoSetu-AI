# ShasthoSetu AI — 01_PCOS_Clinical Reproduction Script
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ShasthoSetu AI: PCOS Clinical ML Pipeline Reproduction" -ForegroundColor Cyan
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

Write-Host "`n[Step 1/2] Running Preprocessing..." -ForegroundColor Green
& $python "src\preprocess.py"
if ($LASTEXITCODE -ne 0) { throw "src\preprocess.py failed with exit code $LASTEXITCODE" }

Write-Host "`n[Step 2/2] Training & Evaluating Baseline Models..." -ForegroundColor Green
& $python "src\train.py"
if ($LASTEXITCODE -ne 0) { throw "src\train.py failed with exit code $LASTEXITCODE" }

Write-Host "`nReproduction completed successfully. Results saved in 'outputs/' and 'proofs/'." -ForegroundColor Green
