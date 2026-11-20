import re

pdf_path = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\data\raw\extracted\Prescription_Dataset(1000)\README.pdf"
with open(pdf_path, "rb") as f:
    content = f.read().decode('latin1', errors='ignore')

# Extract text streams or text enclosed in parentheses / brackets
matches = re.findall(r'\((.*?)\)', content)
text = " ".join(m for m in matches if len(m) > 3 and not m.startswith('/'))
print("Extracted strings length:", len(text))
print("Sample:", text[:2000])
