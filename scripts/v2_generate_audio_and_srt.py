import asyncio
import json
import os
import re
import subprocess
import sys
import numpy as np
import soundfile as sf
from scipy import signal, ndimage
import edge_tts

sys.stdout.reconfigure(line_buffering=True)

OUT_ROOT = os.path.join("docs", "SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01")
BUILD_DIR = os.path.join(OUT_ROOT, "_build")
AUDIO_BUILD_DIR = os.path.join(BUILD_DIR, "audio")
AUDIO_FINAL_DIR = os.path.join(OUT_ROOT, "audio")
SUB_DIR = os.path.join(OUT_ROOT, "subtitles")
FFMPEG = r"C:\Users\ASHIK_CSE\AppData\Local\Programs\Python\Python311\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"

VOICE = "en-US-BrianNeural"
FALLBACK_VOICES = ["en-US-ChristopherNeural", "en-US-AndrewNeural"]

# ---------------------------------------------------------------------------
# 13-CHAPTER 180-SECOND COMPETITION PITCH SCRIPT
# Every metric matches apps/web/src/pages/PublicResearchPage.tsx verbatim.
# ---------------------------------------------------------------------------
PITCH_SEGMENTS = [
    {
        "id": "s01_crisis_hook",
        "act": "ACT I · THE CRISIS",
        "label": "170M Citizens · Specialist Deficit, Viral Fevers & Paper Rx Harm",
        "rate": "+0%",
        "text": "Across Bangladesh, specialist shortages and unsafe prescriptions put millions at risk.",
        "pause_after": 0.20,
    },
    {
        "id": "s02_preloader",
        "act": "LAUNCH",
        "label": "8,600-Particle Bio-Resonance Launch · ShasthoSetu AI",
        "rate": "+0%",
        "text": "Welcome to Shastho-Setu AI.",
        "pause_after": 0.35,
    },
    {
        "id": "s03_platform_care_map",
        "act": "ACT II · NATIONAL PLATFORM",
        "label": "Bilingual EN / Bangla Portal & 8-Division Care Atlas",
        "rate": "+0%",
        "text": (
            "Shastho-Setu AI connects patients, verified doctors, and auditable clinical AI in Bengali and English, "
            "featuring an eight-division care map and instant booking."
        ),
        "pause_after": 0.40,
    },
    {
        "id": "s04_pcos_multimodal",
        "act": "ACT II · M01 & M02 PCOS AI",
        "label": "Live Input -> XGBoost & ResNet18 Execution -> Result & Limitations",
        "rate": "+0%",
        "text": (
            "Following Rotterdam guidelines, clinical and imaging tracks run separately. "
            "Live endocrine inputs execute Model One XGBoost at 94.4 percent accuracy, "
            "while ultrasound scans run Model Two ResNet-18 at 86.7 percent, "
            "strictly for non-diagnostic decision support."
        ),
        "pause_after": 0.40,
    },
    {
        "id": "s05_viral_pediatric",
        "act": "ACT II · M03 & M06 PEDIATRIC AI",
        "label": "Live Sample Execution · 91.94% Measles Recall & N=22 Limit",
        "rate": "+0%",
        "text": (
            "Loading a real rash scan runs Model Three ResNet-18 across 755 leak-free families "
            "at 91.9 percent measles recall, after quarantining an earlier leaked split. "
            "Model Six then evaluates pediatric skin scans while disclosing its 22-patient cohort limit."
        ),
        "pause_after": 0.40,
    },
    {
        "id": "s06_prescription_ocr",
        "act": "ACT III · M04 SAFE-OCR",
        "label": "Patient Text Acknowledgement vs. Doctor Clinical Authorization",
        "rate": "+0%",
        "text": (
            "Across one thousand audited prescriptions, Safe-OCR separates patient verification from clinical approval. "
            "Patient confirmation verifies text only behind an HTTP 422 safety lock, "
            "remaining blocked until an approved doctor authorizes the treatment plan."
        ),
        "pause_after": 0.40,
    },
    {
        "id": "s07_bangla_voice",
        "act": "ACT III · M05 BANGLA VOICE",
        "label": "Live Bangla Input -> Whisper-Small-BN & 39.09% FLEURS Limit",
        "rate": "+0%",
        "text": (
            "Model Five powers our 3D Voice Studio with Whisper Small Bengali, "
            "answering spoken clinical queries at 98.4 percent Unicode integrity, "
            "while transparently reporting its 39.1 percent FLEURS benchmark error rate."
        ),
        "pause_after": 0.40,
    },
    {
        "id": "s08_rag_citations_999",
        "act": "ACT III · CLINICAL RAG & 999 GATE",
        "label": "Live Q&A, Citation Drawer, 3D Body Scanner & Red-Flag Override",
        "rate": "+0%",
        "text": (
            "Our Clinical Assistant answers medical questions with verified guideline sources "
            "in an interactive citation drawer, while pairing a 3D Body Scanner and LangGraph engine "
            "to trigger immediate 999 emergency routing on cardiac red flags."
        ),
        "pause_after": 0.40,
    },
    {
        "id": "s09_telemedicine",
        "act": "ACT IV · TELEMEDICINE WORKSPACE",
        "label": "Approved BMDC Clinician Desk · Notes & Signed e-Prescription",
        "rate": "+0%",
        "text": (
            "Inside our approved clinician workspace, verified specialists like Doctor Farhana "
            "conduct encrypted consultations and issue signed digital prescriptions."
        ),
        "pause_after": 0.40,
    },
    {
        "id": "s10_blood_connect",
        "act": "ACT IV · BLOOD CONNECT",
        "label": "5/10/20 km Geo-Radius Matching & Masked Donor Privacy",
        "rate": "+0%",
        "text": (
            "During dengue emergencies, Blood Connect finds willing donors within five, ten, "
            "or twenty kilometers, while keeping phone numbers masked until hospital cross-matching."
        ),
        "pause_after": 0.40,
    },
    {
        "id": "s11_security_zerophi",
        "act": "ACT IV · TRUST & ZERO-PHI",
        "label": "5-Role RBAC · HTTP 403 Clinical Isolation · 40/40 Checks Passed",
        "rate": "+0%",
        "text": (
            "Every portal enforces five-role access control, HTTP 403 Zero-PHI support isolation, "
            "and forty passing security checks over strictly synthetic demo records."
        ),
        "pause_after": 0.40,
    },
    {
        "id": "s12_team_brief",
        "act": "TEAM SHASTHOSETU AI",
        "label": "5-Engineer Dhaka Squad · AI, 3D Systems & Clinical Security",
        "rate": "+0%",
        "text": (
            "Built in Dhaka by Team Leader Nakib Md Ashik and our five-engineer squad "
            "across clinical AI, 3D systems, and security."
        ),
        "pause_after": 0.35,
    },
    {
        "id": "s13_closing_endcard",
        "act": "CLOSING · SHASTHOSETU AI",
        "label": "github.com/ashik123-a1/ShasthoSetu-AI · Hugging Face Open Benchmarks",
        "rate": "+0%",
        "text": (
            "Audited, bilingual, and doctor-governed. Shastho-Setu AI turns diagnostic delays into safer care. "
            "Explore our open repository and clinical benchmarks today."
        ),
        "pause_after": 1.35,
    },
]


