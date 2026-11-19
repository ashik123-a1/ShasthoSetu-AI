# ShasthoSetu AI — 05_Bangla_Voice_AI End-to-End Reproduction Script
# Environment: Python 3.12 with PyTorch 2.11 + CUDA 12.8 on RTX 5060 Ti

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$VenvPython = Join-Path (Split-Path -Parent $ScriptDir) "_shared\venv\Scripts\python.exe"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "ShasthoSetu AI — 05_Bangla_Voice_AI Full Pipeline Execution" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Step 1: Inspection and Preprocessing
Write-Host "`n[1/4] Running Audio Inspection & Preprocessing..." -ForegroundColor Yellow
& $VenvPython "src\inspect_and_preprocess.py"
if ($LASTEXITCODE -ne 0) { throw "inspect_and_preprocess.py failed with exit code $LASTEXITCODE" }

# Step 2: Speaker-Independent Split
Write-Host "`n[2/4] Generating Speaker-Independent Train/Val/Test Split..." -ForegroundColor Yellow
& $VenvPython "src\split_data.py"
if ($LASTEXITCODE -ne 0) { throw "split_data.py failed with exit code $LASTEXITCODE" }

# Step 3: GPU Benchmarking
Write-Host "`n[3/4] Running Whisper GPU Speech Recognition Benchmark on RTX 5060 Ti..." -ForegroundColor Yellow
& $VenvPython "src\benchmark_voice.py"
if ($LASTEXITCODE -ne 0) { throw "benchmark_voice.py failed with exit code $LASTEXITCODE" }

# Step 4: Package Proofs
Write-Host "`n[4/4] Generating Model Cards, Summaries, and Locking PROOFS.zip..." -ForegroundColor Yellow
& $VenvPython "src\package_proofs.py"
if ($LASTEXITCODE -ne 0) { throw "package_proofs.py failed with exit code $LASTEXITCODE" }

Write-Host "`n[SUCCESS] 05_Bangla_Voice_AI Pipeline Completed and Verified!" -ForegroundColor Green
