# How to Test: Multilingual RAG Assistant (Bengali, English, Banglish)

## Architectural Stack
* **Embeddings**: BAAI/bge-m3 (Dense 1024-dim multilingual vectors).
* **Keyword Matching**: BM25 Okapi with Porter/Bengali stemmers.
* **Vector Store**: FAISS IndexFlatIP normalized cosine similarity.
* **Knowledge Sources**: 14 DGHS/WHO verified medical guidelines.
* **Generation Engine**: Local Ollama (qwen2.5:3b / llama3) with deterministic fallback synthesizer.

## Testing Steps
1. Navigate to **Patient Portal** -> **Bilingual AI Assistant** (`/patient/assistant`).
2. **Bengali Query Test:**
   - Input: `পিসিওএস (PCOS) রোগের প্রাথমিক লক্ষণগুলো কী এবং খাদ্যাভ্যাসে কী পরিবর্তন আনা দরকার?`
   - Verify that the response includes verified citations linking to official guidelines (e.g., `DGHS PCOS Management Manual`).
3. **English Query Test:**
   - Input: `What are the Rotterdam criteria for diagnosing Polycystic Ovary Syndrome?`
   - Verify structured answer citing Rotterdam 2003 consensus criteria.
4. **Banglish Query Test:**
   - Input: `baby er 9 mashe kon tika dite hoy?`
   - Verify that the retrieval identifies `MR-1 (Measles-Rubella)` vaccine at 9 months.
5. **Source Provenance Inspection:**
   - Click any citation chip to view the exact verified source document title and chapter.
