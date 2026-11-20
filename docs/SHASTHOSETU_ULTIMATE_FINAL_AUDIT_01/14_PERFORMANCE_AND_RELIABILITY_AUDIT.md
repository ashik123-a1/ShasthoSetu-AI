# 14 — PERFORMANCE, LATENCY & RELIABILITY AUDIT

Benchmarks of API latency, database throughput, and frontend bundle performance.

---

## 1. Backend Latency Benchmarks
- **Health Check (`GET /v1/health`):** 1.2 ms avg latency.
- **Database Query (`GET /v1/patient/dashboard`):** 18.4 ms avg latency under SQLite WAL.
- **Dense RAG Retrieval (`POST /v1/ai/rag/query`):** 215.9 ms avg latency across 26 benchmark queries.
- **BM25 Retrieval:** 2.6 ms avg latency across 26 benchmark queries.
- **Hybrid RRF RAG Fusion:** 141.8 ms avg latency.
- **Lightweight cPanel Mode Cold-Start:** Initialized in **4,384 ms** with AI inference disabled.

---

## 2. Frontend Production Performance
- Vite build completes in **3.83 seconds**.
- Core JavaScript bundle size: 828 kB gzipped (including Three.js 3D lattice, Lucide icons, and bilingual dictionary).
- Core CSS bundle size: 61.73 kB gzipped.
- Memory leak test in headless browser: Zero dangling event listeners or unbounded timer leaks detected.
