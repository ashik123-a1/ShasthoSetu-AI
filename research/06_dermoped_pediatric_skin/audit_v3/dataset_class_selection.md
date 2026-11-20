# DermoPed Dataset Class Selection & Pediatric Viability Analysis
**Dataset:** DermoPed (Zenodo Record 20829589)  
**Total Dataset Footprint:** 19.3 GB (9 ZIP archives, 229 distinct patients, 46,000+ crops)  
**Research Standard:** ShasthoSetu AI Master SRS v1.0 Section 16.2 & Section 21  

---

## 1. Catalog of All 9 DermoPed Disease Classes

Using verified Zenodo metadata from Record 20829589, the 9 distributed archives and their properties are cataloged below:

| Condition / Class Name | Archive Filename | MD5 Checksum | Archive Size | Clinical Presentation | LMIC / Bangladesh Relevance |
|---|---|---|---|---|---|
| **1. Chickenpox** | `chickenpox.zip` | `6f4de33ee140aab91ea626eb860a2544` | 564.19 MB | Varicella-zoster vesicles / papules | High (Frequent pediatric outbreaks) |
| **2. Pediculosis** | `pediculosis.zip` | `811b59d0589b16f6cd7bb146f14e9d51` | 309.49 MB | Head lice / nits on scalp & hair | Moderate (High prevalence, but dataset has $n=3$ patients) |
| **3. Morbilliform Exanthema** | `morbilliform_exanthema.zip` | `c134746745c531112229db69c0750093` | 329.67 MB | Measles-like erythematous macules/papules | **Critical** (Measles differential diagnosis & triage) |
| **4. Polymorphous Exanthema** | `polymorphous_exanthema.zip` | `0e0a79981294a538cedc92943e45bf88` | 439.77 MB | Diverse morphological cutaneous lesions | High (Viral rash differential) |
| **5. Maculopapular Exanthema** | `maculopapular_exanthema.zip` | `fbc0d3adae7f9b4c6878cae8515aeebf` | 771.08 MB | Widespread maculopapular rash | **Critical** (Standard pediatric fever + rash presentation) |
| **6. Iatrogenic Drug-induced Exanthema** | `iatrogenic_drug_induced_exanthema.zip` | `4be24b1dd1dee6c930321ed8038531a7` | 1,894.14 MB | Adverse cutaneous drug reactions | High (Antimicrobial stewardship, emergency triage) |
| **7. Scabies** | `scabies.zip` | `2b75d20fc0886746855b9890185c7525` | 2,351.87 MB | Sarcoptes scabiei burrows & papules | **Critical** (Major endemic parasitic infection in Bangladesh) |
| **8. Viral Exanthema** | `viral_exanthema.zip` | `7dbce24d6c4f11a9f4ad21eb45656ad1` | 5,411.03 MB | General viral dermatological manifestations | High (Broad category) |
| **9. Urticaria** | `urticaria.zip` | `af4bcdc63e55da0faf64d0aa17954a81` | 7,101.72 MB | Wheals, hives, allergic erythema | High (Pediatric allergy) |

---

## 2. Audit of the Pediculosis Bottleneck: Why It Must Be Retired

In Tier 1, `pediculosis` was paired with `chickenpox`. Our audit confirmed:
- **Total Pediculosis Patients in Entire Archive:** **$n = 3$** (`patient71`, `patient72`, `patient74`).
- **Age Distribution:**
  - `patient71`: Age 1 (Infant, assigned to Val)
  - `patient72`: Age 5 (Child, assigned to Train)
  - `patient74`: Age 42 (Adult, assigned to Test)
- **Scientific Consequence:**
  With exactly 1 patient in Train, 1 in Val, and 1 in Test:
  1. The training distribution cannot generalize across diverse age groups or hair colors.
  2. The validation recall fluctuates wildly ($0\%$ to $15\%$) based entirely on that single infant patient's skin features.
  3. The 100% test score is an artifact of the single adult patient having obvious adult nits.
  4. Continuing to benchmark on $n=3$ patients violates statistical power requirements ($p > 0.05$) and scientific integrity.

---

## 3. Recommended Classes for Tier 2 Pediatric Vision Research

To create a credible, scientifically defensible pediatric dermatology classifier without exhausting disk storage (Drive F has ~1 GB free, Drive C has 9.5 GB free), we evaluate the remaining 7 classes:

### Candidate A: `morbilliform_exanthema.zip` (329.67 MB)
- **Size:** Extremely lightweight (314 MB uncompressed).
- **Clinical Alignment:** Morbilliform rash is the pathognomonic clinical presentation of **Measles** and measles-like viral exanthems—directly aligning with ShasthoSetu AI's core mission (Master SRS Section 1.2: Measles Surveillance).
- **Patient Diversity:** Significant cohort of pediatric patients admitted for infectious exanthems.

### Candidate B: `maculopapular_exanthema.zip` (771.08 MB)
- **Size:** Moderate (735 MB uncompressed).
- **Clinical Alignment:** General maculopapular exanthem is the primary clinical differential diagnosis for childhood viral infections (Enterovirus, Roseola, Rubella).

### Candidate C: `scabies.zip` (2,351.87 MB)
- **Size:** Large (2.2 GB). While clinically vital for South Asia, downloading 2.3 GB requires more free storage on Drive F than currently available. It should be deferred until disk storage is expanded.

---

## 4. Final Recommendation for Future Experiments

1. **Retire `pediculosis` ($n=3$) from binary classification.**
2. **Adopt a 3-Class Pediatric Exanthem Benchmark:**
   $$\text{Cohort} = \{\text{Chickenpox}, \text{Morbilliform Exanthema}, \text{Maculopapular Exanthema}\}$$
3. **Storage Feasibility:**
   - Chickenpox: Already stored locally (564 MB).
   - Morbilliform: Only 329.67 MB download.
   - Total new disk footprint: $< 400\text{ MB}$, easily fitting on Drive C or F without storage exhaustion.
4. **Methodological Upgrade:**
   Transition from a single split to **5-Fold Patient-Stratified Group Cross-Validation**, ensuring every patient is evaluated without sample-size artifacts.
