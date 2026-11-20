from __future__ import annotations

import gc
import json
import os
import threading
from typing import Any

import httpx

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    torch = None  # type: ignore
    TORCH_AVAILABLE = False

from ..config import PROJECT_ROOT, settings
from ..core.security import new_id, utc_now_iso
from ..db.sqlite import get_db_conn

# Enforce Drive G: Hugging Face cache before any transformers import downloads/reads
os.environ.setdefault("HF_HOME", settings.hf_home)
os.environ.setdefault("HUGGINGFACE_HUB_CACHE", str(os.path.join(settings.hf_home, "hub")))

_LOCK = threading.Lock()
_PYTORCH_MODELS: dict[str, Any] = {}
_COMPONENT_STATUS: dict[str, dict[str, Any]] = {}


def get_gpu_memory_info() -> dict[str, Any]:
    if not TORCH_AVAILABLE or torch is None or not torch.cuda.is_available():
        return {"cuda_available": False, "device_name": "cpu", "free_mb": 0.0, "total_mb": 0.0, "used_mb": 0.0}
    try:
        free_b, total_b = torch.cuda.mem_get_info(0)
        free_mb = round(free_b / (1024 * 1024), 1)
        total_mb = round(total_b / (1024 * 1024), 1)
        used_mb = round(total_mb - free_mb, 1)
        return {
            "cuda_available": True,
            "device_name": torch.cuda.get_device_name(0),
            "free_mb": free_mb,
            "total_mb": total_mb,
            "used_mb": used_mb,
        }
    except Exception as exc:
        return {"cuda_available": False, "device_name": f"cpu ({exc})", "free_mb": 0.0, "total_mb": 0.0, "used_mb": 0.0}


def get_pytorch_device(min_vram_mb: float = 1800.0) -> tuple[Any, str]:
    if not TORCH_AVAILABLE or torch is None:
        return "cpu", "cpu (PyTorch offline)"
    gpu = get_gpu_memory_info()
    if gpu.get("cuda_available") and gpu.get("free_mb", 0.0) >= min_vram_mb:
        return torch.device("cuda"), f"cuda ({gpu['device_name']})"
    if gpu.get("cuda_available"):
        return torch.device("cpu"), f"cpu (VRAM low: {gpu['free_mb']} MB free)"
    return torch.device("cpu"), "cpu"


def record_runtime_status(
    component_key: str,
    status: str,
    model_id: str = "",
    device_label: str = "cpu",
    detail: dict[str, Any] | None = None,
) -> None:
    gpu = get_gpu_memory_info()
    _COMPONENT_STATUS[component_key] = {
        "component_key": component_key,
        "status": status,
        "model_id": model_id,
        "device_label": device_label,
        "vram_used_mb": gpu.get("used_mb", 0.0),
        "detail": detail or {},
        "updated_at_utc": utc_now_iso(),
    }
    try:
        with get_db_conn() as conn:
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute(
                """
                INSERT INTO ai_runtime_snapshots (id, component_key, status, model_id, device_label, vram_used_mb, detail_json, updated_at_utc)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(component_key) DO UPDATE SET
                    status = excluded.status,
                    model_id = excluded.model_id,
                    device_label = excluded.device_label,
                    vram_used_mb = excluded.vram_used_mb,
                    detail_json = excluded.detail_json,
                    updated_at_utc = excluded.updated_at_utc
                """,
                (
                    new_id("rt"),
                    component_key,
                    status,
                    model_id,
                    device_label,
                    gpu.get("used_mb", 0.0),
                    json.dumps(detail or {}, ensure_ascii=False),
                    utc_now_iso(),
                ),
            )
            conn.execute("COMMIT;")
    except Exception:
        # Runtime telemetry failure must never crash inference
        pass


def unload_pytorch_models(except_keys: set[str] | None = None) -> list[str]:
    """Evict cached heavy PyTorch models from GPU/RAM to prevent OOM when switching workloads."""
    keep = except_keys or set()
    evicted: list[str] = []
    for k in list(_PYTORCH_MODELS.keys()):
        if k not in keep:
            _PYTORCH_MODELS.pop(k, None)
            evicted.append(k)
    if evicted:
        gc.collect()
        if TORCH_AVAILABLE and torch is not None and torch.cuda.is_available():
            try:
                torch.cuda.empty_cache()
            except Exception:
                pass
    return evicted


