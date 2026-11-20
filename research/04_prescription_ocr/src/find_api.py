import re
from pathlib import Path

p = Path("F:/Clude cccccccccccccccccccccccc/data we test/04_Prescription_OCR/page.html")
html = p.read_text(encoding="utf-8", errors="ignore")

matches = re.findall(r'"([^"]*(?:api|files|download|tg2hm7n2bs)[^"]*)"', html)
print("Total matches:", len(matches))
for m in sorted(set(matches))[:40]:
    print(" ", m)
