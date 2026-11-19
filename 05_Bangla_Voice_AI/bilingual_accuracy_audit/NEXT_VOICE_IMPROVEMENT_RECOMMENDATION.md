# ShasthoSetu AI — Roadmap for Bangla Voice AI Clinical Accuracy Improvement

## 1. Why Zero-Shot Whisper Fails on Bengali Script

Off-the-shelf OpenAI Whisper models (Tiny, Base, Small, Medium, Large) exhibit severe performance asymmetry between English and Indic languages:
- **Pretraining Corpus Imbalance:** Less than 0.1% of Whisper's 680,000-hour pretraining corpus was Bengali speech with synchronized Bengali Unicode text.
- **Decoder Multilingual Prior Drift:** The Transformer decoder's language prior favors high-frequency Latin subwords. When Bengali audio is encoded by the audio encoder, the decoder generates Latin phonetics (*Banglish*) rather than Bengali Unicode codepoints (`U+0980` - `U+09FF`).
- **Numeric Ambiguity:** Numbers spoken in Bengali (e.g. 'একশ বিশ বাই আশি') get garbled or dropped without specialized medical numeral tokenization.

## 2. Concrete 3-Stage Technical Roadmap

### Stage 1: Supervised IndicLoRA / Parameter-Efficient Fine-Tuning (PEFT)
- **Base Model:** `openai/whisper-small` or `ai4bharat/indicwav2vec_v1_bengali`.
- **LoRA Configuration:** Rank $r=16$, $\alpha=32$, applied to query and value projection matrices of the cross-attention decoder layers.
- **Bengali Training Corpora:**
  - OpenSLR 53 (Bengali Large ASR Corpus: 500+ hours, crowd-sourced by native speakers in Bangladesh).
  - Mozilla Common Voice Bengali (v13: ~150 hours of verified native Bengali speech).
  - Target Outcome: Reduce Bengali WER from 121% to under 25%, restoring **100% Bengali Unicode script output**.

### Stage 2: Clinical Lexicon & Code-Switching Adaptation
- **Synthetic Multi-Speaker Clinical Code-Switching Engine:** Construct 5,000 audio-text pairs mixing Bengali syntax with English pharmacological brand names (DGDA-registered drugs: Napa, Seclo, Moxacil, Roxim, Rolac).
- **Contextual Biasing / Phrase Prompting:** Pass medical prompt prefixes to Whisper's decoder (e.g. `prompt='প্রেসক্রিপশন ডিকটেশন: ওষুধ, মাত্রা, রক্তচাপ'`) to condition the decoder on medical vocabulary.

### Stage 3: Human-in-the-Loop Clinical Verification Workflow
- Maintain strict EHR air-gap.
- Provide real-time audio playback aligned with highlighted low-confidence words.
- Physician clicks once to accept, or types inline to correct prior to export.
