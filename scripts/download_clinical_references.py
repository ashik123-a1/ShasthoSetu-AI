import os
import urllib.request

CLINICAL_VIDEOS = [
    # Category 1: PCOS
    ("pcos_01_understanding", "IvbjjJdKWTg", "Understanding PCOS | 3D Animation", "PCOS"),
    ("pcos_02_menstrual_cycle", "RMWy9_CQZxc", "PCOS & Menstrual Cycle Explained", "PCOS"),
    ("pcos_03_causes_treatment", "73N4ePv56Es", "PCOS: Why It Happens and What You Can Do", "PCOS"),
    
    # Category 2: Dengue Fever & Serology
    ("dengue_01_ns1_antigen", "mMPpPajEoOw", "Dengue test | NS1 antigen test for Dengue", "Dengue"),
    ("dengue_02_antibody_igg_igm", "0ztF-419fac", "Antibody Testing: IgG and IgM explained", "Dengue"),
    ("dengue_03_fever_symptoms", "WvuLKjYMfCg", "Dengue Fever | Transmission | Symptoms | Blood Tests", "Dengue"),
    
    # Category 3: Thyroid Profile
    ("thyroid_01_gland_hormones", "cDGmsR2ZILE", "Thyroid Gland, Hormones and Thyroid Problems", "Thyroid"),
    ("thyroid_02_function_tests", "46lWBkrKmDQ", "Thyroid Function Tests (TFTs) explained", "Thyroid"),
    ("thyroid_03_metabolism", "iNrUpBwU3q0", "How does the thyroid manage your metabolism?", "Thyroid"),
    
    # Category 4: 12-Lead ECG
    ("ecg_01_12_lead_explained", "kwLbSx9BNbU", "12 Lead ECG Explained, Animation", "ECG"),
    ("ecg_02_cardiac_conduction", "RYZ4daFwMa8", "Cardiac Conduction System and Understanding ECG", "ECG"),
    ("ecg_03_what_is_ecg", "qsrBlkESI18", "What's an electrocardiogram (ECG)?", "ECG"),
    
    # Category 5: CBC & Hematology
    ("cbc_01_full_blood_count", "JVmPu8o2ycc", "Full Blood Count (FBC/CBC) interpretation", "CBC"),
    ("cbc_02_red_blood_cells", "o7fokX0Wloo", "Red blood Cells, CBC Part 9, RBCs Explained in 3D", "CBC"),
    ("cbc_03_hemoglobin_guide", "t7a1BAlcoHo", "Hemoglobin (Hb) Guide | CBC Part 2", "CBC"),
    
    # Category 6: Kidney Function
    ("kidney_01_function_tests", "zVXY7xLwNJQ", "Kidney Function Tests, Animation", "Kidney"),
    ("kidney_02_creatinine_egfr", "l2tf-Pxc0wU", "What is Creatinine and How Does it Measure Kidney Function", "Kidney"),
    ("kidney_03_kft_complete", "e5R6tzJCCgw", "Kidney Function Tests (KFT's) Explained", "Kidney"),
    
    # Category 7: Liver Function
    ("liver_01_function_tests", "i2PfjEks4GQ", "Liver Function Tests (LFTs), Animation", "Liver"),
    ("liver_02_interpretation", "8CZVouv0m7M", "Liver Function Tests (LFTs) | Interpretation", "Liver"),
    ("liver_03_enzymes_remastered", "57mvZvV3zpY", "Liver Function Test Interpretation | Enzymes", "Liver"),
    
    # Category 8: Lipid Profile
    ("lipid_01_cholesterol_metabolism", "9dghtf7Z7fw", "Cholesterol Metabolism, LDL, HDL Animation", "Lipid"),
    ("lipid_02_cholesterol_tests", "eEeEOafpTyg", "Cholesterol Tests explained by GP", "Lipid"),
    ("lipid_03_how_cholesterol_works", "WFLuK2ue7KE", "How Cholesterol Works - Step by Step", "Lipid"),
    
    # Category 9: Vitamin D
    ("vitd_01_how_it_works", "MtUgi9wZGXU", "How Vitamin D Works", "Vitamin D"),
    ("vitd_02_deficiency_symptoms", "AXq2ZdXXFCU", "11 Bizarre Symptoms of Vitamin D Deficiency", "Vitamin D"),
    ("vitd_03_tests_treatment", "X9SnyN3oZ_c", "Vitamin D Deficiency Explained", "Vitamin D"),
    
    # Category 10: Urinalysis
    ("urine_01_urinalysis_part1", "auIKg09zXbE", "Urinalysis Part 1 Explained | 3D Animation", "Urine"),
    ("urine_02_urinalysis_overview", "6PTB254Kkbk", "Urinalysis Explained", "Urine"),
    ("urine_03_clinical_skills", "gIc1EAGryPc", "How to perform URINALYSIS - clinical guide", "Urine"),
]

def download_thumbnails():
    out_dir = "docs/SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01/source/clinical_references"
    os.makedirs(out_dir, exist_ok=True)
    
    downloaded = 0
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    print(f"Fetching {len(CLINICAL_VIDEOS)} clinical reference images...")
    for slug, vid_id, title, category in CLINICAL_VIDEOS:
        dest_path = os.path.join(out_dir, f"{slug}.jpg")
        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
            downloaded += 1
            continue
            
        # Try maxresdefault first, fallback to hqdefault
        urls = [
            f"https://img.youtube.com/vi/{vid_id}/maxresdefault.jpg",
            f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg"
        ]
        
        success = False
        for url in urls:
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        data = resp.read()
                        # If maxresdefault doesn't exist, youtube returns a 120x90 placeholder (~1097 bytes)
                        if len(data) > 3000:
                            with open(dest_path, "wb") as f:
                                f.write(data)
                            success = True
                            downloaded += 1
                            break
            except Exception:
                continue
                
        if not success:
            # Fallback to hqdefault definitely
            try:
                req = urllib.request.Request(f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg", headers=headers)
                with urllib.request.urlopen(req, timeout=5) as resp:
                    with open(dest_path, "wb") as f:
                        f.write(resp.read())
                downloaded += 1
            except Exception as e:
                print(f"Warning: could not fetch {slug} ({vid_id}): {e}")
                
    print(f"Successfully fetched {downloaded}/{len(CLINICAL_VIDEOS)} clinical reference visuals to {out_dir}")

if __name__ == "__main__":
    download_thumbnails()
