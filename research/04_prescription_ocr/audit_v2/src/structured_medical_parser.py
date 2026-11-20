import os
import re
import json
import pandas as pd
import numpy as np

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
pred_csv_path = os.path.join(base_dir, "outputs", "test_predictions.csv")
audit_dir = os.path.join(base_dir, "audit_v2")

df = pd.read_csv(pred_csv_path)

def parse_structured_prescription(row):
    p_id = str(row["prescription_id"]).zfill(4)
    ocr_text = str(row["ocr_raw_text"]) if pd.notnull(row["ocr_raw_text"]) else ""
    mean_conf = float(row["mean_confidence"]) if pd.notnull(row["mean_confidence"]) else 0.0
    fname = str(row["filename"])
    
    # Medication regex pattern (looking for common formulations in Bengali/English prescriptions)
    # e.g., Tab, Cap, Syrup, Inj, Syp, ওষুূধ, ট্যাবলেট, ক্যাপসুল
    med_pattern = re.compile(
        r'\b(?:tab|cap|inj|syrup|syp|oint|drop|drops|ট্যাবলেট|ক্যাপসুল|সিরাপ|ইনজেকশন)[\.\s:]+([A-Za-z0-9\+\-\/\s]{2,20}?)(?=\s+(?:\d+|১|২|৩|৪|৫|\+|-|\*|mg|ml|ভরা|খাবার)|\n|$)', 
        re.IGNORECASE
    )
    
    # Strength pattern (e.g. 500 mg, 40mg, 10 ml, ২০ মি.গ্রা)
    strength_pattern = re.compile(
        r'\b(\d+(?:\.\d+)?|[০-৯]+(?:\.[০-৯]+)?)\s*(mg|ml|gm|mcg|iu|%|মি\.গ্রা|মিলিগ্রাম|মি\.লি)\b', 
        re.IGNORECASE
    )
    
    # Frequency / Timing pattern (e.g. 1+0+1, ১+০+১, 1-0-1, 1*0*1, once daily, দিনে দুইবার)
    freq_pattern = re.compile(
        r'(\b[0-3০-৩]\s*[\+\-\*]\s*[0-3০-৩]\s*[\+\-\*]\s*[0-3০-৩]\b|once daily|twice daily|three times daily|দিনে [১-৪|এক|দুই|তিন] বার)', 
        re.IGNORECASE
    )
    
    # Duration pattern (e.g. 7 days, 1 month, ৭ দিন, ১ মাস)
    duration_pattern = re.compile(
        r'(\b\d+\s*(?:days|weeks|months|yr|d|w|m)\b|\b[০-৯]+\s*(?:দিন|সপ্তাহ|মাস|বছর)\b)', 
        re.IGNORECASE
    )
    
    # Route pattern (Oral, Topical, IV, IM, Ophthalmic)
    route_pattern = re.compile(
        r'\b(oral|iv|im|sc|topical|ophthalmic|otic|নাসাল|শিরার মাধ্যমে|মুখে)\b', 
        re.IGNORECASE
    )
    
    # Extract matches
    found_meds = med_pattern.findall(ocr_text)
    found_strengths = strength_pattern.findall(ocr_text)
    found_freqs = freq_pattern.findall(ocr_text)
    found_durs = duration_pattern.findall(ocr_text)
    found_routes = route_pattern.findall(ocr_text)
    
    orders = []
    # If explicit formulation matches exist, construct structured clinical orders
    if found_meds:
        for i, med in enumerate(found_meds):
            clean_med = med.strip()
            # Assign adjacent or matching strength/frequency if available
            s_val = f"{found_strengths[i][0]} {found_strengths[i][1]}" if i < len(found_strengths) else "UNRESOLVED"
            f_val = found_freqs[i] if i < len(found_freqs) else "UNRESOLVED"
            d_val = found_durs[i] if i < len(found_durs) else "UNRESOLVED"
            r_val = found_routes[i] if i < len(found_routes) else "UNSPECIFIED"
            
            orders.append({
                "order_index": i + 1,
                "medicine_name": {
                    "raw_extracted": clean_med,
                    "confidence": round(mean_conf, 4),
                    "provenance": "Regex-extracted from OCR token",
                    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
                },
                "strength": {
                    "raw_extracted": s_val,
                    "confidence": round(mean_conf, 4) if s_val != "UNRESOLVED" else 0.0,
                    "provenance": "OCR numeric token" if s_val != "UNRESOLVED" else "None",
                    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
                },
                "dose": {
                    "raw_extracted": "1 unit (provisional)",
                    "confidence": 0.0,
                    "provenance": "Unverified default",
                    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
                },
                "frequency": {
                    "raw_extracted": f_val,
                    "confidence": round(mean_conf, 4) if f_val != "UNRESOLVED" else 0.0,
                    "provenance": "OCR frequency pattern" if f_val != "UNRESOLVED" else "None",
                    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
                },
                "duration": {
                    "raw_extracted": d_val,
                    "confidence": round(mean_conf, 4) if d_val != "UNRESOLVED" else 0.0,
                    "provenance": "OCR duration token" if d_val != "UNRESOLVED" else "None",
                    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
                },
                "route_of_administration": {
                    "raw_extracted": r_val,
                    "confidence": 0.50 if r_val != "UNSPECIFIED" else 0.0,
                    "provenance": "OCR route keyword" if r_val != "UNSPECIFIED" else "None",
                    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
                }
            })
    else:
        # Fallback order when no clear formulation prefix found
        orders.append({
            "order_index": 1,
            "medicine_name": {
                "raw_extracted": "UNRESOLVED_HANDWRITING",
                "confidence": 0.0,
                "provenance": "No clear medicine entity detected in OCR stream",
                "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
            },
            "strength": {"raw_extracted": "UNRESOLVED", "confidence": 0.0, "provenance": "None", "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"},
            "dose": {"raw_extracted": "UNRESOLVED", "confidence": 0.0, "provenance": "None", "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"},
            "frequency": {"raw_extracted": "UNRESOLVED", "confidence": 0.0, "provenance": "None", "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"},
            "duration": {"raw_extracted": "UNRESOLVED", "confidence": 0.0, "provenance": "None", "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"},
            "route_of_administration": {"raw_extracted": "UNSPECIFIED", "confidence": 0.0, "provenance": "None", "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"}
        })
        
    structured_doc = {
        "prescription_id": p_id,
        "filename": fname,
        "provenance": {
            "image_path": f"Prescription_ images.jpg/{fname}",
            "ocr_engine": "EasyOCR-Bilingual",
            "mean_page_confidence": round(mean_conf, 4),
            "total_detected_boxes": int(row["num_text_boxes"])
        },
        "clinical_orders": orders,
        "safety_guardrails": {
            "actionable_reminder_allowed": False,
            "human_clinical_review_mandatory": True,
            "triage_queue": "PHARMACY_VERIFICATION_REQUIRED",
            "justification": "Medical safety standard: zero automated scheduling from unverified OCR"
        }
    }
    return structured_doc

parsed_documents = []
for _, row in df.iterrows():
    parsed_documents.append(parse_structured_prescription(row))

# Save structured extraction JSON
out_json_path = os.path.join(audit_dir, "structured_medication_extractions.json")
with open(out_json_path, "w", encoding="utf-8") as fp:
    json.dump(parsed_documents, fp, indent=2, ensure_ascii=False)
print(f"Successfully generated structured medical extractions for {len(parsed_documents)} prescriptions.")
print(f"Saved to: {out_json_path}")
