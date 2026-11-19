import os
import sys
import time
import json
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
import pandas as pd
import streamlit as st
import joblib

# Set Streamlit Page Configuration
st.set_page_config(
    page_title="ShasthoSetu AI — Multimodal Healthcare Research & Clinical Safety Suite",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded"
)

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test"
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
GPU_NAME = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
VRAM_GB = torch.cuda.get_device_properties(0).total_memory / (1024**3) if torch.cuda.is_available() else 0.0

# Sidebar Branding & Environment Telemetry
st.sidebar.image("https://img.icons8.com/color/96/caduceus.png", width=70)
st.sidebar.title("ShasthoSetu AI")
st.sidebar.caption("স্বাস্থ্যসেতু — Multimodal Healthcare Research Platform")

# Language Switcher
st.sidebar.markdown("---")
ui_lang = st.sidebar.radio("🌐 Interface Language / ইন্টারফেস ভাষা:", ["English", "বাংলা"], index=0)

I18N = {
    "English": {
        "title": "ShasthoSetu AI",
        "caption": "স্বাস্থ্যসেতু — Multimodal Healthcare Research Platform",
        "telemetry_header": "Hardware & System Telemetry",
        "tab_pcos": "🩺 PCOS Tabular ML",
        "tab_us": "🔬 Bedside Ultrasound",
        "tab_measles": "🩻 Measles & Viral Skin",
        "tab_ocr": "📋 Bilingual Prescription OCR",
        "tab_voice": "🎙️ Bilingual Voice AI Console",
        "tab_proofs": "📊 Master Research & Proofs",
        "safety_gates_title": "Core Clinical Safety Gates:",
        "gate_rotterdam": "Rotterdam Gate: Endocrine Tabular ML",
        "gate_burst": "Burst-Group Isolation: Ultrasound Vision",
        "gate_measles": "Koplik & Serology Alert: Measles Vision",
        "gate_ocr": "100% Pharmacist Review: Prescription OCR",
        "gate_voice": "EHR Air-Gap: Bilingual Voice AI",
        "ocr_header": "Bilingual Doctor's Prescription OCR & Pharmacist Gate",
        "ocr_desc": "EasyOCR Deep Pipeline (['bn', 'en']) on NVIDIA RTX 5060 Ti GPU | Supports Bangla, English & Mixed Text",
        "ocr_select_title": "Select or Upload Doctor's Prescription",
        "ocr_review_title": "Clinical Safety Gate & Pharmacist Verification",
        "ocr_status_unverified": "🔴 STATUS: UNVERIFIED_REQUIRES_HUMAN_REVIEW",
        "ocr_status_simulated": "⚠️ STATUS: SIMULATED_REVIEW_ONLY",
        "voice_header": "Bilingual Clinical Voice AI Dictation Console",
        "voice_desc": "OpenAI Whisper-Tiny (39M) & Whisper-Base (74M) on RTX 5060 Ti GPU | Supports Bangla, English & Code-Switching",
        "voice_select_title": "Select Audio Dictation Utterance",
        "voice_run_title": "GPU Live Transcription & Linguistic Telemetry",
        "voice_mode_label": "Voice Input Language Mode / ভাষা মোড:",
        "voice_mode_auto": "Auto Detect (Recommended)",
        "voice_mode_bn": "বাংলা (Bengali)",
        "voice_mode_en": "English",
        "airgap_alert": "🔒 Mandatory Clinical EHR Air-Gap: Voice dictation cannot autonomously commit medical records or drug orders without clinician review."
    },
    "বাংলা": {
        "title": "স্বাস্থ্যসেতু এআই",
        "caption": "ShasthoSetu AI — মাল্টিমোডাল স্বাস্থ্যসেবা গবেষণা প্ল্যাটফর্ম",
        "telemetry_header": "হার্ডওয়্যার ও সিস্টেম টেলিমেট্রি",
        "tab_pcos": "🩺 পিসিওএস ক্লিনিক্যাল ট্রায়াজ",
        "tab_us": "🔬 ওভারিয়ান আল্ট্রাসাউন্ড ভিশন",
        "tab_measles": "🩻 হাম ও ভাইরাল চর্মরোগ",
        "tab_ocr": "📋 দ্বিভাষিক প্রেসক্রিপশন ওসিআর ও ফার্মাসিস্ট গেট",
        "tab_voice": "🎙️ দ্বিভাষিক ভয়েস এআই কনসোল",
        "tab_proofs": "📊 মাস্টার রিসার্চ ও অডিট প্রুফ",
        "safety_gates_title": "প্রধান ক্লিনিক্যাল সেফটি গেটসমূহ:",
        "gate_rotterdam": "রটারডাম মানদণ্ড গেট: এন্ডোক্রাইন ক্লাসিফায়ার",
        "gate_burst": "বার্স্ট-গ্রুপ আইসোলেশন: আল্ট্রাসাউন্ড ভিশন",
        "gate_measles": "কপলিক স্পট ও সেরোলজি সতর্কবার্তা: হাম ভিশন",
        "gate_ocr": "১০০% ফার্মাসিস্ট যাচাই: প্রেসক্রিপশন ওসিআর",
        "gate_voice": "ইএইচআর এয়ার-গ্যাপ: দ্বিভাষিক ভয়েস এআই",
        "ocr_header": "দ্বিভাষিক চিকিৎসকের প্রেসক্রিপশন ওসিআর ও ফার্মাসিস্ট যাচাই",
        "ocr_desc": "ইজি-ওসিআর ডিপ পাইপলাইন (['bn', 'en']) — এনভিডিয়া আরটিএক্স ৫০৬০ টিআই জিপিইউ | বাংলা, ইংরেজি ও মিশ্র ভাষা সমর্থিত",
        "ocr_select_title": "প্রেসক্রিপশন নির্বাচন অথবা আপলোড করুন",
        "ocr_review_title": "ক্লিনিক্যাল সেফটি গেট ও ফার্মাসিস্ট পর্যালোচনা",
        "ocr_status_unverified": "🔴 স্ট্যাটাস: যাচাইবিহীন — মানব ফার্মাসিস্টের পর্যালোচনা বাধ্যতামূলক",
        "ocr_status_simulated": "⚠️ স্ট্যাটাস: শুধুমাত্র ডেমো সিমুলেশন (গবেষণা প্রোটোটাইপ)",
        "voice_header": "দ্বিভাষিক ক্লিনিক্যাল ভয়েস ডিকটেশন কনসোল",
        "voice_desc": "হুইসপার-টাইনি (৩৯M) ও হুইসপার-বেস (৭৪M) — আরটিএক্স ৫০৬০ টিআই জিপিইউ | বাংলা, ইংরেজি ও মিশ্র কোড-সুইচিং সমর্থিত",
        "voice_select_title": "ভয়েস ডিকটেশন অডিও নির্বাচন বা আপলোড করুন",
        "voice_run_title": "লাইভ জিপিইউ ট্রান্সক্রিপশন ও ভাষাতাত্ত্বিক টেলিমেট্রি",
        "voice_mode_label": "ভয়েস ইনপুট ভাষা মোড নির্বাচন করুন:",
        "voice_mode_auto": "স্বয়ংক্রিয় শনাক্তকরণ (Auto Detect)",
        "voice_mode_bn": "বাংলা (Bengali)",
        "voice_mode_en": "English (ইংরেজি)",
        "airgap_alert": "🔒 বাধ্যতামূলক ক্লিনিক্যাল এয়ার-গ্যাপ: চিকিৎসকের যাচাই ছাড়া কোনো ভয়েস ড্রাফট সরাসরি রোগীর রেকর্ডে যাবে না।"
    }
}
t = I18N[ui_lang]

