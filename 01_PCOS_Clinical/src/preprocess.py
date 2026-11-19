import os
import json
import zipfile
import xml.etree.ElementTree as ET
import csv

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\01_PCOS_Clinical"
RAW_FILE = os.path.join(BASE_DIR, "data", "raw", "vitD_donnees_2022Mai.xlsx")
PROCESSED_FILE = os.path.join(BASE_DIR, "data", "processed", "pcos_clinical_cleaned.csv")
PROFILE_FILE = os.path.join(BASE_DIR, "outputs", "dataset_profile.json")

COLUMN_MAPPING = {
    "SOPK": "target_pcos",
    "Age": "age",
    "Testosterone": "testosterone",
    "androstenedione": "androstenedione",
    "SDHEA": "sdhea",
    "Waist circumference": "waist_circumference",
    "BMI": "bmi",
    "FSH": "fsh",
    "LH": "lh",
    "PRL": "prl",
    "HOMA_IR": "homa_ir",
    "E2": "e2",
    "@17OHprog": "oh_prog_17",
    "systolic blood pressure": "sbp",
    "diastolic blood pressure": "dbp",
    "GLU": "glucose",
    "total cholesterol": "total_cholesterol",
    "triglycerides": "triglycerides",
    "HDLc": "hdl_c",
    "LDLc": "ldl_c",
    "@25OHVitD": "vit_d_25oh"
}

def parse_xlsx(file_path):
    with zipfile.ZipFile(file_path, "r") as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in tree.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                t = si.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                shared_strings.append(t.text if t is not None else "")
        
        sheet_tree = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row in sheet_tree.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row"):
            cells = {}
            for c in row.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
                r_coord = c.attrib.get("r")
                col_letter = "".join([ch for ch in r_coord if ch.isalpha()])
                v = c.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
                val = v.text if v is not None else None
                t = c.attrib.get("t")
                if t == "s" and val is not None:
                    val = shared_strings[int(val)]
                cells[col_letter] = val
            rows.append(cells)
    return rows

def process():
    rows = parse_xlsx(RAW_FILE)
    header = rows[0]
    col_keys = sorted(header.keys(), key=lambda x: (len(x), x))
    raw_cols = [header[k] for k in col_keys]
    clean_cols = [COLUMN_MAPPING.get(c, c) for c in raw_cols]
    
    clean_rows = []
    missing_stats = {c: 0 for c in clean_cols}
    type_stats = {c: "numeric" for c in clean_cols}
    
    target_counts = {}
    
    for r in rows[1:]:
        clean_row = {}
        for k, raw_c, clean_c in zip(col_keys, raw_cols, clean_cols):
            val = r.get(k)
            if val is None or val.strip() == "" or val.strip() == "#NULL!":
                clean_row[clean_c] = ""
                missing_stats[clean_c] += 1
            else:
                try:
                    num = float(val.strip())
                    clean_row[clean_c] = int(num) if clean_c == "target_pcos" else num
                except ValueError:
                    clean_row[clean_c] = val.strip()
                    type_stats[clean_c] = "string"
                    
        tgt = clean_row.get("target_pcos")
        if tgt != "":
            target_counts[str(tgt)] = target_counts.get(str(tgt), 0) + 1
            
        clean_rows.append(clean_row)
        
    os.makedirs(os.path.dirname(PROCESSED_FILE), exist_ok=True)
    with open(PROCESSED_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=clean_cols)
        writer.writeheader()
        writer.writerows(clean_rows)
        
    profile = {
        "dataset_name": "PCOS Clinical (Mendeley Data tw34c7hv7z/1)",
        "source": "https://data.mendeley.com/datasets/tw34c7hv7z/1",
        "license": "CC BY 4.0",
        "description": "Case-control clinical study of PCOS diagnosed via Rotterdam criteria vs age/BMI matched controls",
        "total_samples": len(clean_rows),
        "total_features": len(clean_cols) - 1,
        "target_column": "target_pcos",
        "target_distribution": target_counts,
        "columns": clean_cols,
        "missing_value_counts": missing_stats,
        "missing_percentage": {c: round((missing_stats[c] / len(clean_rows)) * 100, 2) for c in clean_cols}
    }
    
    os.makedirs(os.path.dirname(PROFILE_FILE), exist_ok=True)
    with open(PROFILE_FILE, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2)
        
    print(f"Successfully processed {len(clean_rows)} samples.")
    print("Saved processed CSV to:", PROCESSED_FILE)
    print("Saved profile to:", PROFILE_FILE)
    print("Target distribution:", target_counts)

if __name__ == "__main__":
    process()
