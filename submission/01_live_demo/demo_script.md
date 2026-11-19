# ShasthoSetu AI — 3-Minute Video Presentation Script (Official Competition Submission)

> **Target Duration**: 03:00 (180 seconds)  
> **Language**: Bilingual (English narration with live Bengali UI demonstration)  
> **Visual Focus**: Screen recording of live application (`http://127.0.0.1:5173` or public Cloudflare tunnel) with camera overlay.

---

### Segment 1: The Problem & Vision (00:00 – 00:30)
- **Visual**: Open on the ShasthoSetu 3D Living Care Lattice homepage (`/`). Scroll smoothly to show the AgriSense-style floating header, bilingual language toggle, and 8-division Bangladesh map.
- **Voiceover**:
  > *"In Bangladesh, acute healthcare shortages and delayed diagnosis cause preventable loss of life daily. Over-the-counter self-medication is rampant, emergency blood coordination is fragmented, and patient health data is often exposed on insecure cloud servers. Welcome to **ShasthoSetu AI (স্বাস্থ্যসেতু)** — the first open-source, bilingual clinical intelligence and emergency telemedicine platform designed specifically for Bangladesh, running 100% locally with zero patient health information cloud leakage."*

---

### Segment 2: Bilingual Voice AI & Emergency 999 Handoff (00:30 – 01:10)
- **Visual**: Navigate to **Bangla Voice AI Studio** (`/services/ai-assistant`). Press the microphone button and speak in Bengali: *"আমার ৩ দিন ধরে ১০৩ ডিগ্রি জ্বর এবং চোখের পেছনে তীব্র ব্যথা।"*
- **Live Action**: Show Whisper-v3-turbo transcribing the audio, followed by the Qwen 2.5 7B Hybrid RAG response highlighting DGHS Dengue guidelines and hydration instructions.
- **Voiceover**:
  > *"Patients can speak naturally in colloquial Bengali or English. Our hybrid RAG engine combines dense BGE-M3 vector search with BM25 keyword matching and Clinical Knowledge Graphs, achieving an audited Top-3 Hit Rate of 100% and MRR of 0.9750. Notice how the system strictly warns against Aspirin and NSAIDs to prevent fatal bleeding complications."*
- **Visual**: Now type a critical emergency query: *"বুকে তীব্র চাপ লাগছে আর ব্যথাটা বাম বাহুতে ছড়িয়ে পড়ছে।"*
- **Live Action**: Show the immediate red **Emergency Code 999** banner appearing within 150ms.
- **Voiceover**:
  > *"When acute red flags like heart attacks or strokes are detected, our fail-closed safety gate instantly activates National Emergency Service 999 and DGHS 16263 handoff, refusing to generate speculative medical advice."*

---

### Segment 3: Geo-Radius Blood Connect & Masked Privacy (01:10 – 01:40)
- **Visual**: Switch to **Blood Connect Engine** (`/blood-connect`). Filter by Blood Group `O+`, select division `Dhaka`, and choose a 20 km radius.
- **Live Action**: Point out the masked contact numbers (`+880 17•• •••12`). Click *"Become a Donor"* or *"Copy Urgent Request"*.
- **Voiceover**:
  > *"Our Blood Connect engine coordinates emergency blood requests across all 8 administrative divisions of Bangladesh. To protect donor safety and prevent harassment, donor phone numbers are cryptographically masked until the recipient hospital verifies the emergency and dual consent is confirmed."*

---

### Segment 4: Prescription OCR Safety Gate & 43-Doctor Lounge (01:40 – 02:15)
- **Visual**: Navigate to **Prescription OCR Studio** (`/features/prescription-ocr`). Upload an ambiguous or messy prescription image.
- **Live Action**: Show the **HTTP 422 Unprocessable Entity** safety refusal screen.
- **Voiceover**:
  > *"Unlike generic AI chatbots that hallucinate lethal drug dosages from blurry handwriting, ShasthoSetu enforces a strict HTTP 422 refusal gate. Ambiguous scripts are halted and routed to BMDC-registered physicians in our 43-doctor telemedicine lounge for human-in-the-loop validation."*
- **Visual**: Switch to `/patient/consultations` showing instant video consultation bottom sheet and signed prescription document.

---

### Segment 5: Model Context Protocol (MCP) & Multi-Agent Architecture (02:15 – 02:45)
- **Visual**: Open **AI & Research Lab** (`/research#res-mcp` and `#res-agents`).
- **Live Action**:
  - Show the live **McpArchitectureExplorer** invoking `guideline-mcp`, `directory-mcp`, and testing the `care-record-mcp` Zero-PHI block.
  - Scroll to the **LangGraph State Machine Animation Deck**, click *"Run Live LangGraph"*, and watch the 5 nodes pulse and execute in real-time.
- **Voiceover**:
  > *"Under the hood, ShasthoSetu leads the open ecosystem with 3 custom-built Model Context Protocol (MCP) servers and full integration with public MCP tools. Multi-agent clinical workflows are orchestrated via deterministic LangGraph state graphs, with continuous background automation powered by n8n, Prefect, and Dagster."*

---

### Segment 6: Closing & Call to Action (02:45 – 03:00)
- **Visual**: Return to homepage with the Cloudflare quick tunnel badge visible.
- **Voiceover**:
  > *"ShasthoSetu AI runs completely offline on consumer hardware with an NVIDIA RTX GPU, yet is deployed live to the world via zero-trust Cloudflare tunneling. Accessible healthcare for 170 million people in Bangladesh starts here. Thank you."*