st.sidebar.markdown("---")
st.sidebar.subheader(t["telemetry_header"])
st.sidebar.success(f"**GPU:** {GPU_NAME}")
st.sidebar.info(f"**VRAM:** {VRAM_GB:.1f} GB Dedicated")
st.sidebar.code(f"PyTorch: {torch.__version__}\nCUDA: {torch.version.cuda}\nOS: Windows 11", language="text")

st.sidebar.markdown("---")
st.sidebar.markdown(f"""
**{t['safety_gates_title']}**
- 🔒 **{t['gate_rotterdam']}**
- 🔒 **{t['gate_burst']}**
- 🔒 **{t['gate_measles']}**
- 🔒 **{t['gate_ocr']}**
- 🔒 **{t['gate_voice']}**
""")

# Load Models (Cached for Performance)
@st.cache_resource
def load_pcos_clinical_model():
    p = os.path.join(BASE_DIR, "01_PCOS_Clinical", "audit_v2", "models", "model_best.joblib")
    if os.path.exists(p):
        return joblib.load(p)
    return None

@st.cache_resource
def load_ultrasound_model():
    p = os.path.join(BASE_DIR, "02_PCOS_Ultrasound", "models", "resnet18_best.pth")
    if os.path.exists(p):
        m = models.resnet18(weights=None)
        m.fc = nn.Linear(m.fc.in_features, 3)
        m.load_state_dict(torch.load(p, map_location=DEVICE))
        m.to(DEVICE)
        m.eval()
        return m
    return None

@st.cache_resource
def load_measles_model():
    p_grouped = os.path.join(BASE_DIR, "03_Measles_Viral_Rash", "models", "resnet18_grouped_best.pth")
    p_hist = os.path.join(BASE_DIR, "03_Measles_Viral_Rash", "models", "resnet18_best.pth")
    p = p_grouped if os.path.exists(p_grouped) else p_hist
    if os.path.exists(p):
        m = models.resnet18(weights=None)
        m.fc = nn.Linear(m.fc.in_features, 6)
        m.load_state_dict(torch.load(p, map_location=DEVICE))
        m.to(DEVICE)
        m.eval()
        return m, os.path.basename(p)
    return None, None

@st.cache_resource
def load_whisper_model(model_name="openai/whisper-tiny"):
    from transformers import WhisperProcessor, WhisperForConditionalGeneration
    p = WhisperProcessor.from_pretrained(model_name)
    m = WhisperForConditionalGeneration.from_pretrained(model_name).to(DEVICE)
    m.eval()
    return p, m

@st.cache_resource
def load_whisper_tiny():
    return load_whisper_model("openai/whisper-tiny")

@st.cache_resource
def load_easyocr_reader():
    import easyocr
    reader = easyocr.Reader(['bn', 'en'], gpu=(DEVICE != "cpu"))
    return reader

# Preprocessing Transforms
eval_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# Main Dashboard Navigation
tabs = st.tabs([
    t["tab_pcos"],
    t["tab_us"],
    t["tab_measles"],
    t["tab_ocr"],
    t["tab_voice"],
    t["tab_proofs"]
])

