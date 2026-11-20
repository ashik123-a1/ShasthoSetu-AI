# Label Integrity & Diagnostic Ground-Truth Audit
**Module:** `03_Measles_Viral_Rash`  
**Standard:** ShasthoSetu AI Clinical AI Governance & CDC Diagnostic Standards  
**Status:** Mandatory Medical Boundary Enforced  

---

## 1. Medical Distinction: Rash Morphology vs Confirmed Etiological Diagnosis

A critical error commonly made in superficial AI projects is conflating **clinical morphology** with **pathogen-confirmed diagnosis**. We explicitly forbid this practice:

### 1.1 What is "Morbilliform Exanthema"?
- **Definition:** "Morbilliform" is a descriptive dermatological term meaning *"resembling measles"*. It describes a cutaneous eruption characterized by flat erythematous macules and small papules ($2 - 10\text{ mm}$) that often coalesce into generalized patches.
- **Etiological Range:**
  1. **Adverse Cutaneous Drug Reactions:** Amoxicillin, sulfonamides, anticonvulsants.
  2. **Non-Measles Viral Infections:** Epstein-Barr Virus (EBV), Roseola (HHV-6), Parvovirus B19, Enterovirus, Adenovirus, Rubella.
  3. **Bacterial / Toxin Syndromes:** Early Scarlet fever, Mycoplasma pneumoniae.
  4. **True Measles (Rubeola):** Only one of many possible causes.

### 1.2 CDC & WHO Confirmation Standard for True Measles
According to the Centers for Disease Control and Prevention (CDC) and World Health Organization (WHO), a clinical suspicion of Measles **cannot** be confirmed by visual inspection alone. Confirmation strictly requires:
1. **Measles IgM Serology:** Detection of measles-specific IgM antibodies in serum.
2. **Reverse Transcription PCR (RT-PCR):** Detection of measles virus RNA from nasopharyngeal/throat swab or urine.
3. **Viral Culture or Genotyping:** To differentiate wild-type infection from vaccine-strain reactions.

### 1.3 Audit of DermoPed Labels
- The DermoPed dataset (Zenodo Record 20829589) labels its archive strictly as **`morbilliform_exanthema`**, NOT "measles".
- The clinical documentation from the University of Bologna indicates that these represent pediatric patients presenting with morbilliform eruptions evaluated by dermatologists, without uniform molecular PCR confirmation of wild-type rubeola virus.
- **Binding Rule:** Under no circumstances will ShasthoSetu AI relabel `morbilliform_exanthema` as "Confirmed Measles". Any future classifier built on this data must be explicitly titled:  
  **`Chickenpox vs Morbilliform Exanthema — Morphology Classification`**.

---

## 2. Audit of Mendeley MCVSLD Labels

### 2.1 Label Provenance in MCVSLD
- The dataset *Multi-Class Viral Skin Lesion Dataset (MCVSLD)* includes a directory titled `Measles`.
- Scientific audit of the dataset paper reveals that these images were collected via **Google Image Search** queries and online medical blogs/open-access articles.
- **Defects in Ground Truth:**
  - No laboratory confirmation reports (no IgM or RT-PCR documentation).
  - No hospital patient records or medical charts.
  - Risk of internet mislabeling (e.g., rubella or allergic rashes labeled as "measles" in stock photo libraries).
  - Severe risk of watermark/text bias and duplicate crops.
- **Audit Verdict:** MCVSLD fails clinical ground-truth criteria. It cannot be used as an authoritative medical diagnostic benchmark for ShasthoSetu AI.

---

## 3. Dataset Segregation Protocol

To preserve scientific rigor:
1. **Never Merge MCVSLD and DermoPed:** Merging web-scraped images (varying resolutions, lighting, web artifacts) with hospital-derived crops (standardized 256x256, clinical ethics protocol) creates artificial feature confounders.
2. **Distinct Research Tiers:**
   - **Tier 2A (Morphology Differential):** DermoPed Chickenpox vs Morbilliform Exanthema (Non-autonomous triage decision support).
   - **Tier 2B (Confirmed Infectious Surveillance):** Dedicated prospective clinical dataset with RT-PCR/IgM ground truth (e.g., partner cohorts from pediatric infectious disease units in Bangladesh).
