# ShasthoSetu AI — RAG Ingestion Pipeline & Indexing Report
**Document ID:** `REP-RAG-INGEST-01`  
**Subsystem:** Bilingual RAG Medical Knowledge Base  
**Date:** 2026-11-19 (Reconciled under `AI-QA-FIX-01`)  
**Status:** AGENT-TESTED & HASH-VERIFIED  

> **QA Reconciliation Notice (`AI-QA-FIX-01`):** A prior draft of this report listed illustrative file names (`who_pcos_factsheet_bn.md`, `nice_...`) and approximate artifact sizes that did not match disk artifacts. All 14 source filenames, slugs, origin classifications, SHA-256 hashes, and byte sizes below match [`services/api/data/rag_corpus/corpus_manifest.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/data/rag_corpus/corpus_manifest.json), [`docs/AI_RAG_VOICE_OCR_01/RAG_KNOWLEDGE_SOURCE_REGISTER.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_RAG_VOICE_OCR_01/RAG_KNOWLEDGE_SOURCE_REGISTER.csv), and [`docs/AI_QA_FIX_01/RAG_CITATION_PROVENANCE_AUDIT.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/RAG_CITATION_PROVENANCE_AUDIT.csv) 100%.

---

## 1. Corpus Overview & Origin Classification (14 Sources, 35 Chunks)

The ShasthoSetu AI RAG corpus deliberately excludes private patient records, uploaded prescriptions, and patient chat logs. Every active source is verified `APPROVED` and stored locally under `services/api/data/rag_corpus/`:

### 1.1 `PUBLIC_MEDICAL` — First-Party Synthesized Bilingual Summaries (`11` Sources, `29` Chunks)
Each document below is classified as `FIRST_PARTY_SYNTHESIZED_SUMMARY` (a ShasthoSetu bilingual summary referencing official public guidance — **not** a verbatim upstream PDF/publication):

1. `01_pcos_education.md` (`who-medlineplus-pcos-education`, 3 chunks) — PCOS bilingual patient education referencing WHO & MedlinePlus
2. `02_ultrasound_pcom_terminology.md` (`ultrasound-pcom-terminology-guide`, 3 chunks) — Pelvic ultrasound & PCOM terminology guide referencing MedlinePlus & international criteria
3. `03_measles_viral_rash.md` (`who-cdc-measles-viral-rash`, 3 chunks) — Measles, chickenpox & viral rash awareness referencing WHO & CDC guidance
4. `04_pediatric_health_epi.md` (`dghs-unicef-pediatric-health-epi`, 3 chunks) — Pediatric danger signs & Bangladesh EPI schedule referencing WHO IMCI, UNICEF Bangladesh & DGHS
5. `05_general_medical_lab_terms.md` (`medlineplus-general-lab-terms`, 3 chunks) — Common lab test terms explained referencing MedlinePlus
6. `06_prescription_terminology.md` (`bangladesh-prescription-terminology`, 3 chunks) — Dosing & prescription abbreviations referencing ShasthoSetu clinical literacy & MedlinePlus
7. `07_medication_safety_literacy.md` (`who-medication-literacy-safety`, 3 chunks) — Medication safety & antibiotic stewardship referencing WHO Medication Without Harm & MedlinePlus
8. `08_consultation_preparation.md` (`medlineplus-consultation-preparation`, 2 chunks) — Doctor visit preparation checklist referencing MedlinePlus
9. `09_maternal_healthcare_education.md` (`who-maternal-healthcare-education`, 2 chunks) — Antenatal & maternal warning education referencing WHO guidance
10. `10_blood_donation_education.md` (`who-blood-donation-safety`, 2 chunks) — Voluntary blood donation & hospital cross-match safety referencing WHO Blood Safety
11. `11_emergency_warning_signs.md` (`bd-999-emergency-warnings`, 2 chunks) — Emergency warning signs & Bangladesh 999 triage policy referencing WHO/CDC red flags

### 1.2 `SUPPORT_FAQ` & `CLINICAL_REFERENCE` — First-Party Platform Docs (`3` Sources, `6` Chunks)
Each document below is classified as `FIRST_PARTY_PLATFORM_DOC` using an internal placeholder URI (`https://shasthosetu.local/docs/...`, rendered as an internal reference rather than a live web hyperlink in [`CitationDrawer.tsx`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/apps/web/src/components/ai/CitationDrawer.tsx)):

12. `12_shasthosetu_platform_faq.md` (`shasthosetu-platform-service-faq`, `SUPPORT_FAQ`, 2 chunks) — Appointments, simulated demo payments & Safe-OCR FAQ (`https://shasthosetu.local/docs/platform-faq`)
13. `13_support_zero_phi_faq.md` (`shasthosetu-support-zero-phi-faq`, `SUPPORT_FAQ`, 2 chunks) — Support desk operations & Zero-PHI privacy policy (`https://shasthosetu.local/docs/support-zero-phi`)
14. `14_clinician_reference_governance.md` (`shasthosetu-clinician-governance-ref`, `CLINICAL_REFERENCE`, 2 chunks) — Clinician OCR review & AI research boundary reference (`https://shasthosetu.local/docs/clinician-governance`)

---

## 2. Reconciled Hash & Count Parity

Automated cross-store auditing via [`reconcile_qa_fix_01.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/evals/reconcile_qa_fix_01.py) confirms **`all_hashes_and_counts_match = True`**:
- Raw UTF-8 disk byte SHA-256 matches `RAG_KNOWLEDGE_SOURCE_REGISTER.csv` for all **14** files.
- Normalized `clean_text` SHA-256 matches `rag_source_versions.content_sha256` inside `services/api/data/shasthosetu.db` for all **14** active rows.
- Total chunk counts match across CSV register (**35**), SQLite `rag_chunks` (**35**), `chunk_map.json` (**35**), and FAISS `faiss_bge_m3.index` (**35 vectors**, `1024` dimensions).

---

## 3. Exact Persistent Index Artifacts (`services/api/data/rag_index/`)

From [`index_meta.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/data/rag_index/index_meta.json) (`index_version`: `idx-1795102375`, `built_at_utc`: `2026-11-19T15:33:01.217Z`, `duration_ms`: `6135`, `embedding_model`: `bge-m3`, `embedding_dim`: `1024`):

| Artifact | File Name | Observed Exact Size | Contents |
| :--- | :--- | :---: | :--- |
| **Dense Vector Index** | `faiss_bge_m3.index` | 143,405 bytes | FAISS `IndexFlatIP` holding 35 L2-normalized 1024-dim `bge-m3` vectors |
| **Sparse Lexical Index** | `bm25_index.pkl` | 82,020 bytes | Pickled `BM25Okapi` index over bilingual Unicode + ASCII tokens |
| **Chunk Provenance Map** | `chunk_map.json` | 83,535 bytes | Chunk texts, titles, section headers, scopes, and origin/URI metadata (0 patient records) |
| **Index Build Metadata** | `index_meta.json` | 284 bytes | Index version, UTC timestamp, counts (`14` sources / `35` chunks), and readiness flags |

---

## 4. Security, Zero-PHI & Admin Approval Lifecycle

- **Admin Approval Workflow:** Newly uploaded or pending knowledge sources carry `review_status = 'PENDING_REVIEW'` and are strictly excluded from patient/doctor/support retrieval and metadata reads until an `ADMIN` transitions them to `APPROVED` and triggers re-indexing (`test_qa_fix_3_source_approval_rbac_and_pending_exclusion` PASSED).
- **Zero-PHI Corpus Isolation:** Automated inspection across both `chunk_map.json` and SQLite `rag_chunks` confirms zero patient notes, prescriptions, or OCR artifacts inside vector/BM25 indexes (`test_qa_fix_5_no_patient_docs_or_phi_in_index_or_logs` PASSED).
- **Role Scoping:** Only `ADMIN` users can inspect pending sources, upload documents, change approval states, or rebuild indexes (`HTTP 403` otherwise).