# ==============================================================================
# TAB 1: PCOS CLINICAL TABULAR ML
# ==============================================================================
with tabs[0]:
    st.header("PCOS Clinical Diagnostic Triage (Tabular ML)")
    st.markdown("""
    **Model:** Optimized XGBoost Classifier (Trained & Audited V2)  
    **Evaluation:** 50-Fold Repeated Stratified Cross-Validation (**88.57% BalAcc**, **88.39% Macro F1**) | Held-Out Test (N=18): **94.44% BalAcc, 94.43% F1**
    """)
    
    col1, col2 = st.columns([1, 1.2])
    with col1:
        st.subheader("Patient Clinical & Endocrine Biomarkers")
        preset = st.radio("Load Preset Clinical Case:", ["Custom Input", "Case 1: Confirmed PCOS Patient", "Case 2: Healthy Control Patient"], horizontal=True)
        
        # Presets based on typical dataset profiles
        if preset == "Case 1: Confirmed PCOS Patient":
            v_age, v_bmi, v_e2, v_test, v_lh, v_fsh, v_homa = 26, 29.4, 21.5, 3.8, 12.4, 4.2, 3.2
        elif preset == "Case 2: Healthy Control Patient":
            v_age, v_bmi, v_e2, v_test, v_lh, v_fsh, v_homa = 28, 22.1, 84.0, 1.1, 4.8, 5.2, 1.1
        else:
            v_age, v_bmi, v_e2, v_test, v_lh, v_fsh, v_homa = 27, 25.0, 50.0, 2.0, 7.0, 5.0, 2.0
            
        c_a, c_b = st.columns(2)
        with c_a:
            age = st.slider("Age (years)", 18, 45, v_age)
            bmi = st.slider("BMI (kg/m²)", 15.0, 45.0, float(v_bmi), 0.1)
            e2 = st.number_input("Estradiol / E2 (pg/mL) [Top Biomarker]", 5.0, 250.0, float(v_e2), 1.0)
            testosterone = st.number_input("Testosterone (ng/mL)", 0.2, 10.0, float(v_test), 0.1)
        with c_b:
            lh = st.number_input("LH (mIU/mL)", 1.0, 40.0, float(v_lh), 0.5)
            fsh = st.number_input("FSH (mIU/mL)", 1.0, 20.0, float(v_fsh), 0.5)
            homa_ir = st.number_input("HOMA-IR (Insulin Resistance)", 0.5, 12.0, float(v_homa), 0.1)
            glucose = st.number_input("Fasting Glucose (mg/dL)", 60, 220, 95)
            
        # Additional default clinical parameters
        androstenedione = 2.5
        sdhea = 180.0
        waist_circumference = 82.0
        prl = 15.0
        oh_prog_17 = 1.2
        sbp = 118.0
        dbp = 76.0
        total_cholesterol = 185.0
        triglycerides = 120.0
        hdl_c = 48.0
        ldl_c = 110.0
        vit_d_25oh = 22.0
        
        btn_pred_clin = st.button("Run Clinical Triage Inference", type="primary")

    with col2:
        st.subheader("Diagnostic Risk Assessment")
        if btn_pred_clin:
            pipe = load_pcos_clinical_model()
            if pipe:
                row_dict = {
                    'age': age, 'testosterone': testosterone, 'androstenedione': androstenedione,
                    'sdhea': sdhea, 'waist_circumference': waist_circumference, 'bmi': bmi,
                    'fsh': fsh, 'lh': lh, 'prl': prl, 'homa_ir': homa_ir, 'e2': e2,
                    'oh_prog_17': oh_prog_17, 'sbp': sbp, 'dbp': dbp, 'glucose': glucose,
                    'total_cholesterol': total_cholesterol, 'triglycerides': triglycerides,
                    'hdl_c': hdl_c, 'ldl_c': ldl_c, 'vit_d_25oh': vit_d_25oh
                }
                df_input = pd.DataFrame([row_dict])
                prob = pipe.predict_proba(df_input)[0][1]
                pred_label = "PCOS Risk Detected" if prob >= 0.5 else "Low PCOS Probability (Control)"
                
                if prob >= 0.5:
                    st.error(f"### Result: {pred_label}")
                else:
                    st.success(f"### Result: {pred_label}")
                    
                st.progress(float(prob))
                st.write(f"**PCOS Risk Probability:** `{prob*100:.1f}%`")
                
                # Permutation Feature Importance Insight
                st.info("""
                **Key Predictive Driver: Estradiol (`e2`)**
                - Permutation Importance Drop: **0.4408** | XGBoost Feature Gain: **0.3283**
                - Low or uncoupled Estradiol relative to LH/FSH ratio is the primary biochemical indicator in this cohort.
                """)
                
                st.warning("""
                **Rotterdam Diagnostic Criteria Mandate:**
                Endocrine and metabolic biomarkers provide supportive screening evidence only. A clinical diagnosis of Polycystic Ovary Syndrome (PCOS) requires at least two of the following three criteria:
                1. Oligo- or anovulation (irregular menstrual cycles).
                2. Clinical and/or biochemical signs of hyperandrogenism.
                3. Polycystic ovarian morphology confirmed on pelvic ultrasound (Tab 2).
                """)

# ==============================================================================
# TAB 2: BEDSORE OVARIAN ULTRASOUND VISION
# ==============================================================================
with tabs[1]:
    st.header("Bedside Ovarian Ultrasound Vision")
    st.markdown("""
    **Model:** Fine-Tuned ResNet18 (NVIDIA RTX 5060 Ti GPU)  
    **Evaluation:** 15-Fold Repeated Stratified Group CV (**84.53% BalAcc**, **85.42% Macro F1**) | Held-Out Test (N=45): **86.24% BalAcc, 87.70% Macro F1**
    """)
    
    col1, col2 = st.columns([1, 1.2])
    with col1:
        st.subheader("Select or Upload Pelvic Ultrasound Scan")
        us_dir = os.path.join(BASE_DIR, "02_PCOS_Ultrasound", "data", "raw", "extracted")
        sample_options = {
            "Select a sample scan": None,
            "Sample 1: Polycystic Ovary (PCO)": os.path.join(us_dir, "PCO", "PCO_1.jpg"),
            "Sample 2: Dominant Follicle": os.path.join(us_dir, "Dominant_Follicle", "Dominant_Follicle_1.jpg"),
            "Sample 3: Normal Ovary": os.path.join(us_dir, "Normal", "Normal_1.jpg")
        }
        chosen_us = st.selectbox("Preset Ultrasound Samples:", list(sample_options.keys()))
        uploaded_us = st.file_uploader("Or upload patient ultrasound DICOM/JPEG:", type=["jpg", "jpeg", "png"])
        
        img_us = None
        if uploaded_us:
            img_us = Image.open(uploaded_us).convert("RGB")
        elif chosen_us and sample_options[chosen_us] and os.path.exists(sample_options[chosen_us]):
            img_us = Image.open(sample_options[chosen_us]).convert("RGB")
            
        if img_us:
            st.image(img_us, caption="Input Ultrasound Scan", use_container_width=True)
            
    with col2:
        st.subheader("Morphological Classification")
        if img_us:
            m_us = load_ultrasound_model()
            if m_us:
                tensor_us = eval_transform(img_us).unsqueeze(0).to(DEVICE)
                with torch.no_grad():
                    t0 = time.time()
                    logits = m_us(tensor_us)
                    probs = torch.softmax(logits, dim=1)[0].cpu().numpy()
                    lat_ms = (time.time() - t0) * 1000
                    
                classes_us = ["Dominant_Follicle", "Normal", "PCO"]
                pred_idx = int(np.argmax(probs))
                pred_class = classes_us[pred_idx]
                
                st.write(f"**Inference Latency:** `{lat_ms:.1f} ms` on RTX 5060 Ti GPU")
                df_probs = pd.DataFrame({
                    "Class": classes_us,
                    "Probability": [p * 100 for p in probs]
                })
                st.bar_chart(df_probs.set_index("Class"))
                
                if pred_class == "PCO":
                    st.error(f"### Morphology: Polycystic Ovarian Pattern ({probs[pred_idx]*100:.1f}%)")
                elif pred_class == "Dominant_Follicle":
                    st.info(f"### Morphology: Dominant Follicle Detected ({probs[pred_idx]*100:.1f}%)")
                else:
                    st.success(f"### Morphology: Normal Ovarian Appearance ({probs[pred_idx]*100:.1f}%)")
                    
                st.warning("""
                **Scientific Audit Notice (Near-Duplicate Frame Bursts):**
                Perceptual hash analysis revealed 24 near-duplicate image pairs (pHash $\le 6$, pixel correlation up to 0.9981) in public ultrasound cine-loops. A naive random split leaks consecutive sweeps. ShasthoSetu AI isolates sweeps via Group CV (**84.53% BalAcc**). Furthermore, ultrasound morphology indicates appearance only; diagnosis requires correlation with endocrine criteria.
                """)

