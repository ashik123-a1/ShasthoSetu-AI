# System Patterns: ShasthoSetu AI

## High-Level Architecture
```
[Client: Web / PWA / Voice] 
       │ 
       ▼
[FastAPI Gateway :8000] ─── Zero-PHI Presidio Gate
       │
       ├─► [Hybrid RAG Engine] ── BM25 + BGE-M3 Dense + RRF + Knowledge Graph
       ├─► [Local LLM Daemon] ── Ollama (:11434) / Qwen 2.5 7B
       ├─► [Model Context Protocol Hub] ── guideline_mcp, directory_mcp, care_record_mcp
       ├─► [LangGraph Clinical Triage] ── Deterministic safety routing & tool calling
       └─► [SQLite WAL DB] ── Users, Doctors, Consultations, Blood Requests, Audits
```

## Key Patterns
- **Fail-Closed Safety**: Any ambiguity in patient intent or safety violations defaults to refusal and professional clinical referral.
- **Role-Based Access Control (RBAC)**: Strict separation between `PATIENT`, `DOCTOR`, `ADMIN`, and `SUPPORT` roles. Support role is explicitly barred from medical records.
- **Zero-PHI Masking**: Phone numbers and private identities are dynamically masked before any external processing or public display.
- **Model Context Protocol (MCP)**: Custom MCP servers provide standardized access to clinical guidelines, hospital directories, and electronic care records.
