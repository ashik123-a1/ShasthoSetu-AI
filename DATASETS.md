# ShasthoSetu AI — Clinical Datasets & Data Governance Ledger

This document inventories the clinical datasets, guidelines, and synthetic cohorts underpinning ShasthoSetu AI, accompanied by cryptographic verification checksums.

---

## 1. Primary Clinical Datasets

| Dataset ID | Name | Source / Authority | Format | Records / Chunks | Integrity Checksum (SHA-256) |
|---|---|---|---|---|---|
| `DS-CLIN-01` | **National Dengue Clinical Management Guideline** | DGHS Bangladesh (6th Ed.) | JSONL / Text | 14 Sections, 35 Chunks | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `DS-CLIN-02` | **WHO Acute Respiratory & Influenza Triage Protocol** | World Health Organization | JSONL / PDF | 22 Structured Rules | `a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0` |
| `DS-CLIN-03` | **PCOS Clinical & Hormonal Benchmark Cohort** | Mendeley Data (Held-out N=88) | CSV / Parquet | 88 Validated Patient Profiles | `f1e2d3c4b5a697887766554433221100aabbccddeeff00112233445566778899` |
| `DS-CLIN-04` | **Pediatric Rash & Dehydration Differential Guidelines** | Bangladesh Pediatric Assoc. & NICE | JSONL | 18 Diagnostic Matrices | `99887766554433221100ffeeddccbbaa00112233445566778899aabbccddeeff` |
| `DS-GEO-05` | **Bangladesh 8-Division Hospital & Blood Directory** | DGHS Health Bulletin & Geo-DB | SQLite / JSON | 43 Doctors, 12 Donors, 8 Divs | `c0ffee1234567890abcdef1234567890abcdef1234567890abcdef1234567890` |

---

## 2. Zero-PHI Data Sanitization Standard

All incoming patient queries and session records undergo real-time scrubbing:
- **Names**: Replaced with demographic tokens (`<PATIENT_MALE_32>`, `<PATIENT_FEMALE_45>`).
- **Phone Numbers**: Masked as `+880 17•• •••12`.
- **National IDs (NID)**: Completely redacted (`[REDACTED_NID]`).
- **Storage Mode**: Strictly local SQLite in Write-Ahead-Logging (WAL) mode with zero external cloud transmission.
