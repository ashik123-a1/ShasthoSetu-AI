import re
from pathlib import Path

p = Path("F:/Clude cccccccccccccccccccccccc/data we test/04_Prescription_OCR/page.html")
html = p.read_text(encoding="utf-8", errors="ignore")

scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
print(scripts[10][2000:])
