# ShasthoSetu AI — Whisper Decoder Configuration & Linguistic Audit

- **Audit Date:** 2026-11-18 17:33:50
- **Audited Architectures:** OpenAI `whisper-tiny` (39M) & `whisper-base` (74M)

## 1. Transcription vs. Translation Audit

### Investigation:
Did Whisper perform semantic translation from Bengali to English, or transcription?

### Code & Configuration Inspection:
```python
gen_kwargs = {
    'task': 'transcribe',  # <-- Confirmed: STRICTLY TRANSCRIBE
    'return_dict_in_generate': True,
    'max_new_tokens': 128
}
```

### Verification Finding:
1. **`task='transcribe'` is strictly active:** The model's decoder sequence starts with `<|startoftranscript|>` followed by `<|transcribe|>` (NOT `<|translate|>`).
2. **Transliteration Drift is NOT Translation:**
   - When presented with Bengali speech, Whisper does NOT output English translations (e.g. it does not say *'It was supposed to be cut on Tuesday'*).
   - Instead, it outputs phonetic Romanization (*Banglish*): `kete ke mungol bar kete falar kota silo`.
   - **Root Cause:** Zero-shot Whisper's multilingual decoder prior has a severe bias toward the Latin character set when generating low-resource Indic languages, because its pretraining data for Bengali was predominantly romanized web-scrapes or aligned against Latin tokens.
   - Therefore, the output is a **script alphabet mismatch (transliteration drift)**, not semantic translation.

## 2. Tokenizer & Language Token Mechanics

| Configuration Mode | Language Token Injected | Bengali Output Script | English Output Script | Evaluation Rigor |
| :--- | :---: | :---: | :---: | :--- |
| `auto_detect` (`language=None`) | Predicted by Encoder (`<|bn|>` or `<|en|>`) | Romanized Latin | ASCII Latin | **Authentic Benchmark Mode** |
| `forced_bengali` (`language='bengali'`) | Forced `<|bn|>` in decoder prefix | Romanized Latin | Distorted Latin | Artificially constrained |
| `forced_english` (`language='english'`) | Forced `<|en|>` in decoder prefix | Romanized Latin | Clean English | Artificially constrained |

## 3. Mixed Code-Switching Behavior

- Whisper uses a single language token per utterance.
- On mixed utterances (e.g., `Cap Moxacil 500 milligram dine tin bar after meal 7 din continue korben`), Whisper emitted `<|en|>` because the acoustic anchor and TTS speaker voice were US English.
- Genuine English medical terms (`Moxacil`, `milligram`, `after meal`, `blood pressure`) were transcribed with high fidelity, while Bengali phonetic tokens were transcribed into Banglish.