def format_srt_time(seconds: float) -> str:
    ms = int(round(max(0.0, seconds) * 1000))
    hrs = ms // 3600000
    ms %= 3600000
    mins = ms // 60000
    ms %= 60000
    secs = ms // 1000
    ms %= 1000
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"


def format_vtt_time(seconds: float) -> str:
    return format_srt_time(seconds).replace(",", ".")


def _normalize_caption_words(words):
    if not words:
        return []
    merged = []
    for w in words:
        item = dict(w)
        item["word"] = (
            item["word"]
            .replace("Shastho-Setu", "ShasthoSetu")
            .replace("ShasthoSetu", "ShasthoSetu")
            .replace("ResNet-18", "ResNet18")
        )
        merged.append(item)
    return merged


def chunk_words_for_srt(words, start_t, end_t, max_chars=44, max_lines=2):
    words = _normalize_caption_words(words)
    if not words:
        return []
    total_dur = max(0.2, end_t - start_t)
    limit = max_chars * max_lines - 6

    cues = []
    cur_words = []
    cur_len = 0
    for w in words:
        add_len = len(w["word"]) + (1 if cur_words else 0)
        if cur_words and (cur_len + add_len > limit or len(cur_words) >= 13):
            cues.append(cur_words)
            cur_words = [w]
            cur_len = len(w["word"])
        else:
            cur_words.append(w)
            cur_len += add_len
    if cur_words:
        cues.append(cur_words)

    out = []
    total_chars = sum(sum(len(w["word"]) for w in grp) for grp in cues) or 1
    cursor = start_t
    for idx, grp in enumerate(cues):
        if "start" in grp[0] and "end" in grp[-1]:
            c_start = grp[0]["start"]
            c_end = grp[-1]["end"]
        else:
            frac = sum(len(w["word"]) for w in grp) / total_chars
            c_start = cursor
            c_end = end_t if idx == len(cues) - 1 else cursor + total_dur * frac
            cursor = c_end

        raw_text = " ".join(w["word"] for w in grp)
        lines = []
        line = ""
        for token in raw_text.split(" "):
            cand = f"{line} {token}".strip()
            if len(cand) <= max_chars:
                line = cand
            else:
                if line:
                    lines.append(line)
                line = token
        if line:
            lines.append(line)
        if len(lines) > 2 or (len(lines) == 2 and abs(len(lines[0]) - len(lines[1])) > 18):
            mid = len(raw_text) // 2
            split_idx = raw_text.rfind(" ", 0, mid + 8)
            if split_idx == -1:
                split_idx = raw_text.find(" ", mid)
            if split_idx != -1:
                lines = [raw_text[:split_idx].strip(), raw_text[split_idx + 1:].strip()]
        out.append({
            "start": c_start,
            "end": max(c_start + 0.35, c_end),
            "text": "\n".join(lines[:2]),
        })
    return out


