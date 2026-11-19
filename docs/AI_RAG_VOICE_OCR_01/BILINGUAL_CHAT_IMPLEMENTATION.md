# ShasthoSetu AI — Bilingual RAG Chatbot Implementation Report
**Document ID:** `REP-CHAT-RAG-01`  
**Subsystem:** Bilingual Conversational Medical Intelligence  
**Date:** 2026-11-19  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. System Overview & Core Capabilities

The ShasthoSetu AI Bilingual Chatbot delivers a safe, evidence-grounded health information assistant accessible across all four application portals as well as public service pages. It is engineered with strict clinical safety boundaries:

- **Never issues diagnostic claims or definitive prescriptions.**
- **Always anchors educational statements to verified corpus citations (`[1]`, `[2]`, `[3]`).**
- **Triggers immediate, prominent emergency warning banners** whenever red-flag symptoms (severe chest pain, respiratory distress, pediatric convulsions, high maternal fever) are detected.
- **Speaks the patient's language:** Seamlessly processes native Bengali Unicode, standard English, Romanized Bengali (Banglish), and mixed code-switching.

---

## 2. Prompt Architecture & ChatML Framing

The generative stage uses Ollama's `qwen2.5:7b` instruction model with strict ChatML delimiters (`<|im_start|>` and `<|im_end|>`) and greedy low-temperature decoding (`temperature: 0.2`) to suppress medical hallucinations.

### 2.1 System Safety Prompt (Verbatim Excerpt)

```text
You are ShasthoSetu AI, a trusted bilingual medical education and healthcare assistant for Bangladesh.
Language Context: You support বাংলা (Bengali), English, and Romanized Bengali (Banglish).

CLINICAL & SAFETY RULES:
1. Provide accurate, educational healthcare information grounded STRICTLY in the provided verified sources.
2. If the user asks in Bengali, reply in fluent, respectful Bengali (বাংলা).
   If in English, reply in English.
   If in Banglish, reply in Bengali (with key clinical terms in English in parentheses if helpful).
3. Ground your explanation using the provided numbered sources: [1], [2], etc.
   DO NOT fabricate facts or cite sources not present in the context.
4. Always emphasize that this is for educational information and cannot replace an in-person doctor consultation.
5. If the user mentions emergency red-flag symptoms (chest pain, severe breathing difficulty, sudden paralysis, unconsciousness, severe pregnancy complications, fever with stiff neck), IMMEDIATELY advise urgent emergency care and National Emergency Hotline 999.
```

---

## 3. Frontend Component Architecture

### 3.1 `AiHealthAssistant.tsx`
- **State & Session Persistence:** Full conversation threads stored in SQLite via `GET /v1/ai/chat/sessions` and `GET /v1/ai/chat/sessions/{session_id}/messages`.
- **Language Mode Toggle:** Triple-state selector (`Auto`, `বাংলা`, `English`). In `Auto` mode, the backend's fast language heuristic dynamically determines the primary script.
- **Zero Raw HTML Injection:** Renders model output through `SafeMarkdown.tsx`.
- **Direct Voice Integration:** Embeds `VoiceInputControls.tsx` for seamless speech-to-text with editable transcript confirmation.

### 3.2 `SafeMarkdown.tsx` (Zero `dangerouslySetInnerHTML`)
- Utilizes pure React JSX tokenization for headers, bold text, bullet points, callouts, and citation links.
- Intercepts citation tokens like `[1]`, `[2]` and renders them as interactive, accessible button pills that open the citation drawer.
- Eliminates Cross-Site Scripting (XSS) vectors by design.

### 3.3 `CitationDrawer.tsx` (Native HTML `<dialog>`)
- Built using the native HTML5 `<dialog>` element with `showModal()` and `closedby="any"` attributes for standards-compliant modal behavior and automatic focus management.
- Displays full provenance: Source Title, Publishing Authority, License, Publication Year, Section Name, and Verbatim Chunk Excerpt.

---

## 4. Emergency Triage Detection

The `safety_guard.py` engine scans every user query before retrieval. When acute keywords match emergency rules (e.g., `বুকে তীব্র ব্যথা`, `chest pain`, `শ্বাসকষ্ট`, `stiff neck`, `convulsion`, `bleeding in pregnancy`):
1. A top-level warning banner is attached to the response.
2. The UI renders high-visibility emergency actions (Direct dial to **999**, **16263** Swasthya Batayan, or local hospital emergency departments).
3. The RAG context is restricted to urgent triage guidance from WHO IMCI emergency protocols.