def release_ollama_model(model_name: str | None = None) -> None:
    """Ask Ollama to unload an LLM from GPU VRAM cleanly (keep_alive=0) before heavy PyTorch GPU work."""
    target = model_name or settings.ollama_chat_model
    try:
        with httpx.Client(timeout=3.0) as client:
            client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={"model": target, "prompt": "", "keep_alive": 0},
            )
    except Exception:
        pass


def get_cached_model(key: str) -> Any | None:
    return _PYTORCH_MODELS.get(key)


def set_cached_model(key: str, model_obj: Any) -> None:
    _PYTORCH_MODELS[key] = model_obj


def get_model_lock() -> threading.Lock:
    return _LOCK


def probe_ollama_models() -> dict[str, Any]:
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(f"{settings.ollama_base_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()
        models = [m.get("name", "") for m in data.get("models", [])]
        has_chat = any(settings.ollama_chat_model in m or m.startswith(settings.ollama_chat_model.split(":")[0]) and settings.ollama_chat_model in m for m in models)
        if not has_chat:
            has_chat = settings.ollama_chat_model in models
        has_embed = any(m == settings.ollama_embed_model or m.startswith(f"{settings.ollama_embed_model}:") for m in models)
        return {
            "reachable": True,
            "models": models,
            "chat_ready": has_chat,
            "embed_ready": has_embed,
        }
    except Exception as exc:
        return {
            "reachable": False,
            "models": [],
            "chat_ready": False,
            "embed_ready": False,
            "error": str(exc),
        }


def _check_hf_snapshot(repo_folder_name: str) -> bool:
    candidates = [os.path.join(str(settings.hf_home), "hub", repo_folder_name, "snapshots")]
    if "hf_cache" in str(settings.hf_home):
        candidates.append(os.path.join(os.path.expanduser("~/.cache/huggingface/hub"), repo_folder_name, "snapshots"))
    for cache_hub in candidates:
        if os.path.isdir(cache_hub):
            for _, _, files in os.walk(cache_hub):
                if any("model.safetensors" in f or "pytorch_model" in f for f in files):
                    return True
    return False


def _check_easyocr_cached() -> bool:
    easy_dir = os.path.join(os.path.expanduser("~"), ".EasyOCR", "model")
    return os.path.isfile(os.path.join(easy_dir, "bengali.pth")) and os.path.isfile(os.path.join(easy_dir, "english_g2.pth"))


def get_full_runtime_status() -> dict[str, Any]:
    gpu = get_gpu_memory_info()
    ollama = probe_ollama_models()
    bn_asr_cached = _check_hf_snapshot("models--anuragshas--whisper-small-bn")
    en_asr_cached = _check_hf_snapshot("models--openai--whisper-small") or _check_hf_snapshot("models--openai--whisper-base")
    bn_tts_cached = _check_hf_snapshot("models--facebook--mms-tts-ben")
    easyocr_cached = _check_easyocr_cached()

    # Check Windows SAPI English TTS presence quickly on Windows
    en_sapi_available = os.name == "nt"

    components = {
        "ollama_chat": {
            "label": "Local Bilingual LLM (RAG Generation)",
            "model_id": settings.ollama_chat_model,
            "runtime": "Ollama Local API",
            "status": "READY" if ollama["chat_ready"] else ("LOADING" if _COMPONENT_STATUS.get("ollama_chat", {}).get("status") == "LOADING" else "UNAVAILABLE"),
            "loaded_in_memory": ollama["chat_ready"],
            "license": "Apache-2.0",
            "detail": ollama.get("error") or ("Active on local Ollama server" if ollama["chat_ready"] else f"Model '{settings.ollama_chat_model}' not pulled or Ollama offline"),
        },
        "ollama_embed": {
            "label": "Multilingual Embeddings (Hybrid RAG)",
            "model_id": settings.ollama_embed_model,
            "runtime": "Ollama Local API + FAISS + BM25",
            "status": "READY" if ollama["embed_ready"] else "UNAVAILABLE",
            "loaded_in_memory": ollama["embed_ready"],
            "license": "MIT",
            "detail": ollama.get("error") or ("1024-dim multilingual embeddings ready" if ollama["embed_ready"] else f"Model '{settings.ollama_embed_model}' not available"),
        },
        "asr_bn": {
            "label": "Bengali Speech-to-Text (ASR)",
            "model_id": "anuragshas/whisper-small-bn",
            "runtime": "Transformers Whisper (Lazy GPU/CPU)",
            "status": _COMPONENT_STATUS.get("asr_bn", {}).get("status") or ("READY" if bn_asr_cached else "UNAVAILABLE"),
            "cached_on_disk": bn_asr_cached,
            "loaded_in_memory": "asr_bn" in _PYTORCH_MODELS,
            "license": "Apache-2.0",
            "detail": "Cached locally on G:/hf_cache (39.09% FLEURS corpus WER; human review required)" if bn_asr_cached else "Checkpoint missing from HF cache",
        },
        "asr_en": {
            "label": "English / Mixed Speech-to-Text (ASR)",
            "model_id": "openai/whisper-small",
            "runtime": "Transformers Whisper (Lazy GPU/CPU)",
            "status": _COMPONENT_STATUS.get("asr_en", {}).get("status") or ("READY" if en_asr_cached else "UNAVAILABLE"),
            "cached_on_disk": en_asr_cached,
            "loaded_in_memory": "asr_en" in _PYTORCH_MODELS,
            "license": "MIT",
            "detail": "Cached locally on G:/hf_cache (transcribes English without translating to Bengali)" if en_asr_cached else "Checkpoint missing from HF cache",
        },
        "tts_bn": {
            "label": "Bengali Text-to-Speech (TTS)",
            "model_id": _COMPONENT_STATUS.get("tts_bn", {}).get("model_id") or "facebook/mms-tts-ben",
            "runtime": "Local VITS / Browser Fallback",
            "status": _COMPONENT_STATUS.get("tts_bn", {}).get("status") or ("READY" if bn_tts_cached else "UNAVAILABLE"),
            "cached_on_disk": bn_tts_cached,
            "loaded_in_memory": "tts_bn" in _PYTORCH_MODELS,
            "license": "CC-BY-NC-4.0",
            "detail": _COMPONENT_STATUS.get("tts_bn", {}).get("detail", {}).get("message")
            or ("Local Bengali MMS-TTS cached; browser SpeechSynthesis checked on client" if bn_tts_cached else "Bengali local neural TTS unavailable unless cached; browser voice checked on client"),
        },
        "tts_en": {
            "label": "English Text-to-Speech (TTS)",
            "model_id": "Windows SAPI5 (Microsoft Zira / Hazel Desktop)",
            "runtime": "Offline Windows System.Speech + Browser SpeechSynthesis",
            "status": _COMPONENT_STATUS.get("tts_en", {}).get("status") or ("READY" if en_sapi_available else "UNAVAILABLE"),
            "loaded_in_memory": False,
            "license": "OS Built-in",
            "detail": "Offline Windows SAPI WAV synthesis available locally" if en_sapi_available else "Server SAPI unavailable; browser SpeechSynthesis used if available",
        },
        "ocr_easyocr": {
            "label": "Bilingual Prescription OCR (BN + EN)",
            "model_id": "M04-EASYOCR-PIPELINE-01 (EasyOCR bn+en + pypdfium2)",
            "runtime": "EasyOCR + PyPDFium2 (Lazy GPU/CPU)",
            "status": _COMPONENT_STATUS.get("ocr_easyocr", {}).get("status") or ("READY" if easyocr_cached else "UNAVAILABLE"),
            "cached_on_disk": easyocr_cached,
            "loaded_in_memory": "ocr_easyocr" in _PYTORCH_MODELS,
            "license": "Apache-2.0",
            "detail": "Bengali + English EasyOCR weights cached locally; mandatory HTTP 422 human verification gate enforced" if easyocr_cached else "EasyOCR model files not cached",
        },
    }

    # Include rag index metadata if built
    index_meta_path = settings.rag_index_dir / "index_meta.json"
    rag_index_info: dict[str, Any] = {"ready": False, "chunk_count": 0, "index_version": "unbuilt"}
    if index_meta_path.exists():
        try:
            rag_index_info = json.loads(index_meta_path.read_text(encoding="utf-8"))
            rag_index_info["ready"] = True
        except Exception:
            pass

    return {
        "checked_at_utc": utc_now_iso(),
        "gpu": gpu,
        "ollama": ollama,
        "rag_index": rag_index_info,
        "components": components,
        "project_root": str(PROJECT_ROOT),
    }
