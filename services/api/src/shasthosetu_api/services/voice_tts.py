from __future__ import annotations

import os
import re
import subprocess
import tempfile
import time
from typing import Any

from ..config import settings
from .model_manager import (
    get_cached_model,
    get_model_lock,
    record_runtime_status,
    set_cached_model,
)
from .safety_guard import detect_script_language

_CITATION_BRACKET_RE = re.compile(r"\[\d+\]")
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_URL_RE = re.compile(r"https?://\S+")


def _clean_for_speech(text: str) -> str:
    txt = _MD_LINK_RE.sub(r"\1", text or "")
    txt = _URL_RE.sub("", txt)
    txt = _CITATION_BRACKET_RE.sub("", txt)
    txt = re.sub(r"[#*`_>|~]", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt[:1200]


def get_tts_capabilities() -> dict[str, Any]:
    en_available = os.name == "nt"
    hub_dir = os.path.join(settings.hf_home, "hub")
    bn_cached = os.path.isdir(os.path.join(hub_dir, "models--facebook--mms-tts-ben", "snapshots"))
    return {
        "english": {
            "available": en_available,
            "engine": "Windows SAPI5 (Microsoft Zira/Hazel Desktop)" if en_available else "Browser SpeechSynthesis only",
        },
        "bengali": {
            "available": bn_cached,
            "engine": "facebook/mms-tts-ben (Local VITS)" if bn_cached else "Unavailable locally (check browser voices)",
            "unavailable_message": None if bn_cached else "Bengali voice unavailable",
        },
    }


def _synthesize_english_sapi_wav(text: str) -> bytes:
    if os.name != "nt":
        raise RuntimeError("English server SAPI synthesis is only supported on Windows hosts.")
    cleaned = _clean_for_speech(text)
    if not cleaned:
        raise ValueError("Text for speech synthesis is empty.")
    # Guard against SAPI5 producing silent WAV if text contains no ASCII Latin words
    if not re.search(r"[A-Za-z0-9]", cleaned):
        raise ValueError("English TTS requires Latin/English characters; use Bengali voice for Bangla script.")

    with tempfile.TemporaryDirectory() as td:
        txt_path = os.path.join(td, "input.txt")
        wav_path = os.path.join(td, "speech.wav")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(cleaned)

        ps_script = (
            "Add-Type -AssemblyName System.Speech; "
            "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            "$v = $s.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'en-*' } | Select-Object -First 1; "
            "if ($v) { $s.SelectVoice($v.VoiceInfo.Name) }; "
            "$s.Rate = 0; $s.Volume = 100; "
            f"$s.SetOutputToWaveFile('{wav_path}'); "
            f"$t = [System.IO.File]::ReadAllText('{txt_path}', [System.Text.Encoding]::UTF8); "
            "$s.Speak($t); "
            "$s.Dispose();"
        )
        subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_script],
            check=True,
            capture_output=True,
            timeout=25,
        )
        with open(wav_path, "rb") as f:
            wav_bytes = f.read()
    record_runtime_status("tts_en", "READY", "Windows SAPI5", "cpu")
    return wav_bytes


def _synthesize_bengali_mms_wav(text: str) -> bytes:
    import io
    import numpy as np
    import soundfile as sf
    import torch
    from transformers import VitsModel, VitsTokenizer

    cleaned = _clean_for_speech(text)
    if not cleaned:
        raise ValueError("Text for speech synthesis is empty.")

    hub_dir = os.path.join(settings.hf_home, "hub")
    snap_dir = os.path.join(hub_dir, "models--facebook--mms-tts-ben", "snapshots")
    if not os.path.isdir(snap_dir) or not os.listdir(snap_dir):
        record_runtime_status("tts_bn", "UNAVAILABLE", "facebook/mms-tts-ben", "cpu", {"message": "Bengali voice unavailable locally"})
        raise RuntimeError("Bengali voice unavailable: local facebook/mms-tts-ben model not cached.")

    lock = get_model_lock()
    with lock:
        cached = get_cached_model("tts_bn")
        if cached is None:
            tok = VitsTokenizer.from_pretrained("facebook/mms-tts-ben", cache_dir=hub_dir, local_files_only=True)
            model = VitsModel.from_pretrained("facebook/mms-tts-ben", cache_dir=hub_dir, local_files_only=True)
            model.eval()
            set_cached_model("tts_bn", (tok, model))
        else:
            tok, model = cached

        inputs = tok(cleaned, return_tensors="pt")
        with torch.no_grad():
            waveform = model(**inputs).waveform
        arr = waveform.squeeze().cpu().numpy().astype(np.float32)

    buf = io.BytesIO()
    sf.write(buf, arr, int(model.config.sampling_rate), format="WAV")
    record_runtime_status("tts_bn", "READY", "facebook/mms-tts-ben", "cpu")
    return buf.getvalue()


def synthesize_speech_wav(text: str, language: str = "auto") -> dict[str, Any]:
    t0 = time.perf_counter()
    lang = language if language in {"bn", "en", "auto"} else "auto"
    if lang == "auto":
        script = detect_script_language(text)
        bn_chars = sum(1 for ch in (text or "") if "\u0980" <= ch <= "\u09ff")
        en_chars = sum(1 for ch in (text or "") if ch.isascii() and ch.isalpha())
        lang = "bn" if (script == "bn" or bn_chars > en_chars) else "en"

    if lang == "en":
        try:
            wav_bytes = _synthesize_english_sapi_wav(text)
            return {
                "available": True,
                "language": "en",
                "model_id": "Windows SAPI5",
                "mime_type": "audio/wav",
                "wav_bytes": wav_bytes,
                "latency_ms": int((time.perf_counter() - t0) * 1000),
            }
        except ValueError as exc:
            return {
                "available": False,
                "language": "en",
                "model_id": "Windows SAPI5",
                "reason": str(exc),
                "unavailable_message": str(exc),
                "latency_ms": int((time.perf_counter() - t0) * 1000),
            }

    # Bengali path
    try:
        wav_bytes = _synthesize_bengali_mms_wav(text)
        return {
            "available": True,
            "language": "bn",
            "model_id": "facebook/mms-tts-ben",
            "mime_type": "audio/wav",
            "wav_bytes": wav_bytes,
            "latency_ms": int((time.perf_counter() - t0) * 1000),
        }
    except RuntimeError as exc:
        return {
            "available": False,
            "language": "bn",
            "model_id": "facebook/mms-tts-ben",
            "reason": str(exc),
            "unavailable_message": "Bengali voice unavailable",
            "latency_ms": int((time.perf_counter() - t0) * 1000),
        }
