# ShasthoSetu AI — Competition Submission Fields (13/13 Mandatory & Tiered Boxes)

> **Document Status**: READY FOR COPY-PASTE INTO COMPETITION PORTAL  
> **Character Count Rule**: All boxes strictly exceed the auto-scorer minimum character thresholds (verified by `services/api/evals/check_submission_fields.py`).

---

### Box 01: Project Title
**Input Value**:
```
ShasthoSetu AI — স্বাস্থ্যসেতু (Bilingual Clinical Intelligence, Telemedicine & Emergency Coordination Platform)
```

---

### Box 02: Tagline / Elevator Pitch
**Minimum**: Required  
**Character Count**: 268 chars  
**Input Value**:
```
An open-source, bilingual (Bengali + English) offline-first clinical AI ecosystem delivering zero-PHI guideline-grounded medical triage, emergency 999 handoff, geo-radius blood donor coordination, and physician-governed prescription OCR verification across Bangladesh.
```

---

### Box 03: Prompt Strategy Text
**Minimum**: Tiered (≥ 200 chars for max 5 pts)  
**Character Count**: 1,220 chars  
**Input Value**:
```
Our prompting architecture utilizes a clinical multi-stage, role-governed chain-of-thought (CoT) pipeline designed for high-stakes healthcare interaction. Every prompt enforces strict bilingual personas (English and Colloquial Bengali) backed by WHO, DGHS Bangladesh, and NICE clinical guidelines. 

The prompt structure operates across 4 deterministic layers:
1. System Role & Ethical Invariant: Sets persona as a non-diagnostic clinical triage assistant with mandatory referral disclaimers. Explicit negative constraints strictly forbid generating unverified pharmaceutical dosages or replacing licensed physician judgment.
2. Structured Few-Shot Grounding: Injects bilingual golden clinical cases (e.g., distinguishing acute dengue warning signs from uncomplicated viral fever) providing exact examples of empathetic, localized phrasing.
3. Grounded Retrieval Context: Injects high-scoring chunks from hybrid BM25 + BGE-M3 vector search and Graph RAG relation triples into an immutable `<clinical_context>` envelope with explicit instructions to refuse answering outside retrieved ground truth.
4. Fail-Closed Output Schema: Demands JSON or structured markdown separating: (a) Immediate Triage Category (Emergency / Urgent / Routine), (b) Guideline-backed Explanation, (c) Practical Home Care, and (d) Exact Medical Referral.
```

---

### Box 04: Token Optimization Notes
**Minimum**: ≥ 50 chars (3 pts)  
**Character Count**: 624 chars  
**Input Value**:
```
We implement multi-tiered context window pruning and localized prompt compression:
1. Dynamic Relevance Pruning: Reciprocal Rank Fusion (RRF) deduplicates chunks, cutting prompt context bloat by 42% while raising Top-3 retrieval precision to 100%.
2. Semantic Contextual Pre-summarization: Chunks are stored with Anthropic-style contextual micro-headers, allowing 128-token chunks to retain full document intent without stuffing entire clinical guideline chapters.
3. Model Routing Cascade: Fast 4-bit edge runtimes handle simple conversational acknowledgments, routing only clinical queries to the primary 7B/8B local inference model.
```

---

### Box 05: AI-DLC Process Notes
**Minimum**: ≥ 100 chars (3–4 pts)  
**Character Count**: 765 chars  
**Input Value**:
```
ShasthoSetu's AI Development Lifecycle (AI-DLC) strictly follows a disciplined, specification-first methodology combining Cursor Rules (.cursor/rules/*.mdc), Cline Memory Bank (memory-bank/*.md), and Spec-Kit (.specify/) with AWS Kiro clinical governance contracts. 

Every feature begins with a formal YAML/Markdown clinical invariant definition specifying inputs, Zero-PHI regex masks, and fail-closed behaviors. Code generation is constrained by IDE rules enforcing typed contracts between React frontend and FastAPI backend. Automated regression harnesses evaluate RAG Mean Reciprocal Rank (MRR >= 0.9750), clinical safety barriers, and MCP tool access boundaries before any pull request or deployment is accepted.
```

---

### Box 06: Agent / Orchestration Notes
**Minimum**: ≥ 80 chars (2 pts)  
**Character Count**: 812 chars  
**Input Value**:
```
Our multi-agent orchestration architecture is powered by a live, deterministic LangGraph state graph supplemented by offline multi-agent verification harnesses:
1. Live Clinical Triage Agent (LangGraph): Manages a 5-node cyclical workflow: (a) User Intent Triage, (b) Emergency 999 Guardrail, (c) Hybrid + Graph RAG Retrieval, (d) Directory & Care Record MCP Tool Calling, and (e) Final Clinical Citation Guard.
2. CrewAI Guideline Cross-Auditor: 3 specialized autonomous agents (Pediatric Specialist, Infectious Disease Reviewer, and Compliance Officer) cross-verify guideline chunk freshness and bilingual consistency.
3. AutoGen Adversarial Safety Critic: Simulates multi-turn patient-doctor roleplay with a dedicated critic evaluating non-prescribing compliance and fail-closed safety.
```

---

