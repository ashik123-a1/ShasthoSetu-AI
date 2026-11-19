# ShasthoSetu AI — Audit V2 Master Reproduction Script
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ShasthoSetu AI: Prescription OCR Audit V2 Pipeline" -ForegroundColor Cyan
Write-Host "NVIDIA GeForce RTX 5060 Ti (CUDA 12.8 / sm_120)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$python = "$scriptDir\..\..\_shared\venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $python = "python"
}

function Run-AuditStep {
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

Run-AuditStep "Phase 1" "Immediate Medication Safety Fix & 100% Human Review Policy" "src\audit_safety_gate.py"
Run-AuditStep "Phase 2" "Annotation Integrity Audit for Specific Target Stems" "src\audit_annotations_integrity.py"
Run-AuditStep "Phase 2" "Building Corrected Annotation Manifest with Quarantine Flags" "src\build_corrected_manifest.py"
Run-AuditStep "Phase 3" "Recalculating Genuine Corpus-Level OCR Performance & Correlations" "src\recalculate_ocr_metrics.py"
Run-AuditStep "Phase 4" "Evaluating Improved Baseline (CLAHE + Reading Order) on Validation Data" "src\evaluate_improved_baseline.py"
Run-AuditStep "Phase 5" "Extracting Structured Clinical Medication Orders with Provenance" "src\structured_medical_parser.py"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "Audit V2 pipeline executed and verified successfully!" -ForegroundColor Green
Write-Host "All outputs stored under '04_Prescription_OCR/audit_v2/'." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