# ==============================================================================
# TAB 3: MEASLES & VIRAL EXANTHEM VISION
# ==============================================================================
with tabs[2]:
    st.header("Pediatric Viral Dermatology & Measles Early Warning")
    st.markdown("""
    **Architecture:** PyTorch ResNet18 (NVIDIA RTX 5060 Ti 16GB GPU)  
    **Dataset:** MCVSLD Clean Deduplicated Archive (10,384 Images, 755 Source-Family Photographs)  
    **Audited Generalization (Unseen Source-Families N=1,561 crops):** **83.34% Accuracy**, **85.09% Balanced Accuracy**, **82.62% Macro F1** | **Measles Recall: 80.91% (89/110 detected)**  
    **Family-Level Majority Vote (N=114 families):** **85.09% Accuracy**, **84.38% Macro F1** | **Measles Detection: 6/8 Unseen Families (75.0%)**
    """)
    
    with st.expander("🔬 Forensic Audit: Historical Data Leakage vs. Group-Isolated Split", expanded=False):
        st.markdown("""
        - **Historical Contaminated Split:** Initial image-level split reported **99.10% accuracy**. Forensic token analysis revealed that all 10,384 images derived from 755 original photographs (`[CLASS]_[CASE]_[PHOTO]_[CROP].jpg`). In that split, **100% of test images (1,558/1,558)** shared source-family photos with the training set, producing overfitted crop memorization.
        - **Corrected Group-Isolated Split:** Partitioned by source-family ID (`clean_grouped_split_manifest.csv`) with **0.0% overlap** across splits. The un-inflated generalization accuracy on genuine unseen lesions is **83.34%**.
        """)
    
    col1, col2 = st.columns([1, 1.2])
    with col1:
        st.subheader("Select or Upload Pediatric Skin Lesion")
        measles_base = os.path.join(BASE_DIR, "03_Measles_Viral_Rash", "data", "raw", "extracted", "Skin Lesion Dataset", "test")
        sample_rash_options = {
            "Select sample rash lesion": None,
            "Sample 1: Measles Maculopapular Rash": os.path.join(measles_base, "Measles", "001.jpg"),
            "Sample 2: Chickenpox Vesicles": os.path.join(measles_base, "Chickenpox", "001.jpg"),
            "Sample 3: Monkeypox Pustules": os.path.join(measles_base, "Monkeypox", "001.jpg"),
            "Sample 4: Hand-Foot-Mouth Disease (HFMD)": os.path.join(measles_base, "HFMD", "001.jpg"),
            "Sample 5: Healthy Pediatric Skin": os.path.join(measles_base, "Healthy", "001.jpg")
        }
        chosen_rash = st.selectbox("Preset Lesion Samples:", list(sample_rash_options.keys()))
        uploaded_rash = st.file_uploader("Or upload patient skin lesion photo:", type=["jpg", "jpeg", "png"])
        
        img_rash = None
        if uploaded_rash:
            img_rash = Image.open(uploaded_rash).convert("RGB")
        elif chosen_rash and sample_rash_options[chosen_rash] and os.path.exists(sample_rash_options[chosen_rash]):
            img_rash = Image.open(sample_rash_options[chosen_rash]).convert("RGB")
            
        if img_rash:
            st.image(img_rash, caption="Dermatological Presentation", use_container_width=True)

    with col2:
        st.subheader("6-Class Viral Differential Diagnosis")
        if img_rash:
            m_rash, model_name = load_measles_model()
            if m_rash:
                tensor_rash = eval_transform(img_rash).unsqueeze(0).to(DEVICE)
                with torch.no_grad():
                    t0 = time.time()
                    logits = m_rash(tensor_rash)
                    probs = torch.softmax(logits, dim=1)[0].cpu().numpy()
                    lat_ms = (time.time() - t0) * 1000
                    
                classes_rash = ["Chickenpox", "Cowpox", "HFMD", "Healthy", "Measles", "Monkeypox"]
                pred_idx = int(np.argmax(probs))
                pred_label = classes_rash[pred_idx]
                
                st.write(f"**Loaded Checkpoint:** `{model_name}` | **Latency:** `{lat_ms:.1f} ms` on RTX 5060 Ti GPU")
                df_rash = pd.DataFrame({
                    "Condition": classes_rash,
                    "Probability": [p * 100 for p in probs]
                })
                st.bar_chart(df_rash.set_index("Condition"))
                
                if pred_label == "Measles":
                    st.error(f"### 🚨 HIGH PRIORITY ALERT: Measles Pattern Identified ({probs[pred_idx]*100:.1f}%)")
                    st.markdown("""
                    **Mandatory Rural Outbreak Triage Protocol:**
                    - Immediate patient isolation / quarantine alert.
                    - Check buccal mucosa for **Koplik spots** (pathognomonic enanthem).
                    - Confirm prodromal triad: Cough, Coryza, Conjunctivitis (3 Cs) + High Fever.
                    - Order mandatory serum Measles IgM / RT-PCR confirmation before official epidemiologic reporting.
                    """)
                else:
                    st.info(f"### Diagnostic Indication: {pred_label} ({probs[pred_idx]*100:.1f}%)")
                    
                st.warning("""
                **Clinical Scope Caveat (113/114 Web-Scraped Image Crops):**
                The reported 99.12% Measles sensitivity represents 113 out of 114 Measles-labelled web crops, NOT 114 clinically confirmed patients. An algorithmic audit revealed ~38.5% perceptual near-duplicates (pHash $\le 4$) in online exanthem datasets. Static 2D image classification cannot replace clinical pediatric workup.
                """)

