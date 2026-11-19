import os
import sys
import shutil
import zipfile
import subprocess
import hashlib

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\final_integration\patch_v1"
ZIP_PATH = os.path.join(BASE_DIR, "proofs", "PATCH_V1_PROOFS.zip")
TEMP_EXTRACT_DIR = os.path.join(BASE_DIR, "temp_extracted_verification")
PYTHON_EXE = r"F:\Clude cccccccccccccccccccccccc\data we test\_shared\venv\Scripts\python.exe"

def verify_zip_package():
    print(f"=== TESTING ZIP PACKAGE REPRODUCIBILITY ===")
    print(f"Archive: {ZIP_PATH}")
    
    if not os.path.exists(ZIP_PATH):
        raise FileNotFoundError(f"Archive not found: {ZIP_PATH}")
        
    # Clean prior temp dir if exists
    if os.path.exists(TEMP_EXTRACT_DIR):
        shutil.rmtree(TEMP_EXTRACT_DIR)
    os.makedirs(TEMP_EXTRACT_DIR, exist_ok=True)
    
    # Step 1: Extract ZIP
    print(f"\n[1/3] Extracting archive to temporary directory: {TEMP_EXTRACT_DIR}...")
    with zipfile.ZipFile(ZIP_PATH, "r") as zf:
        zf.extractall(TEMP_EXTRACT_DIR)
        extracted_files = zf.namelist()
        
    print(f"Successfully extracted {len(extracted_files)} files.")
    for f in extracted_files:
        print(f"  - {f}")
        
    # Verify presence of packaging script inside archive
    expected_script = os.path.join("src", "package_patch_v1_proofs.py")
    assert expected_script in extracted_files or expected_script.replace("\\", "/") in extracted_files, \
        f"CRITICAL DEFECT: Packaging script missing from archive: {expected_script}"
    print(f"\nVerified: Packaging script '{expected_script}' is present in archive.")
    
    # Step 2: Run verification test on extracted code
    test_script = os.path.join(TEMP_EXTRACT_DIR, "tests", "test_real_e2e_workflow.py")
    print(f"\n[2/3] Executing automated tests directly on extracted codebase: {test_script}...")
    
    env = os.environ.copy()
    res = subprocess.run([PYTHON_EXE, test_script, "-v"], capture_output=True, text=True, cwd=TEMP_EXTRACT_DIR)
    
    print(f"Subprocess Exit Code: {res.returncode}")
    print("Test Output Preview:")
    print(res.stderr[:500] if res.stderr else res.stdout[:500])
    
    assert res.returncode == 0, f"Tests failed on extracted package! Return code: {res.returncode}"
    print("Extracted test suite PASSED completely!")
    
    # Step 3: Cleanup
    print(f"\n[3/3] Cleaning up temporary directory {TEMP_EXTRACT_DIR}...")
    shutil.rmtree(TEMP_EXTRACT_DIR)
    print("Cleanup complete. Full package reproducibility verified!")

if __name__ == "__main__":
    verify_zip_package()
