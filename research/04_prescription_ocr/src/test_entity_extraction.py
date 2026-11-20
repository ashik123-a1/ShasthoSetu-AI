import re
import pandas as pd

manifest = pd.read_csv(r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\data\processed\split_manifest.csv")
annotated = manifest[manifest["has_annotation"]].head(10)

def extract_entities_en(text):
    # Medicine names often precede 'tablet', 'capsule', 'syrup', 'injection', 'drops', 'ointment'
    med_pattern = r'\b([A-Z][a-zA-Z0-9\+\-\/\s]{1,20}?)\s+(?:tablet|capsule|syrup|injection|drops|ointment|tab|cap|inj|powder|mouthwash)\b'
    meds = re.findall(med_pattern, text, re.IGNORECASE)
    
    # Strengths: numbers followed by mg, ml, gm, mcg, iu
    strength_pattern = r'\b\d+(?:\.\d+)?\s*(?:mg|ml|gm|mcg|iu|%)\b'
    strengths = re.findall(strength_pattern, text, re.IGNORECASE)
    
    # Frequency: e.g. 'once', 'twice', 'three times', '1-0-1', 'daily', 'at night', 'in the morning'
    freq_pattern = r'\b(?:once|twice|three times|four times|\d+ times|daily|at night|in the morning|afternoon|every \d+ hours|1\s*-\s*0\s*-\s*1|1\s*\+\s*0\s*\+\s*1)\b'
    freqs = re.findall(freq_pattern, text, re.IGNORECASE)
    
    # Duration: e.g. 'for 7 days', 'for 1 month', '30 days'
    dur_pattern = r'\b(?:\d+\s*(?:days|weeks|months|years))\b'
    durations = re.findall(dur_pattern, text, re.IGNORECASE)
    
    return {
        "medicines": list(set([m.strip() for m in meds])),
        "strengths": list(set([s.strip() for s in strengths])),
        "frequencies": list(set([f.strip() for f in freqs])),
        "durations": list(set([d.strip() for d in durations]))
    }

for idx, r in annotated.iterrows():
    print(f"--- Prescription {r['prescription_id']} ---")
    print("EN:", r["description_english"][:120])
    ent = extract_entities_en(r["description_english"])
    print("Entities:", ent)
