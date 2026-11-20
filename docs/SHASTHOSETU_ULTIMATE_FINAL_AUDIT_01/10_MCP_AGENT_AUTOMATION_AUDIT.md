# 10 — MCP SERVERS, AGENT FRAMEWORKS & AUTOMATIONS AUDIT

Audit of the 6 Model Context Protocol (MCP) servers, 5 agent frameworks, and n8n workflows.

---

## 1. Model Context Protocol (MCP) Suite
- **Custom-Built MCP Servers (3):**
  1. `guideline-mcp`: Semantic retrieval of clinical guidelines (4 tools, 609ms latency).
  2. `directory-mcp`: Geospatial medical facility and hospital lookup (4 tools, 548ms latency).
  3. `care-record-mcp`: Longitudinal patient care record retrieval with Zero-PHI filtering (4 tools, 535ms latency).
- **Public MCP Servers (3):**
  1. `filesystem`: Bounded file operations restricted to approved docs directories (16 tools).
  2. `memory`: Knowledge-graph persistent clinical entity memory (9 tools).
  3. `sequential-thinking`: Dynamic clinical multi-step reasoning (1 tool).
- **Verification:** All 6 servers passed via `services/mcp/verify_mcp_suite.py`.

---

## 2. Agent Frameworks (5 Active Implementations)
1. **LangGraph:** Deterministic clinical triage state graph with emergency escalation.
2. **CrewAI:** Multi-agent clinical guideline auditor crew (Triage Nurse, Clinical Auditor, Safety Reviewer).
3. **AutoGen:** Human-in-the-loop clinical critic and safety review loop.
4. **OpenAI Agents SDK:** Medical specialty router and navigator.
5. **Swarm / Letta:** Zero-PHI boundary tester ensuring no cross-role data leaks.
- **Verification:** All 5 frameworks executed via `services/agents/verify_agents_suite.py` with traces recorded.

---

## 3. Automations & Webhooks
- **n8n Workflows (4):** `daily_clinical_audit.json`, `doctor_bmdc_verification.json`, `emergency_blood_sms.json`, `weekly_health_report.json`.
- **Webhook Security:** HMAC SHA-256 signature verification with replay protection window (13/13 tests passed in `test_webhook_security.py`).
