import os

pdf_path = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\data\raw\extracted\Prescription_Dataset(1000)\README.pdf"

try:
    import pypdf
    reader = pypdf.PdfReader(pdf_path)
    print(f"Total pages: {len(reader.pages)}")
    for i, p in enumerate(reader.pages):
        print(f"\n--- Page {i+1} ---")
        print(p.extract_text())
except Exception as e:
    print(f"Could not read with pypdf: {e}")
    # try pypdf or PyPDF2 or fitz or dump raw bytes / strings
    with open(pdf_path, "rb") as f:
        data = f.read()
    print(f"PDF byte size: {len(data)}")
