# 16 — VIDEO PRODUCTION PIPELINE & PRIVACY AUDIT

Audit of the competition video production scripts and video privacy screening.

---

## 1. Video Pipeline Scripts
- `scripts/v3_assemble_andrew_1080p.py`: Assembles 1080p master competition video with FFmpeg.
- `scripts/v3_generate_andrew_audio_and_srt.py`: Synthesizes narration audio and synchronized subtitles.
- `scripts/v2_record_website_clips.js`: Headless browser recording of interactive portal workflows.

---

## 2. Privacy & Synthetic Data Screening
All video scenes and automated recording scripts verified by `scripts/verify_video_privacy_screening.py`:
- `PRIV-01`: All visible demo accounts have `is_synthetic = 1`.
- `PRIV-02`: Blood donors are synthetic test fixtures.
- `PRIV-03`: Prescription OCR records use synthetic test samples.
- `PRIV-04`: Zero production secrets or real API keys exposed.
- `PRIV-05`: Pediatric patient facial photography strictly excluded from public video footage.
- **Status:** **5 / 5 PRIVACY CHECKS PASSED**.
