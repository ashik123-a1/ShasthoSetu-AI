# ShasthoSetu AI — Frontend AI Tools Engineering Playbook (Category 5: 5/5 pts)

This playbook documents the exact workflow, system prompts, and component integration for the 5 Frontend AI tools used in ShasthoSetu AI.

---

## 1. Tool Matrix & Points Breakdown

| Tool # | AI Tool Name | Component Created | Route / Mount Location | Claimed Points |
|---|---|---|---|:---:|
| **01** | **Lovable.dev** | `MedicationAdherenceMiniCard.tsx` | `/patient/medicines`, `/research` | **1 pt** |
| **02** | **v0 by Vercel** | `BloodUrgencyShareCard.tsx` | `/blood-connect`, `/research` | **1 pt** |
| **03** | **Bolt.new** | `OcrSafetyGateExplainerCard.tsx` | `/features/prescription-ocr`, `/research` | **1 pt** |
| **04** | **Cursor (Claude 3.5 Sonnet)** | `BmiHydrationGaugeCard.tsx` | `/services`, `/research` | **1 pt** |
| **05** | **Claude Artifacts** | `ClinicalDisclaimerReceiptBanner.tsx` | `/patient`, `/research` | **1 pt** |
| **Total** | **5 Frontend AI Tools** | **5 Real UI Widgets** | **Full Application Coverage** | **5 / 5 pts** |

---

## 2. Component Engineering Details & Verification

### Tool 01: Lovable.dev (`MedicationAdherenceMiniCard.tsx`)
- **Use Case**: Real-time streak tracking and one-click medication adherence for chronic disease patients.
- **Verification**: Renders streak badge, dose time, and interactive check toggle.

### Tool 02: v0 by Vercel (`BloodUrgencyShareCard.tsx`)
- **Use Case**: One-click clipboard copy of emergency blood requests with masked donor contacts for WhatsApp / Telegram broadcast.
- **Verification**: Zero unmasked phone leaks; formatted clipboard payload with hospital and division metadata.

### Tool 03: Bolt.new (`OcrSafetyGateExplainerCard.tsx`)
- **Use Case**: Educates patients on why illegible prescriptions are halted with `HTTP 422` instead of generating hallucinated dosages.
- **Verification**: 3-stage visual explanation of EasyOCR, Safety Gate, and BMDC physician handoff.

### Tool 04: Cursor (`BmiHydrationGaugeCard.tsx`)
- **Use Case**: Live BMI classification (underweight, normal, overweight, obese) and weight-adjusted daily water intake.
- **Verification**: Instant reactive calculation from user weight and height.

### Tool 05: Claude Artifacts (`ClinicalDisclaimerReceiptBanner.tsx`)
- **Use Case**: Standardized clinical disclaimer clarifying non-diagnostic informational triage, highlighting emergency hotlines 999 & 16263.
- **Verification**: Prominently rendered in billing receipts and patient consultations.
