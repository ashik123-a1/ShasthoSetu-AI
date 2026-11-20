from __future__ import annotations

import io
import os
import time
from typing import Any

import av
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

try:
    import torch
    from transformers import GenerationConfig, WhisperForConditionalGeneration, WhisperProcessor
    WHISPER_AVAILABLE = True
except ImportError:
    torch = None  # type: ignore
    GenerationConfig = None  # type: ignore
    WhisperForConditionalGeneration = None  # type: ignore
    WhisperProcessor = None  # type: ignore
    WHISPER_AVAILABLE = False

from ..config import settings
from .model_manager import (
    get_cached_model,
    get_model_lock,
    get_pytorch_device,
    record_runtime_status,
    release_ollama_model,
    set_cached_model,
    unload_pytorch_models,
)

MAX_AUDIO_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_AUDIO_SECONDS = 90.0
TARGET_SR = 16000


def _cache_hub_dir() -> str:
    return os.path.join(settings.hf_home, "hub")


def decode_audio_to_16k_mono(audio_bytes: bytes, filename: str = "audio.wav") -> tuple[np.ndarray, float, str]:
    """Decode WAV/FLAC/OGG/WebM/MP3/M4A bytes into 16kHz mono float32 numpy array without external ffmpeg."""
    if not audio_bytes:
        raise ValueError("Uploaded audio file is empty.")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise ValueError("Uploaded audio exceeds 15 MB limit.")

    ext = (os.path.splitext(filename or "")[1] or ".wav").lower().lstrip(".")

    # Fast path: soundfile supports WAV, FLAC, OGG cleanly
    if ext in {"wav", "flac", "ogg"}:
        try:
            data, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
            if data.ndim > 1:
                data = np.mean(data, axis=1)
            data = np.asarray(data, dtype=np.float32)
            if sr != TARGET_SR and len(data) > 0:
                from math import gcd
                g = gcd(int(sr), TARGET_SR)
                data = resample_poly(data, TARGET_SR // g, int(sr) // g).astype(np.float32)
            dur = round(len(data) / TARGET_SR, 2)
            if dur <= 0.05:
                raise ValueError("Audio clip is too short or silent.")
            if dur > MAX_AUDIO_SECONDS:
                raise ValueError(f"Audio clip exceeds {int(MAX_AUDIO_SECONDS)}s limit ({dur}s).")
            return data, dur, ext
        except ValueError:
            raise
        except Exception:
            # Fall through to PyAV for container codecs
            pass

    # General path: PyAV (handles webm/opus, mp3, m4a, mp4, ogg, wav)
    try:
        container = av.open(io.BytesIO(audio_bytes))
        audio_streams = [s for s in container.streams if s.type == "audio"]
        if not audio_streams:
            raise ValueError("No audio stream found in uploaded file.")
        resampler = av.audio.resampler.AudioResampler(format="flt", layout="mono", rate=TARGET_SR)
        chunks: list[np.ndarray] = []
        for frame in container.decode(audio=0):
            resampled_frames = resampler.resample(frame)
            for rf in resampled_frames:
                arr = rf.to_ndarray()
                chunks.append(arr.reshape(-1))
        # Flush resampler
        for rf in resampler.resample(None):
            chunks.append(rf.to_ndarray().reshape(-1))
        container.close()
        if not chunks:
            raise ValueError("Decoded audio contains zero samples.")
        data = np.concatenate(chunks).astype(np.float32)
        dur = round(len(data) / TARGET_SR, 2)
        if dur <= 0.05:
            raise ValueError("Audio clip is too short or silent.")
        if dur > MAX_AUDIO_SECONDS:
            raise ValueError(f"Audio clip exceeds {int(MAX_AUDIO_SECONDS)}s limit ({dur}s).")
        return data, dur, ext or "webm"
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Unsupported or corrupted audio format ({ext}): {exc}") from exc


def _resolve_en_whisper_id() -> str:
    hub_dir = _cache_hub_dir()
    small_dir = os.path.join(hub_dir, "models--openai--whisper-small", "snapshots")
    if os.path.isdir(small_dir):
        for _, _, files in os.walk(small_dir):
            if any("model" in f or "pytorch_model" in f for f in files):
                return "openai/whisper-small"
    # Fallback to fully cached whisper-base
    return "openai/whisper-base"


def _load_whisper(key: str, model_id: str, is_finetuned_bn: bool) -> tuple[WhisperProcessor, WhisperForConditionalGeneration, torch.device, str]:
    cached = get_cached_model(key)
    if cached is not None:
        proc, model, dev, dev_label = cached
        return proc, model, dev, dev_label

    release_ollama_model()
    unload_pytorch_models(except_keys={key})
    record_runtime_status(key, "LOADING", model_id, "loading")

    hub_dir = _cache_hub_dir()
    device, dev_label = get_pytorch_device(min_vram_mb=1800.0)

    # Check if target model has weights in snapshot
    snap_dir = os.path.join(hub_dir, f"models--{model_id.replace('/', '--')}", "snapshots")
    has_weights = False
    if os.path.isdir(snap_dir):
        for _, _, files in os.walk(snap_dir):
            if any("model" in f or "pytorch_model" in f for f in files):
                has_weights = True
                break

    if not has_weights and "whisper-small" in model_id and not is_finetuned_bn:
        model_id = _resolve_en_whisper_id()
        has_weights = True

    try:
        proc = WhisperProcessor.from_pretrained(model_id, cache_dir=hub_dir, local_files_only=has_weights)
        model = WhisperForConditionalGeneration.from_pretrained(model_id, cache_dir=hub_dir, local_files_only=has_weights).to(device)
        if is_finetuned_bn:
            gen_cfg_cached = os.path.isdir(os.path.join(hub_dir, "models--openai--whisper-small", "snapshots"))
            model.generation_config = GenerationConfig.from_pretrained(
                "openai/whisper-small",
                cache_dir=hub_dir,
                local_files_only=gen_cfg_cached,
            )
        model.eval()
        set_cached_model(key, (proc, model, device, dev_label))
        record_runtime_status(key, "READY", model_id, dev_label)
        return proc, model, device, dev_label
    except Exception as exc:
        record_runtime_status(key, "UNAVAILABLE", model_id, "cpu", {"error": str(exc)})
        raise RuntimeError(f"Whisper model '{model_id}' unavailable: {exc}") from exc


def _detect_whisper_language(proc: WhisperProcessor, model: WhisperForConditionalGeneration, device: torch.device, audio: np.ndarray) -> str:
    """Detect Bengali vs English via Whisper's language token logits on first 30s."""
    snippet = audio[: TARGET_SR * 30]
    inputs = proc(snippet, sampling_rate=TARGET_SR, return_tensors="pt").input_features.to(device)
    decoder_start_id = model.config.decoder_start_token_id or proc.tokenizer.convert_tokens_to_ids("<|startoftranscript|>")
    dec_input = torch.tensor([[decoder_start_id]], device=device)
    with torch.no_grad():
        logits = model(input_features=inputs, decoder_input_ids=dec_input).logits[0, 0]
    bn_tok = proc.tokenizer.convert_tokens_to_ids("<|bn|>")
    en_tok = proc.tokenizer.convert_tokens_to_ids("<|en|>")
    bn_score = float(logits[bn_tok].item()) if bn_tok is not None and bn_tok >= 0 else -1e9
    en_score = float(logits[en_tok].item()) if en_tok is not None and en_tok >= 0 else -1e9
    return "bn" if bn_score > en_score else "en"


def _run_whisper_chunks(
    proc: WhisperProcessor,
    model: WhisperForConditionalGeneration,
    device: torch.device,
    audio: np.ndarray,
    language: str,
) -> str:
    chunk_samples = TARGET_SR * 28
    segments: list[str] = []
    for start in range(0, len(audio), chunk_samples):
        piece = audio[start : start + chunk_samples]
        if len(piece) < int(0.1 * TARGET_SR):
            continue
        inputs = proc(piece, sampling_rate=TARGET_SR, return_tensors="pt").input_features.to(device)
        with torch.no_grad():
            gen_ids = model.generate(
                inputs,
                language=language,
                task="transcribe",
                max_new_tokens=320,
            )
        txt = proc.batch_decode(gen_ids, skip_special_tokens=True)[0].strip()
        if txt:
            segments.append(txt)
    return " ".join(segments).strip()


def transcribe_audio_bytes(
    audio_bytes: bytes,
    filename: str = "recording.wav",
    language_mode: str = "auto",
) -> dict[str, Any]:
    """Transcribe Bengali, English, or Auto audio using verified local Whisper checkpoints."""
    if not settings.voice_ai_enabled or not settings.ai_inference_enabled or not WHISPER_AVAILABLE:
        return {
            "transcript": "[Voice AI offline on shared hosting mode]",
            "detected_language": language_mode if language_mode in {"bn", "en"} else "bn",
            "model_id": "whisper-offline",
            "duration_sec": 0.0,
            "latency_ms": 0.1,
            "device": "cpu",
            "status": "OFFLINE",
            "message": "Voice AI inference offline on shared hosting mode",
            "mode": "cpanel_lightweight",
            "limitation": "Voice AI inference disabled on low-resource hosting tier."
        }
    t0 = time.perf_counter()
    audio, duration_sec, fmt = decode_audio_to_16k_mono(audio_bytes, filename)
    mode = language_mode if language_mode in {"auto", "bn", "en"} else "auto"

    lock = get_model_lock()
    with lock:
        if mode == "bn":
            proc, model, dev, dev_label = _load_whisper("asr_bn", "anuragshas/whisper-small-bn", is_finetuned_bn=True)
            record_runtime_status("asr_bn", "PROCESSING", "anuragshas/whisper-small-bn", dev_label)
            text = _run_whisper_chunks(proc, model, dev, audio, language="bengali")
            detected = "bn"
            used_model = "anuragshas/whisper-small-bn"
            limitation = (
                "Bengali ASR preview (39.09% FLEURS corpus WER). Verify & edit Bengali script before submitting."
            )
            record_runtime_status("asr_bn", "READY", used_model, dev_label)
        elif mode == "en":
            proc, model, dev, dev_label = _load_whisper("asr_en", "openai/whisper-small", is_finetuned_bn=False)
            record_runtime_status("asr_en", "PROCESSING", "openai/whisper-small", dev_label)
            text = _run_whisper_chunks(proc, model, dev, audio, language="english")
            detected = "en"
            used_model = "openai/whisper-small"
            limitation = "English transcription preserved without translating to Bengali. Please review medical terms before sending."
            record_runtime_status("asr_en", "READY", used_model, dev_label)
        else:
            # Auto mode: detect with Whisper-Small; route Bengali clips to whisper-small-bn
            proc_en, model_en, dev_en, dev_label = _load_whisper("asr_en", "openai/whisper-small", is_finetuned_bn=False)
            detected = _detect_whisper_language(proc_en, model_en, dev_en, audio)
            if detected == "bn":
                proc_bn, model_bn, dev_bn, dev_label = _load_whisper("asr_bn", "anuragshas/whisper-small-bn", is_finetuned_bn=True)
                record_runtime_status("asr_bn", "PROCESSING", "anuragshas/whisper-small-bn", dev_label)
                text = _run_whisper_chunks(proc_bn, model_bn, dev_bn, audio, language="bengali")
                used_model = "anuragshas/whisper-small-bn"
                limitation = "Auto-detected Bengali; mixed Banglish code-switching may drop English words—edit transcript if needed."
                record_runtime_status("asr_bn", "READY", used_model, dev_label)
            else:
                record_runtime_status("asr_en", "PROCESSING", "openai/whisper-small", dev_label)
                text = _run_whisper_chunks(proc_en, model_en, dev_en, audio, language="english")
                used_model = "openai/whisper-small"
                limitation = (
                    "Auto-detected English/Latin audio. If you spoke mixed Bangla-English (Banglish), review & edit the transcript before sending."
                )
                record_runtime_status("asr_en", "READY", used_model, dev_label)

    bn_chars = sum(1 for c in text if 0x0980 <= ord(c) <= 0x09FF)
    non_ws = max(1, sum(1 for c in text if not c.isspace()))
    bn_unicode_pct = round((bn_chars / non_ws) * 100.0, 2)
    latency_ms = int((time.perf_counter() - t0) * 1000)

    return {
        "raw_transcript": text,
        "transcript": text,
        "language_mode": mode,
        "detected_language": detected,
        "model_id": used_model,
        "device": dev_label,
        "audio_format": fmt,
        "duration_sec": duration_sec,
        "bn_unicode_pct": bn_unicode_pct,
        "latency_ms": latency_ms,
        "limitation_note": limitation,
        "requires_confirmation": True,
    }
