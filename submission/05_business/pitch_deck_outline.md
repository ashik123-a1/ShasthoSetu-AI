# ShasthoSetu AI — Executive Pitch Deck Outline (Competition Track)

---

## Slide 1: Title & Vision
- **Header**: ShasthoSetu AI (স্বাস্থ্যসেতু)
- **Tagline**: The Bilingual Clinical AI & Telemedicine Ecosystem for 170 Million People in Bangladesh.
- **Presenter**: Team ShasthoSetu
- **Track**: AI for Healthcare / Social Impact / Open Source

---

## Slide 2: The Healthcare Crisis in Bangladesh
- **Extreme Doctor Shortage**: 6.3 physicians per 10,000 population (WHO standard is minimum 10).
- **Rampant Self-Medication**: Over 60% of rural patients buy antibiotics over the counter without prescriptions.
- **Blood Scarcity**: Acute delays in finding compatible emergency blood donors cause hundreds of postpartum and trauma deaths yearly.
- **Privacy Void**: Cloud-based health tools expose sensitive patient conversations to foreign LLM servers without HIPAA or local compliance.

---

## Slide 3: The Solution — ShasthoSetu AI
- **100% Offline-First Edge AI**: Runs on local hardware (Ollama, Qwen 2.5 7B, Whisper) with zero recurring cloud API bills.
- **Bilingual Triage in Colloquial Bengali**: Bridges literacy barriers through speech and text.
- **Zero-PHI Guarantee**: Local Presidio and regex sanitization strip patient identifiers before inference.
- **Emergency Code 999 Handoff**: Deterministic, fail-closed safety gate protecting patients from AI hallucination.
- **Geo-Radius Blood Connect**: Anonymized 5/10/20 km donor discovery across all 8 divisions.

---

## Slide 4: Clinical AI Precision & Benchmark Metrics
- **Hybrid RAG Precision**: Audited Mean Reciprocal Rank (MRR) of **0.9750** and Hit@3 of **1.0000** on WHO and DGHS clinical guidelines.
- **Prescription OCR Gate**: Strict `HTTP 422` refusal halts illegible handwriting, mandating BMDC doctor sign-off.
- **Model Context Protocol (MCP)**: 3 custom servers exposing standardized clinical tools for external agents.
- **Multi-Agent Orchestration**: LangGraph, CrewAI, AutoGen, and Swarm collaborative governance.

---

## Slide 5: Market Opportunity (TAM & SAM)
- **Total Addressable Market (TAM)**: $12.4 Billion (Healthcare expenditure in Bangladesh by 2030).
- **Serviceable Addressable Market (SAM)**: $850 Million (Digital health, telemedicine consultations, pharmacy delivery).
- **Target Segments**: Rural health centers, community clinics, urban working families, non-resident Bangladeshi (NRB) diaspora caring for elderly parents at home.

---

## Slide 6: Business & Revenue Model
- **B2C Freemium Triage**: Free AI symptom education and blood donor discovery; premium on-demand video consultations with specialist doctors (10% platform fee).
- **B2B Hospital & Clinic Licenses**: Enterprise MCP server integration and automated prescription queue software for private hospitals and diagnostic centers.
- **ePharma & Diagnostic Fulfillment**: Micro-commission on home lab sample collection and verified prescription medicine deliveries.

---

## Slide 7: Competitive Moat
| Feature | Generic Chatbots (ChatGPT / Gemini) | DocTime / Seba.xyz | **ShasthoSetu AI** |
|---|:---:|:---:|:---:|
| **Local Offline Edge Execution** | ❌ Cloud only | ❌ Cloud only | ✅ **100% Local (Zero API Cost)** |
| **Colloquial Bengali Voice AI** | ⚠️ Generic / Broken | ❌ Text only | ✅ **Whisper-v3-turbo Bengali** |
| **Fail-Closed 999 Handoff** | ❌ Hallucinates advice | ⚠️ Manual | ✅ **Deterministic <150ms Gate** |
| **Standardized MCP Servers** | ❌ Proprietary | ❌ None | ✅ **3 Built + 3 Public MCPs** |
| **Zero-PHI Data Protection** | ❌ Sent to US clouds | ⚠️ Centralized DB | ✅ **Presidio Zero-PHI Scrubbed** |

---

## Slide 8: Future Roadmap & Impact
- **Q1 2027**: Pilot rollout with 10 Upazila Health Complexes under DGHS partnership.
- **Q2 2027**: Offline mobile edge deployment using ONNX runtime and WebAssembly.
- **Q3 2027**: Integration with National Health ID (Shastho Card) infrastructure.
- **Goal**: Reach 1 Million verified consultations with zero preventable dosage errors.