# ==============================================================================
# TAB 4: PRESCRIPTION OCR & PHARMACIST DASHBOARD
# ==============================================================================
with tabs[3]:
    st.header(t["ocr_header"])
    st.markdown(t["ocr_desc"])
    
    # Import Safety Gate V2 from Patch V1
    SRC_PATCH_V1 = os.path.join(BASE_DIR, "04_Prescription_OCR", "final_integration", "patch_v1", "src")
    if SRC_PATCH_V1 not in sys.path:
        sys.path.insert(0, SRC_PATCH_V1)
        
    try:
        from safety_gate_v2 import (
            PrescriptionDocument,
            UnverifiedMedicationCandidate,
            MedicationReminderService,
            ExecutionMode,
            ClinicalSafetyViolationError,
            IncompleteReviewError,
            MalformedUploadError,
            validate_file_upload,
            sanitize_log_message
        )
        has_safety_gate = True
    except Exception as e:
        has_safety_gate = False
        st.warning(f"Safety Gate module notice: {e}")

    col1, col2 = st.columns([1, 1.2])
    with col1:
        st.subheader(t["ocr_select_title"])
        ocr_images_dir = os.path.join(BASE_DIR, "04_Prescription_OCR", "data", "raw", "extracted", "images", "Prescription_ images.jpg")
        sample_rx = {
            "Select sample prescription" if ui_lang == "English" else "প্রেসক্রিপশন নির্বাচন করুন": None,
            "Sample 1: Rx 0052 (Bilingual Multi-line Prescription / দ্বিভাষিক প্রেসক্রিপশন)": os.path.join(ocr_images_dir, "0052.jpg"),
            "Sample 2: Rx 0001 (General Practice Consultation / সাধারণ চিকিৎসাপত্র)": os.path.join(ocr_images_dir, "0001.jpg"),
            "Sample 3: Rx 0010 (Clinical Shorthand Consultation / ক্লিনিক্যাল প্রেসক্রিপশন)": os.path.join(ocr_images_dir, "0010.jpg")
        }
        chosen_rx = st.selectbox("Preset Prescriptions (Admissible Cohort):" if ui_lang == "English" else "অনুমোদিত স্যাম্পল প্রেসক্রিপশনসমূহ:", list(sample_rx.keys()))
        uploaded_rx = st.file_uploader("Or upload photo of prescription (Max 15MB, JPEG/PNG):" if ui_lang == "English" else "অথবা প্রেসক্রিপশনের ছবি আপলোড করুন (সর্বোচ্চ ১৫MB):", type=["jpg", "jpeg", "png"])
        
        img_rx = None
        rx_path = None
        upload_error = None
        
        if uploaded_rx:
            file_bytes = uploaded_rx.getvalue()
            if has_safety_gate:
                try:
                    validate_file_upload(file_bytes, uploaded_rx.name)
                    img_rx = Image.open(uploaded_rx).convert("RGB")
                except MalformedUploadError as mue:
                    upload_error = str(mue)
                    st.error(f"Upload Security Rejection: {upload_error}")
            else:
                img_rx = Image.open(uploaded_rx).convert("RGB")
        elif chosen_rx and sample_rx[chosen_rx] and os.path.exists(sample_rx[chosen_rx]):
            img_rx = Image.open(sample_rx[chosen_rx]).convert("RGB")
            rx_path = sample_rx[chosen_rx]
            
        if img_rx:
            st.image(img_rx, caption="Handwritten Prescription Image" if ui_lang == "English" else "হস্তলিখিত প্রেসক্রিপশন চিত্র", use_container_width=True)
            
            # OCR Inference Trigger
            btn_ocr_txt = "🚀 Run Real GPU EasyOCR Pipeline (RTX 5060 Ti)" if ui_lang == "English" else "🚀 লাইভ জিপিইউ ইজি-ওসিআর রান করুন (RTX 5060 Ti)"
            if st.button(btn_ocr_txt, type="primary"):
                with st.spinner("Executing EasyOCR bilingual deep recognition on RTX 5060 Ti GPU..."):
                    reader = load_easyocr_reader()
                    np_img = np.array(img_rx)
                    t0 = time.time()
                    ocr_results = reader.readtext(np_img)
                    lat_ms = (time.time() - t0) * 1000
                    
                    st.session_state["ocr_results"] = ocr_results
                    st.session_state["ocr_latency_ms"] = lat_ms
                    st.session_state["ocr_performed"] = True

    with col2:
        st.subheader(t["ocr_review_title"])
        if img_rx and not upload_error:
            # 1. Mandatory Pre-Review Safety Status
            st.error(f"### {t['ocr_status_unverified']}")
            st.markdown("""
            **Mandatory Clinical Safety Gates Active:**
            - 🔒 **Automated Reminders:** `DISABLED (Hard-Locked to False)`
            - 🔒 **Live EHR Orders:** `DISABLED (Air-Gapped)`
            - 🔒 **Missing Dose Inference:** `STRICTLY PROHIBITED`
            - 🔒 **Execution Mode:** `RESEARCH_DEMO (SIMULATED_REVIEW_ONLY)`
            """ if ui_lang == "English" else """
            **সক্রিয় ক্লিনিক্যাল সেফটি গেটসমূহ:**
            - 🔒 **স্বয়ংক্রিয় রিমাইন্ডার:** `সম্পূর্ণ নিষ্ক্রিয় (Hard-Locked)`
            - 🔒 **লাইভ ইএইচআর অর্ডার:** `সম্পূর্ণ নিষ্ক্রিয় (Air-Gapped)`
            - 🔒 **অনুপস্থিত ডোজ অনুমান:** `কঠোরভাবে নিষিদ্ধ`
            - 🔒 **এক্সিকিউশন মোড:** `গবেষণা ডেমো (SIMULATED_REVIEW_ONLY)`
            """)
            
            # 2. Live OCR Results Display if Executed
            if st.session_state.get("ocr_performed", False):
                results = st.session_state.get("ocr_results", [])
                lat = st.session_state.get("ocr_latency_ms", 0.0)
                st.success(f"**GPU Inference Complete:** `{lat:.1f} ms` | Detected `{len(results)}` text bounding boxes." if ui_lang == "English" else f"**জিপিইউ ইনফারেন্স সম্পন্ন:** `{lat:.1f} ms` | `{len(results)}`টি টেক্সট বক্স শনাক্ত হয়েছে।")
                
                # Raw text preview with confidence
                with st.expander("🔍 View Raw OCR Detections & Confidence Scores" if ui_lang == "English" else "🔍 শনাক্তকৃত টেক্সট ও কনফিডেন্স স্কোর দেখুন", expanded=False):
                    if results:
                        table_data = []
                        for bbox, text, conf in results:
                            flag = "⚠️ Low (<0.60)" if conf < 0.60 else "Normal"
                            has_bn = any(0x0980 <= ord(c) <= 0x09FF for c in text)
                            has_en = any(c.isascii() and c.isalpha() for c in text)
                            script = "Mixed" if (has_bn and has_en) else ("Bangla" if has_bn else ("English" if has_en else "Symbol/Num"))
                            table_data.append({"Text": text, "Confidence": f"{conf*100:.1f}%", "Script": script, "Uncertainty Flag": flag})
                        st.dataframe(pd.DataFrame(table_data), use_container_width=True)
                    else:
                        st.info("No text detected by EasyOCR on this image." if ui_lang == "English" else "কোনো টেক্সট শনাক্ত করা যায়নি।")
                        
                detected_text_lines = [r[1] for r in results]
                full_raw_text = " | ".join(detected_text_lines[:8])
            else:
                full_raw_text = "Run OCR to extract text from image."

            # 3. Interactive Human Review UI (Simulated Demo Only)
            st.markdown("#### Assistive Prescription Draft (Human-in-the-Loop):" if ui_lang == "English" else "#### সহায়ক প্রেসক্রিপশন ড্রাফট (মানব পর্যালোচনা):")
            
            draft_med = st.text_input("1. Medication Name(s) [English / বাংলা]:" if ui_lang == "English" else "১. ওষুধের নাম (English / বাংলা):", value="Cap. Roxim 400mg + Tab. Rolac 10mg")
            draft_sig = st.text_input("2. Instructions / Sig (As explicitly written):" if ui_lang == "English" else "২. সেবনবিধি / নির্দেশনা (যেমন লেখা আছে):", value="১+০+১ (সকাল ও রাতে খাবার পর) — ৭ দিন")
            draft_warning = st.text_input("3. Clinical Safety / Dosage Warning:" if ui_lang == "English" else "৩. ক্লিনিক্যাল সেফটি / ডোজ সতর্কবার্তা:", value="Cap Roxim: Take with full glass of water. Do not exceed prescribed duration.")
            
            st.caption("Fictional Test Identity: `SIM_PHARMACIST_DEMO_01` (Unauthenticated Demonstration)" if ui_lang == "English" else "কাল্পনিক টেস্ট আইডি: `SIM_PHARMACIST_DEMO_01` (অননুমোদিত ডেমো)")
            
            chk_verified = st.checkbox("I have cross-checked this draft against the raw prescription image." if ui_lang == "English" else "আমি মূল প্রেসক্রিপশন ছবির সাথে এই ড্রাফট মিলিয়ে দেখেছি।", key="chk_crosscheck")
            chk_no_infer = st.checkbox("I confirm no dosage, route, or frequency was automatically inferred." if ui_lang == "English" else "আমি নিশ্চিত করছি যে অনুপস্থিত কোনো ডোজ বা নিয়ম এআই অনুমান করেনি।", key="chk_no_infer")
            
            c_btn1, c_btn2, c_btn3 = st.columns([1, 1, 1.2])
            with c_btn1:
                if st.button("Simulate Approval" if ui_lang == "English" else "সিমুলেটেড অনুমোদন", type="primary"):
                    if not (chk_verified and chk_no_infer):
                        st.error("Cannot simulate sign-off: Both safety checkboxes must be verified." if ui_lang == "English" else "অনুমোদন ব্যর্থ: উভয় নিরাপত্তা চেকবক্স পূরণ আবশ্যক।")
                    else:
                        st.warning(f"### {t['ocr_status_simulated']}")
                        st.markdown("""
                        **Review Completed in Demonstration Mode:**
                        - Outcome tagged as `SIMULATED_REVIEW_ONLY`.
                        - **No real SMS or patient notifications were dispatched.**
                        - **No live EHR orders or database writes were performed.**
                        - Medication reminder service remains hard-locked to `False`.
                        """ if ui_lang == "English" else """
                        **ডেমো মোডে পর্যালোচনা সম্পন্ন:**
                        - ফলাফলটি `SIMULATED_REVIEW_ONLY` হিসেবে চিহ্নিত।
                        - **রোগীকে কোনো বাস্তব এসএমএস বা নোটিফিকেশন পাঠানো হয়নি।**
                        - **ডাটাবেস বা ইএইচআর-এ কোনো অর্ডার যুক্ত করা হয়নি।**
                        - স্বয়ংক্রিয় রিমাইন্ডার সার্ভিস সম্পূর্ণ বন্ধ রয়েছে।
                        """)
            with c_btn2:
                if st.button("Reject / Flag Illegible" if ui_lang == "English" else "অস্পষ্ট / প্রত্যাখ্যান"):
                    st.info("### 🛑 Prescribing Alert: Illegible Prescription" if ui_lang == "English" else "### 🛑 প্রেসক্রিপশন সতর্কবার্তা: অস্পষ্ট হস্তাক্ষর")
                    st.markdown("Prescription flagged and returned to prescriber for clarification." if ui_lang == "English" else "প্রেসক্রিপশনটি অস্পষ্ট হিসেবে চিহ্নিত এবং চিকিৎসকের কাছে মৌখিক যাচাইয়ের জন্য ফেরত পাঠানো হয়েছে।")
                    
            with c_btn3:
                if st.button("🚨 Test Safety Gate (Bypass Attempt)" if ui_lang == "English" else "🚨 সেফটি গেট বাইপাস টেস্ট"):
                    if has_safety_gate:
                        cand = UnverifiedMedicationCandidate(
                            candidate_id=1,
                            raw_text="Cap. Roxim 400mg",
                            medicine_name="Roxim",
                            strength="400mg",
                            frequency="BID",
                            duration="5 days",
                            confidence=0.95
                        )
                        doc = PrescriptionDocument(
                            prescription_id="DEMO_TEST_BYPASS",
                            filename="0052.jpg",
                            candidates=[cand],
                            mode=ExecutionMode.RESEARCH_DEMO
                        )
                        doc.simulate_human_review(
                            reviewer_id="TEST_USER",
                            reviewer_name="Demo Pharmacist",
                            corrected_orders=[{"medicine_name": "Roxim", "frequency": "BID"}],
                            legal_declaration_signed=True
                        )
                        service = MedicationReminderService(mode=ExecutionMode.RESEARCH_DEMO)
                        try:
                            service.create_actionable_schedule(doc)
                            st.error("Vulnerability Detected: Safety Gate failed to block reminder!")
                        except ClinicalSafetyViolationError as csve:
                            st.success(f"**Backend Defense-in-Depth Verified:**\n`{str(csve)}`")
                    else:
                        st.warning("Safety gate module not loaded.")
                        
            st.info("""
            **Scientific & Regulatory Caveat (Bilingual Reality):**
            - Prescriptions contain Bengali clinical instructions alongside English brand names and abbreviations.
            - EasyOCR strictly preserves both Bengali Unicode and English ASCII characters without unwanted cross-translation.
            - ShasthoSetu AI strictly enforces simulated review only in demonstration mode; live clinical orders and automated reminders are permanently disabled.
            """)

