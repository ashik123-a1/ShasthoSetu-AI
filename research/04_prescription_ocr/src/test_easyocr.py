import torch
import easyocr

print("PyTorch version:", torch.__version__)
print("CUDA available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("Device:", torch.cuda.get_device_name(0))

print("Testing EasyOCR initialization...")
reader = easyocr.Reader(['en', 'bn'], gpu=torch.cuda.is_available())
print("EasyOCR reader initialized successfully!")
