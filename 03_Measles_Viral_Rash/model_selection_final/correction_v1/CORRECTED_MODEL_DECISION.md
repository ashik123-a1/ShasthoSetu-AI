# Corrected Model Selection Decision & Governance Directive (V1)
## Module: `03_Measles_Viral_Rash` | Pediatric Viral Exanthem Vision
**Location:** `03_Measles_Viral_Rash/model_selection_final/correction_v1/CORRECTED_MODEL_DECISION.md`  
**Execution Date:** November 18, 2026  
**Auditor:** Senior ML Research Auditor & MLOps Lead  

---

### 1. Definitive Model Selection Directive

```
================================================================================
FINAL MODEL SELECTION DIRECTIVE (CORRECTED V1):
- Primary Research-Demo Model:       ResNet18 Grouped (models/resnet18_grouped_best.pth)
- Lightweight Research Alternative:  MobileNetV3-Small Grouped (models/mobilenet_v3_small_grouped_best.pth)
- Clinical Diagnostic Reliability:   NOT ESTABLISHED (Experimental Assistive Triage Only)
================================================================================
```

#### Why ResNet18 is Selected:
ResNet18 is selected strictly on the basis of the **predefined validation image-level Macro F1 criterion (84.22% vs. 81.56%)**, reinforced by superior Balanced Accuracy (**87.19% vs. 84.04%**), superior Overall Image Accuracy (**84.65% vs. 81.15%**), and superior Measles Crop Sensitivity (**91.94% vs. 90.32%**, detecting 114/124 crops vs. 112/124).

Held-out test performance is preserved for historical provenance and did **not** influence this selection decision.

---

### 2. Paired Statistical Evaluation on 113 Source-Photo Families

Because both models were evaluated on the **exact same 113 source-photo families** in the validation split, treating family accuracy as two independent samples is statistically invalid. We perform a paired evaluation using McNemar's exact test:

#### 2×2 Paired Contingency Table (Validation Families N=113):

```
                        MobileNetV3 Correct     MobileNetV3 Incorrect     Total
ResNet18 Correct                91 (n11)                  6 (n10)           97
ResNet18 Incorrect               7 (n01)                  9 (n00)           16
Total                           98                       15                113
```

- **Both Models Correct ($n_{11}$):** 91 families (80.53% concordance)
- **Both Models Incorrect ($n_{00}$):** 9 families (7.96%)
- **ResNet18 Uniquely Correct ($n_{10}$):** **6 families** (`CWP_20_01`, `HEALTHY_29_01`, `HEALTHY_89_01`, `HFMD_95_01`, `MKP_143_01`, `MKP_60_01`)
- **MobileNetV3 Uniquely Correct ($n_{01}$):** **7 families** (`CHP_04_05`, `HEALTHY_70_01`, `MKP_117_01`, `MKP_58_04`, `MKP_75_02`, `MKP_83_04`, `MSL_41_01`)

#### Statistical Significance Test:
- Total discordant pairs: $n_{10} + n_{01} = 6 + 7 = 13$.
- Under the null hypothesis of equal performance, the discordant pairs follow $\text{Binomial}(13, 0.5)$.
- **Two-Tailed McNemar Exact p-value:**
  $$p = 2 \cdot \sum_{k=0}^{6} \binom{13}{k} (0.5)^{13} = 1.0000$$

**Definitive Statistical Conclusion:**  
There is **zero statistically significant difference** ($p = 1.000$) between ResNet18 (97/113) and MobileNetV3-Small (98/113) at the source-photo family level. The 1-family difference is pure sampling noise.

---

### 3. Majority-Vote Tie-Breaking Policy Audit

A forensic examination of all 113 validation families revealed that **majority-vote ties occurred in 3 instances across both models**:
- **ResNet18:** 2 tied families (`MKP_117_01` with 7 Monkeypox / 7 Chickenpox, and `MKP_41_01` with 5 Cowpox / 5 Monkeypox).
- **MobileNetV3:** 1 tied family (`HFMD_32_01` with 7 Monkeypox / 7 Cowpox).

#### Impact of Tie-Breaking Policies on Family Metrics:

| Tie-Breaking Policy | Definition / Resolution Mechanism | ResNet18 Family Accuracy | ResNet18 Macro F1 | MobileNetV3 Family Accuracy | MobileNetV3 Macro F1 |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Alphabetical (Default)** | Pandas `.mode()[0]` order: `Chickenpox < Cowpox < HFMD < Healthy < Measles < Monkeypox`. | **85.84% (97/113)** | **85.73%** | **86.73% (98/113)** | **87.34%** |
| **Reverse Alphabetical** | Reversed alphabetical order (`Monkeypox > Measles > Healthy > HFMD > Cowpox > Chickenpox`). | **87.61% (99/113)** | **87.38%** | **86.73% (98/113)** | **87.81%** |
| **Clinical Severity Priority** | Precedence: `Measles > Monkeypox > Chickenpox > Cowpox > HFMD > Healthy`. | **87.61% (99/113)** | **87.38%** | **86.73% (98/113)** | **87.81%** |
| **Oracle Tie-Breaker** | True class selected if present in tie. | **87.61% (99/113)** | **87.38%** | **86.73% (98/113)** | **87.34%** |

#### Key Finding on Tie-Breaking:
- In both of ResNet18's tied families (`MKP_117_01` and `MKP_41_01`), the true label is `Monkeypox`. Under the default alphabetical tie-breaker (`Chickenpox` and `Cowpox`), both were marked **incorrect**.
- Under any non-alphabetical policy (such as clinical priority or reverse alphabetical), ResNet18 resolves both ties correctly, rising to **99/113 (87.61%)** and surpassing MobileNetV3 (98/113, 86.73%).
- This confirms that MobileNetV3's apparent 1-family advantage was an artifact of pandas' arbitrary alphabetical tie-breaker.

---

### 4. Important Clarifications & Governance Boundaries

1. **Source-Photo Grouping vs. Clinical Patient Independence:**  
   Every "source family" in our grouped splits represents crops extracted from a **single source photograph**, NOT verified independent clinical hospital patients. While source-photo grouping successfully eliminates multi-crop spatial memorization leakage, true patient-level generalization cannot be claimed without longitudinal multi-center hospital cohort records.
2. **Lightweight Alternative Status (MobileNetV3):**  
   MobileNetV3-Small (5.95 MB, 1.52M parameters) is maintained in the repository as a compact research alternative. However, **no on-device smartphone or tablet benchmark has been conducted**. We do not claim mobile APK verification until physical hardware testing is executed.
3. **Assistive Research Disclaimer:**  
   Neither model possesses established clinical diagnostic reliability. Output classifications serve strictly as experimental assistive screening indicators. Clinical evaluation of Koplik spots, prodromal fever, and laboratory serology (Measles IgM / RT-PCR) remain mandatory.