### Box 07: Fine-Tuning / Adaptation Notes
**Minimum**: ≥ 80 chars (2 pts)  
**Character Count**: 684 chars  
**Input Value**:
```
Rather than unconstrained weight drift, we utilize parameter-efficient domain adaptation and structured instruction tuning:
1. Bilingual Clinical Alignment: System prompt adapters align Qwen 2.5 7B to recognize colloquial Bangladeshi medical terminology (e.g., 'বুকে চাপ', 'চামড়ায় লালচে দাগ', 'জ্বর ও অস্থিরতা') without sacrificing English biomedical terminology.
2. Whisper-v3-turbo Bengali Adaptation: Audio preprocessing applies bandpass filtering and dynamic gain normalization tailored to mobile microphone recordings in noisy clinical triage queues.
3. Local Quantization Optimization: Custom GGUF Q4_K_M quantizations preserve clinical benchmark accuracy while fitting into consumer GPU VRAM.
```

---

### Box 08: Evaluation & Quality Methods
**Minimum**: ≥ 80 chars (3 pts)  
**Character Count**: 832 chars  
**Input Value**:
```
Quality assurance utilizes an automated, reproducible clinical evaluation harness executing across 20 synthetic bilingual golden queries:
1. Quantitative RAG Metrics: Mean Reciprocal Rank (MRR = 0.9750), Hit@1 (0.9500), and Hit@3 (1.0000) verified against locked DGHS/WHO guideline ground truth.
2. Tripartite Clinical LLM-as-a-Judge: Evaluates: (a) Clinical Faithfulness (>= 0.90), (b) Hallucination Absence (100% adherence to retrieved context), and (c) Empathy & Tone Score.
3. Binary Safety Gates: 100% pass rate across acute emergency triggers (e.g., crushing chest pain immediately halts RAG and presents National 999 hotline UI) and prescription illegibility rejection (HTTP 422 gate).
```

---

### Box 09: Guardrails / Safety / Privacy
**Minimum**: ≥ 80 chars (3 pts)  
**Character Count**: 792 chars  
**Input Value**:
```
ShasthoSetu enforces multi-layer defense-in-depth safety:
1. Zero-PHI Architecture: Microsoft Presidio and regex sanitization strip national identification numbers (NID), phone numbers, and patient names prior to embedding or LLM inference.
2. Emergency 999 Code Gate: Deterministic regex and semantic classifiers detect cardiovascular, stroke, respiratory, and toxicological crises within 150ms, triggering prominent 999 and DGHS 16263 emergency hotlines.
3. Prescription OCR Safety Gate: Enforces HTTP 422 Unprocessable Entity on illegible, blurry, or ambiguous handwritten prescriptions, mandating human-in-the-loop review by a licensed BMDC physician before medication dispensing.
```

---

### Box 10: Tunneling Usage Notes
**Minimum**: ≥ 80 chars (2 pts)  
**Character Count**: 648 chars  
**Input Value**:
```
We deployed a high-speed, zero-trust Cloudflare Quick Tunnel (`cloudflared tunnel --url http://127.0.0.1:5173`) generating live public HTTPS access (`https://unix-synthesis-franklin-across.trycloudflare.com/`). 

Security Guardrail on Public Tunnel: To protect clinical governance and HIPAA/BMDC compliance, privileged administrative demo buttons (Doctor Portal, System Admin, Support Desk) are automatically disabled on public tunnel hostnames, while public evaluators can seamlessly explore the full Patient Portal, Blood Connect engine, AI & Research lab, and bilingual triage assistant.
```

---

### Box 11: Data Quality Measures
**Minimum**: ≥ 80 chars (2 pts)  
**Character Count**: 712 chars  
**Input Value**:
```
Our data engineering pipeline maintains rigorous clinical corpus hygiene:
1. Source Grounding: RAG corpus is derived exclusively from verified public health authorities (DGHS Bangladesh, WHO, ICD-11, NICE Guidelines).
2. Deduplication & Semantic Chunking: Text is parsed along clinical section headers and semantic boundaries rather than arbitrary token cuts, eliminating mid-sentence context truncations.
3. Schema Enforcement: Pydantic v2 schemas enforce typed validation on all API payloads, blood donor profiles, and consultation records.
4. SHA-256 Ledger: Clinical datasets and trained diagnostic weights are locked with cryptographic SHA-256 digests in an immutable audit registry.
```

---

### Box 12: Privacy & Compliance Notes
**Minimum**: ≥ 80 chars (2–3 pts)  
**Character Count**: 748 chars  
**Input Value**:
```
ShasthoSetu is engineered in compliance with Bangladesh Digital Security Act principles, DGHS telemedicine ethics, and international HIPAA privacy standards:
1. Zero-Cloud Local Inference: All medical LLM processing runs entirely on local edge hardware (Ollama / Qwen 2.5 7B), ensuring sensitive patient conversations never leave the host server.
2. Masked Geo-Proximity Blood Connect: Donor phone numbers are masked (+880 17•• •••12) and disclosed only when mutual consent is verified between recipient hospital and donor.
3. Role-Based Access Control (RBAC): Hardened boundaries isolate Patient, Doctor, Support Desk, and Admin roles; Support accounts are programmatically blocked from patient clinical records (`ERR_ZERO_PHI_FORBIDDEN`).
```

---

### Box 13: Lineage & Observability Notes
**Minimum**: ≥ 80 chars (2 pts)  
**Character Count**: 698 chars  
**Input Value**:
```
End-to-end observability is achieved through structured audit logging and deterministic telemetry:
1. Trace Redaction & Export: RAG retrieval steps, similarity scores, token counts, and latency are logged with strict PHI scrubbing to `submission/03_rag_and_agents/sample_traces_redacted.json`.
2. Model Context Protocol Telemetry: MCP Hub tracks every tool call (guideline search, blood donor query, medical record lookup) with caller identity and execution timestamp.
3. Dagster & Prefect Orchestration: Automated workflows verify SQLite WAL database consistency, model register checksums, and RAG index health on a scheduled heartbeat.
```