# ==============================================================================
# TAB 5: BILINGUAL VOICE AI CONSOLE
# ==============================================================================
with tabs[4]:
    st.header(t["voice_header"])
    st.markdown(t["voice_desc"])
    
    col1, col2 = st.columns([1, 1.2])
    with col1:
        st.subheader(t["voice_select_title"])
        
        # Model Selection
        model_choice = st.selectbox(
            "Whisper Model Architecture / মডেল নির্বাচন:" if ui_lang == "English" else "হুইসপার মডেল নির্বাচন করুন:",
            ["Whisper-Base (74M, Recommended — 100% LID)", "Whisper-Tiny (39M, Lightweight)"]
        )
        selected_model_id = "openai/whisper-base" if "Base" in model_choice else "openai/whisper-tiny"
        
        # Voice Input Language Option (Auto-detect, bn, en)
        v_mode_selected = st.radio(
            t["voice_mode_label"],
            [t["voice_mode_auto"], t["voice_mode_bn"], t["voice_mode_en"]],
            horizontal=True
        )
        
        # Audio Presets covering Bangla, English and Mixed
        bilingual_data_dir = os.path.join(BASE_DIR, "05_Bangla_Voice_AI", "data", "bilingual_test")
        sample_audio_opts = {
            "Select sample utterance" if ui_lang == "English" else "স্যাম্পল অডিও নির্বাচন করুন": None,
            "Cohort 1: Spoken Bengali (বাংলা ডিকটেশন - FLEURS)": os.path.join(bilingual_data_dir, "bn_sample_01.wav"),
            "Cohort 2: Spoken English Clinical (ইংরেজি ভাইটালস ও আইসিইউ)": os.path.join(bilingual_data_dir, "en_clinical_01.wav"),
            "Cohort 3: Mixed Code-Switching (মিশ্র বাংলা-ইংরেজি প্রেসক্রিপশন)": os.path.join(bilingual_data_dir, "mix_codeswitch_01.wav")
        }
        chosen_audio = st.selectbox("Preset Clinical Utterances:" if ui_lang == "English" else "ক্লিনিক্যাল ডিকটেশন স্যাম্পলসমূহ:", list(sample_audio_opts.keys()))
        uploaded_audio = st.file_uploader("Or upload 16kHz WAV voice clip:" if ui_lang == "English" else "অথবা ১৬kHz WAV ভয়েস ক্লিপ আপলোড করুন:", type=["wav"])
        
        audio_path_selected = None
        if uploaded_audio:
            audio_path_selected = uploaded_audio
            st.audio(uploaded_audio)
        elif chosen_audio and sample_audio_opts[chosen_audio] and os.path.exists(sample_audio_opts[chosen_audio]):
            audio_path_selected = sample_audio_opts[chosen_audio]
            st.audio(audio_path_selected)

    with col2:
        st.subheader(t["voice_run_title"])
        if audio_path_selected:
            btn_v_txt = "Transcribe on RTX 5060 Ti GPU" if ui_lang == "English" else "আরটিএক্স ৫০৬০ টিআই-তে ট্রান্সক্রাইব করুন"
            if st.button(btn_v_txt, type="primary"):
                import soundfile as sf
                with st.spinner(f"Loading {selected_model_id} and transcribing on GPU..."):
                    p_wh, m_wh = load_whisper_model(selected_model_id)
                    audio_data, sr = sf.read(audio_path_selected)
                    
                    # Convert to mono if needed
                    if audio_data.ndim > 1:
                        audio_data = audio_data.mean(axis=1)
                    if sr != 16000:
                        import scipy.signal
                        num_samples = int(len(audio_data) * 16000 / sr)
                        audio_data = scipy.signal.resample(audio_data, num_samples)
                        sr = 16000
                    audio_data = audio_data.astype(np.float32)
                    
                    t0 = time.time()
                    inputs = p_wh(audio_data, sampling_rate=sr, return_tensors="pt").input_features.to(DEVICE)
                    
                    gen_kwargs = {
                        "task": "transcribe",
                        "return_dict_in_generate": True,
                        "max_new_tokens": 128
                    }
                    if v_mode_selected == t["voice_mode_bn"]:
                        gen_kwargs["language"] = "bengali"
                    elif v_mode_selected == t["voice_mode_en"]:
                        gen_kwargs["language"] = "english"
                        
                    with torch.no_grad():
                        gen_out = m_wh.generate(inputs, **gen_kwargs)
                        
                    lat_sec = time.time() - t0
                    seq = gen_out.sequences[0]
                    toks = p_wh.tokenizer.convert_ids_to_tokens(seq[:5])
                    detected_tok = toks[1] if len(toks) > 1 and toks[1].startswith("<|") else "unknown"
                    pred_txt = p_wh.batch_decode(gen_out.sequences, skip_special_tokens=True)[0].strip()
                    duration_sec = len(audio_data) / sr
                    speedup = duration_sec / max(lat_sec, 0.001)
                    
                    st.success(f"**GPU Inference Complete:** `{lat_sec:.3f} s` for `{duration_sec:.1f} s` audio (**{speedup:.1f}x real-time speedup**)")
                    
                    # Telemetry Metrics
                    m1, m2, m3 = st.columns(3)
                    with m1:
                        st.metric("Detected Language Token", detected_tok)
                    with m2:
                        bengali_chars = sum(1 for c in pred_txt if 0x0980 <= ord(c) <= 0x09FF)
                        bn_pct = (bengali_chars / max(len(pred_txt), 1)) * 100
                        st.metric("Bangla Unicode %", f"{bn_pct:.1f}%")
                    with m3:
                        english_chars = sum(1 for c in pred_txt if c.isascii() and c.isalpha())
                        en_pct = (english_chars / max(len(pred_txt), 1)) * 100
                        st.metric("English Latin %", f"{en_pct:.1f}%")
                        
                    st.markdown(f"**Transcription Output ({selected_model_id}):**\n```text\n{pred_txt}\n```")
                    
                    # Medical Terminology Preservation Check
                    clinical_keywords = ["blood pressure", "120", "80", "heart rate", "amoxicillin", "500", "fever", "cough", "icu", "ecg", "creatinine", "moxacil", "napa"]
                    preserved = [kw for kw in clinical_keywords if kw in pred_txt.lower()]
                    if preserved:
                        st.info(f"🩺 **Preserved Clinical Keywords:** `{', '.join(preserved)}`")
                        
                    # Physician Human-in-the-Loop Verification
                    st.markdown("#### Physician Clinical Review & Dictation Editing:")
                    edited_note = st.text_area("Review and Edit Clinical Transcription Draft:", value=pred_txt, height=100)
                    
                    st.warning(t["airgap_alert"])
                    
                    st.info("""
                    **Bilingual Voice AI Telemetry & Findings:**
                    - Whisper-Base achieves 100% LID accuracy between Spoken Bengali (`<|bn|>`) and Spoken English (`<|en|>`).
                    - Genuine English medical terms spoken inside clinical dictation are accurately preserved.
                    - Bengali speech transcribed by zero-shot models exhibits Latin transliteration (*Banglish*) drift; human physician editing is required before any EHR entry.
                    """)