async def synthesize_segment(text: str, rate: str, mp3_path: str, wav_path: str, wb_json_path: str):
    if os.path.exists(wav_path) and os.path.getsize(wav_path) > 2000 and os.path.exists(wb_json_path):
        data, sr = sf.read(wav_path, dtype="float32")
        with open(wb_json_path, "r", encoding="utf-8") as f:
            word_events = json.load(f)
        return len(data) / sr, word_events

    voices_to_try = [VOICE] + FALLBACK_VOICES
    last_err = None
    word_events = []
    for attempt in range(4):
        try:
            if attempt > 0:
                await asyncio.sleep(1.2 * attempt)
            v_use = voices_to_try[min(attempt, len(voices_to_try) - 1)]
            comm = edge_tts.Communicate(text=text, voice=v_use, rate=rate, boundary="WordBoundary")
            audio_chunks = bytearray()
            word_events = []
            async for chunk in comm.stream():
                ctype = chunk.get("type")
                if ctype == "audio":
                    audio_chunks.extend(chunk["data"])
                elif ctype == "WordBoundary":
                    offset_s = chunk.get("offset", 0) / 1e7
                    dur_s = chunk.get("duration", 0) / 1e7
                    w_txt = chunk.get("text", "").strip()
                    if w_txt:
                        word_events.append({
                            "word": w_txt,
                            "start": offset_s,
                            "end": offset_s + max(0.05, dur_s),
                        })
            if len(audio_chunks) > 500:
                with open(mp3_path, "wb") as f:
                    f.write(audio_chunks)
                break
        except Exception as e:
            last_err = e
    else:
        raise RuntimeError(f"Edge-TTS failed after 4 attempts for {mp3_path}: {last_err}")

    # Crisp studio broadcast vocal clarity EQ + gentle compression + start-silence trim
    subprocess.run(
        [
            FFMPEG, "-y", "-i", mp3_path,
            "-af", "highpass=f=85,equalizer=f=220:t=q:w=1.4:g=-1.2,equalizer=f=3400:t=q:w=1.2:g=2.4,treble=g=1.6:f=8000,acompressor=threshold=-18dB:ratio=2.4:attack=15:release=180:makeup=2dB,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-55dB:detection=peak",
            "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", wav_path,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    data, sr = sf.read(wav_path, dtype="float32")
    dur = len(data) / sr

    if not word_events or len(word_events) < max(2, len(text.split()) // 2):
        word_events = [{"word": t} for t in text.split()]
    else:
        # Preserve punctuation cleanly against source tokens when counts match, else keep boundary words
        src_tokens = text.split()
        if len(src_tokens) == len(word_events):
            for idx, st in enumerate(src_tokens):
                word_events[idx]["word"] = st

    with open(wb_json_path, "w", encoding="utf-8") as f:
        json.dump(word_events, f, indent=2)
    return dur, word_events


def build_emotional_underscore(duration_s: float, crisis_end_s: float, sr: int = 48000) -> np.ndarray:
    """
    Two-phase cinematic underscore:
    - Act I (Crisis & Team, 0 -> crisis_end_s): Somber, serious minor chord pad (Dm / Bb / Gm / A7sus4)
      with warm 55 Hz emotional sub-pulse.
    - Acts II-IV (Resolution & Solutions, crisis_end_s -> end): Hopeful science progression
      (Dmaj7 / Bm9 / Gmaj7 / Aadd9) with subtle organic telemetry pulse & graceful fadeout.
    """
    n = int(round(duration_s * sr))
    t = np.linspace(0.0, duration_s, n, endpoint=False, dtype=np.float64)

    crisis_chords = [
        [146.83, 174.61, 220.00, 293.66],   # Dm
        [116.54, 174.61, 233.08, 293.66],   # Bb
        [98.00, 146.83, 196.00, 293.66],    # Gm
        [110.00, 164.81, 220.00, 277.18],   # A / Am tint
    ]
    hope_chords = [
        [146.83, 220.00, 277.18, 329.63, 440.00],  # Dmaj7
        [123.47, 185.00, 220.00, 293.66, 369.99],  # Bm9
        [98.00, 196.00, 246.94, 293.66, 369.99],   # Gmaj7
        [110.00, 220.00, 277.18, 329.63, 493.88],  # Aadd9
    ]

    bar_sec = 5.5
    pad_l = np.zeros(n, dtype=np.float64)
    pad_r = np.zeros(n, dtype=np.float64)
    num_bars = int(np.ceil(duration_s / bar_sec))

    for b in range(num_bars):
        t_bar = b * bar_sec
        use_crisis = t_bar < max(20.0, crisis_end_s)
        pool = crisis_chords if use_crisis else hope_chords
        freqs = pool[b % len(pool)]

        s_idx = int(t_bar * sr)
        e_idx = min(n, int((b + 1) * bar_sec * sr + 0.9 * sr))
        if s_idx >= n:
            break
        seg_len = e_idx - s_idx
        lt = np.linspace(0.0, seg_len / sr, seg_len, endpoint=False)
        env = np.ones(seg_len)
        fi = min(int(0.9 * sr), seg_len // 3)
        fo = min(int(1.0 * sr), seg_len // 3)
        if fi > 0:
            env[:fi] = np.sin(np.linspace(0, np.pi / 2, fi)) ** 2
        if fo > 0:
            env[-fo:] = np.cos(np.linspace(0, np.pi / 2, fo)) ** 2

        sig_l = np.zeros(seg_len)
        sig_r = np.zeros(seg_len)
        for fi_i, f0 in enumerate(freqs):
            detune = 0.0022 * ((fi_i % 2) * 2 - 1)
            w_l = np.sin(2 * np.pi * f0 * (1.0 - detune) * lt) + 0.14 * np.sin(4 * np.pi * f0 * lt)
            w_r = np.sin(2 * np.pi * f0 * (1.0 + detune) * lt + 0.4) + 0.14 * np.sin(4 * np.pi * f0 * lt + 0.3)
            amp = 0.25 if fi_i == 0 else (0.16 / (1 + 0.25 * fi_i))
            sig_l += amp * w_l
            sig_r += amp * w_r

        pad_l[s_idx:e_idx] += sig_l * env
        pad_r[s_idx:e_idx] += sig_r * env

    # Somber emotional sub-bass during crisis phase
    c_n = min(n, int((crisis_end_s + 2.0) * sr))
    t_sub = np.linspace(0.0, c_n / sr, c_n, endpoint=False)
    sub = 0.16 * np.sin(2 * np.pi * 55.0 * t_sub) * (np.cos(np.linspace(0, np.pi / 2, c_n)) ** 0.5)
    pad_l[:c_n] += sub
    pad_r[:c_n] += sub

    # Subtle slow pulse (60 BPM)
    pulse = 0.80 + 0.20 * np.sin(2 * np.pi * (60.0 / 60.0) * t)
    pad_l *= pulse
    pad_r *= pulse

    # Warm analog low-pass so speech formants stay crisp
    sos = signal.butter(4, 1450.0, btype="low", fs=sr, output="sos")
    pad_l = signal.sosfilt(sos, pad_l)
    pad_r = signal.sosfilt(sos, pad_r)

    stereo = np.stack([pad_l, pad_r], axis=1)
    fi_g = min(int(1.2 * sr), n // 6)
    fo_g = min(int(2.4 * sr), n // 5)
    stereo[:fi_g, :] *= np.linspace(0.0, 1.0, fi_g)[:, None]
    stereo[-fo_g:, :] *= np.linspace(1.0, 0.0, fo_g)[:, None]
    peak = np.max(np.abs(stereo)) or 1.0
    return (stereo / peak * 0.23).astype(np.float32)


def mix_voice_and_music(segments_meta, music: np.ndarray, ch_times: list, out_wav: str, sr: int = 48000):
    total_n = len(music)
    voice_bus = np.zeros((total_n, 2), dtype=np.float32)
    sfx_bus = np.zeros((total_n, 2), dtype=np.float32)

    for seg in segments_meta:
        wav, _ = sf.read(seg["wav"], dtype="float32")
        if wav.ndim == 1:
            wav = np.stack([wav, wav], axis=1)
        s_idx = int(round(seg["start_s"] * sr))
        e_idx = min(total_n, s_idx + len(wav))
        voice_bus[s_idx:e_idx] += wav[: e_idx - s_idx]

    v_peak = np.max(np.abs(voice_bus)) or 1.0
    voice_bus = voice_bus * (0.86 / v_peak)

    # Subtle transition chime at chapter cuts
    for ct in ch_times[1:]:
        idx = int(round(ct * sr))
        dur_s = 0.26
        m = int(dur_s * sr)
        if idx + m >= total_n:
            continue
        lt = np.linspace(0.0, dur_s, m, endpoint=False)
        chime = np.sin(2 * np.pi * 784.0 * lt) * np.exp(-lt * 16.0) * 0.030
        sfx_bus[idx : idx + m, 0] += chime
        sfx_bus[idx : idx + m, 1] += chime

    # O(N) smooth sidechain ducking — keeps underscore supportive without crowding voice clarity
    v_env = np.abs(voice_bus).mean(axis=1)
    smooth_env = ndimage.uniform_filter1d(v_env, size=int(0.35 * sr))
    duck = np.clip(1.0 - smooth_env * 25.0, 0.10, 0.45)[:, None]

    mixed = voice_bus + (music * duck * 0.28) + sfx_bus
    peak = np.max(np.abs(mixed))
    if peak > 0.89:
        mixed = mixed * (0.89 / peak)

    sf.write(out_wav, mixed.astype(np.float32), sr, subtype="PCM_16")


async def main():
    os.makedirs(AUDIO_BUILD_DIR, exist_ok=True)
    os.makedirs(AUDIO_FINAL_DIR, exist_ok=True)
    os.makedirs(SUB_DIR, exist_ok=True)

    cur_t = 0.25
    meta = []
    all_cues = []
    ch_times = []
    crisis_end_s = 10.0

    for i, seg in enumerate(PITCH_SEGMENTS):
        mp3 = os.path.join(AUDIO_BUILD_DIR, f"v2_{seg['id']}.mp3")
        wav = os.path.join(AUDIO_BUILD_DIR, f"v2_{seg['id']}.wav")
        wb_json = os.path.join(AUDIO_BUILD_DIR, f"v2_{seg['id']}_wb.json")
        print(f"[TTS] Synthesizing {seg['id']} ({seg['rate']})...")
        dur, word_events = await synthesize_segment(seg["text"], seg["rate"], mp3, wav, wb_json)

        seg_start = cur_t
        seg_end = seg_start + dur
        ch_times.append(seg_start)

        shifted_words = []
        for w in word_events:
            item = {"word": w["word"]}
            if "start" in w and "end" in w:
                item["start"] = min(seg_end, seg_start + w["start"])
                item["end"] = min(seg_end, seg_start + w["end"])
            shifted_words.append(item)

        cues = chunk_words_for_srt(shifted_words, seg_start, seg_end, max_chars=44, max_lines=2)
        all_cues.extend(cues)

        scene_end = seg_end + seg["pause_after"]
        if seg["id"] == "s02_preloader":
            crisis_end_s = scene_end

        meta.append({
            **seg,
            "wav": wav,
            "voice_dur": dur,
            "start_s": seg_start,
            "end_s": seg_end,
            "scene_start": 0.0 if i == 0 else seg_start - 0.12,
            "scene_end": scene_end,
            "scene_dur": scene_end - (0.0 if i == 0 else seg_start - 0.12),
        })
        print(f"      -> {seg['id']}: voice={dur:.2f}s | window=[{seg_start:.2f}s -> {scene_end:.2f}s]")
        cur_t = scene_end

    total_dur = cur_t
    print(f"\n[TOTAL NARRATION + PAUSES] {total_dur:.3f}s (Target <= 180.0s)")

    out_wav_build = os.path.join(AUDIO_BUILD_DIR, "master_180s.wav")
    out_wav_final = os.path.join(AUDIO_FINAL_DIR, "master_audio_mixed.wav")
    out_srt = os.path.join(SUB_DIR, "shasthosetu_en.srt")
    out_vtt = os.path.join(SUB_DIR, "shasthosetu_en.vtt")
    timeline_path = os.path.join(BUILD_DIR, "timeline_manifest.json")

    music = build_emotional_underscore(total_dur, crisis_end_s=crisis_end_s, sr=48000)
    mix_voice_and_music(meta, music, ch_times, out_wav_build, sr=48000)

    # Mirror clean 48kHz master to audio/ folder
    import shutil
    shutil.copyfile(out_wav_build, out_wav_final)

    with open(out_srt, "w", encoding="utf-8") as f:
        for idx, cue in enumerate(all_cues, 1):
            f.write(f"{idx}\n{format_srt_time(cue['start'])} --> {format_srt_time(cue['end'])}\n{cue['text']}\n\n")

    with open(out_vtt, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
        for idx, cue in enumerate(all_cues, 1):
            f.write(f"{idx}\n{format_vtt_time(cue['start'])} --> {format_vtt_time(cue['end'])}\n{cue['text']}\n\n")

    manifest = {
        "pitch_180s": {
            "total_duration_s": round(total_dur, 3),
            "audio_wav": out_wav_build,
            "srt_path": out_srt,
            "vtt_path": out_vtt,
            "voice": VOICE,
            "segments": [
                {
                    "id": m["id"],
                    "act": m["act"],
                    "label": m["label"],
                    "text": m["text"],
                    "voice_dur": round(m["voice_dur"], 3),
                    "start_s": round(m["start_s"], 3),
                    "end_s": round(m["end_s"], 3),
                    "scene_start": round(m["scene_start"], 3),
                    "scene_end": round(m["scene_end"], 3),
                }
                for m in meta
            ],
            "cues": all_cues,
        }
    }
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"[SAVED] Master Audio : {out_wav_build}")
    print(f"[SAVED] Subtitles    : {out_srt} ({len(all_cues)} cues)")
    print(f"[SAVED] Manifest     : {timeline_path}")


if __name__ == "__main__":
    asyncio.run(main())
