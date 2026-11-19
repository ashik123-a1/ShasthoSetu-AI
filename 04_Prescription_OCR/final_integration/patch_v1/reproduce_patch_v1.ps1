# ShasthoSetu AI — Patch V1 Master Reproduction Script
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ShasthoSetu AI: Prescription OCR Patch V1 Master Pipeline" -ForegroundColor Cyan
Write-Host "NVIDIA GeForce RTX 5060 Ti (CUDA 12.8 / sm_120)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$python = "$scriptDir\..\..\..\_shared\venv\Scripts\python.exe"
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

Run-Step "Step 1/4" "Reconciling Canonical Split Manifest & Zero-Leakage Audit" {
    & $python "$scriptDir\src\generate_canonical_split_audit.py"
}

Run-Step "Step 2/4" "Executing Real End-to-End Test Suite (GPU Inference & Safety Gate)" {
    & $python "$scriptDir\tests\test_real_e2e_workflow.py" -v
}

Run-Step "Step 3/4" "Packaging Patch V1 Proofs Archive (PATCH_V1_PROOFS.zip)" {
    & $python "$scriptDir\src\package_patch_v1_proofs.py"
}

Run-Step "Step 4/4" "Executing Isolated Extraction & Reproducibility Dry-Run on Proof ZIP" {
    & $python "$scriptDir\tests\test_proof_zip_extraction.py"
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "Patch V1 Pipeline Executed, Verified, and Repackaged Successfully!" -ForegroundColor Green
Write-Host "All deliverables verified in: $scriptDir" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