# ==============================================================================
# TAB 6: MASTER RESEARCH AUDIT & PROOFS
# ==============================================================================
with tabs[5]:
    st.header("Master Research Audit & Proofs Center")
    st.markdown("""
    All experiments across 5 primary datasets and the DermoPed pediatric appendix have been audited, version-controlled, and packaged on local disk.
    """)
    
    matrix_path = os.path.join(BASE_DIR, "_reports", "final_qa", "MODULE_COMPLETION_MATRIX.csv")
    if os.path.exists(matrix_path):
        df_mat = pd.read_csv(matrix_path)
        st.subheader("Multi-Modal Module Completion Matrix")
        st.dataframe(df_mat, use_container_width=True)
        
    st.markdown("---")
    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Master Proofs Package (Omnibus)")
        master_zip = os.path.join(BASE_DIR, "_reports", "MASTER_PROOFS.zip")
        if os.path.exists(master_zip):
            sz_mb = os.path.getsize(master_zip) / (1024**2)
            st.success(f"Locked Package: `MASTER_PROOFS.zip` ({sz_mb:.2f} MB)")
            st.markdown(f"Local Path: `file:///{master_zip.replace(os.sep, '/')}`")
            with open(master_zip, "rb") as fz:
                st.download_button("Download Omnibus Proofs Package", fz, file_name="ShasthoSetu_MASTER_PROOFS.zip", mime="application/zip")
                
    with c2:
        st.subheader("Corrected Research Evidence V2 & Audit Artifacts")
        st.markdown("""
        - 📄 [Bilingual Voice AI Benchmark Report](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/proofs/BILINGUAL_VOICE_BENCHMARK_REPORT.md)
        - 📄 [Bilingual Prescription OCR Audit](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/final_integration/patch_v1/proofs/BILINGUAL_PRESCRIPTION_OCR_AUDIT.md)
        - 📄 [Canonical Split Audit (Patch V1)](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/final_integration/patch_v1/CANONICAL_SPLIT_AUDIT.md)
        - 📄 [Prescription Safety Authorization Report](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/final_integration/patch_v1/SAFETY_AUTHORIZATION_REPORT.md)
        - 📄 [Real E2E Test Results (Patch V1)](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/final_integration/patch_v1/REAL_E2E_TEST_RESULTS.md)
        - 📦 [Patch V1 Complete Proofs Package](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/final_integration/patch_v1/proofs/PATCH_V1_PROOFS.zip)
        - 📄 [Master Multimodal Research Report](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/corrected_submission_v2/UPDATED_MASTER_EXPERIMENT_REPORT.md)
        - 📄 [Critical Leakage Findings (MCVSLD)](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/corrected_submission_v2/CRITICAL_LEAKAGE_FINDINGS.md)
        - 📄 [MCVSLD Grouped Evaluation Report](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/corrected_submission_v2/MCVSLD_GROUPED_EVALUATION.md)
        - 📄 [PCOS Ultrasound Group Audit](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/corrected_submission_v2/PCOS_ULTRASOUND_GROUP_AUDIT.md)
        - 📄 [Prescription OCR Evidence Status](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/corrected_submission_v2/OCR_CURRENT_EVIDENCE_STATUS.md)
        - 📄 [Bangla Voice AI Reproducibility Audit](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/corrected_submission_v2/VOICE_REPRODUCIBILITY_AUDIT.md)
        - 📄 [Proof Archive Completeness Report](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/corrected_submission_v2/PROOF_ARCHIVE_COMPLETENESS.md)
        - 📄 [Submission Readiness Assessment](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/corrected_submission_v2/SUBMISSION_READINESS.md)
        - 📊 [Updated Benchmark Chart](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/corrected_submission_v2/UPDATED_BENCHMARK_CHART.png)
        """)
