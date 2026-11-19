import os
import sys
import json
import platform
import torch
import easyocr

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
outputs_dir = os.path.join(base_dir, "outputs")
os.makedirs(outputs_dir, exist_ok=True)

env_info = {
    "module": "04_Prescription_OCR",
    "timestamp": "2026-11-18T03:26:00+06:00",
    "os": {
        "platform": platform.platform(),
        "system": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor()
    },
    "python": {
        "version": platform.python_version(),
        "executable": sys.executable,
        "implementation": platform.python_implementation()
    },
    "pytorch": {
        "version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "cuda_version": torch.version.cuda if torch.cuda.is_available() else None,
        "cudnn_version": torch.backends.cudnn.version() if torch.cuda.is_available() else None,
        "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "device_capability": torch.cuda.get_device_capability(0) if torch.cuda.is_available() else None,
        "device_total_memory_gb": round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2) if torch.cuda.is_available() else 0
    },
    "ocr_stack": {
        "framework": "EasyOCR",
        "version": easyocr.__version__,
        "detector": "CRAFT (Character-Region Awareness for Text Detection)",
        "recognizer": "ResNet + BiLSTM + CTC (bilingual 'en' + 'bn')",
        "backend": "PyTorch native sm_120 (GeForce RTX 5060 Ti 16GB)"
    }
}

env_path = os.path.join(outputs_dir, "environment.json")
with open(env_path, "w", encoding="utf-8") as f:
    json.dump(env_info, f, indent=2)

print(f"Saved environment to {env_path}")
print(json.dumps(env_info, indent=2))
