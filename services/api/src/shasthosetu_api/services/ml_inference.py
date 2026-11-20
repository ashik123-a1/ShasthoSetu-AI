from __future__ import annotations

import hashlib
import io
import math
import re
import threading
import time
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from PIL import Image
from pypdf import PdfReader

try:
    import torch
    import torch.nn as nn
    from torchvision import transforms
    from torchvision.models import resnet18
    TORCH_AVAILABLE = True
except ImportError:
    torch = None  # type: ignore
    nn = None  # type: ignore
    transforms = None  # type: ignore
    resnet18 = None  # type: ignore
    TORCH_AVAILABLE = False

from ..config import PROJECT_ROOT, settings

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

M01_FEATURES = [
    "age",
    "testosterone",
    "androstenedione",
    "sdhea",
    "waist_circumference",
    "bmi",
    "fsh",
    "lh",
    "prl",
    "homa_ir",
    "e2",
    "oh_prog_17",
    "sbp",
    "dbp",
    "glucose",
    "total_cholesterol",
    "triglycerides",
    "hdl_c",
    "ldl_c",
    "vit_d_25oh",
]

M02_CLASSES = ["Dominant_Follicle", "Normal", "PCO"]
M03_CLASSES = ["Chickenpox", "Cowpox", "HFMD", "Healthy", "Measles", "Monkeypox"]
M06_DEFAULT_CLASSES = ["chickenpox", "pediculosis"]

_MODEL_LOCK = threading.Lock()
_DEVICE: Any | None = None
_DEVICE_LABEL: str | None = None
_CACHE: dict[str, Any] = {}

if TORCH_AVAILABLE and transforms is not None:
    _EVAL_TRANSFORM = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
else:
    _EVAL_TRANSFORM = None


def get_compute_device() -> tuple[Any, str]:
    global _DEVICE, _DEVICE_LABEL
    if _DEVICE is not None and _DEVICE_LABEL is not None:
        return _DEVICE, _DEVICE_LABEL
    if not TORCH_AVAILABLE or torch is None:
        _DEVICE = "cpu"
        _DEVICE_LABEL = "cpu (PyTorch offline)"
        return _DEVICE, _DEVICE_LABEL
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        try:
            _ = torch.zeros(1, device="cuda")
            _DEVICE = torch.device("cuda")
            _DEVICE_LABEL = f"cuda ({gpu_name})"
            return _DEVICE, _DEVICE_LABEL
        except Exception:
            _DEVICE = torch.device("cpu")
            _DEVICE_LABEL = f"cpu ({gpu_name} sm kernel fallback)"
            return _DEVICE, _DEVICE_LABEL
    _DEVICE = torch.device("cpu")
    _DEVICE_LABEL = "cpu"
    return _DEVICE, _DEVICE_LABEL


def _assert_trusted_model_path(path: Path) -> Path:
    resolved = path.resolve()
    root_resolved = PROJECT_ROOT.resolve()
    if not str(resolved).startswith(str(root_resolved)) or not resolved.is_file():
        raise FileNotFoundError(f"Trusted checkpoint not found inside project root: {path}")
    return resolved


def _load_pcos_xgb():
    if "m01" not in _CACHE:
        path = _assert_trusted_model_path(PROJECT_ROOT / "01_PCOS_Clinical" / "models" / "model_best.joblib")
        _CACHE["m01"] = joblib.load(path)
    return _CACHE["m01"]


def _load_usg_resnet():
    if "m02" not in _CACHE:
        device, _ = get_compute_device()
        path = _assert_trusted_model_path(PROJECT_ROOT / "02_PCOS_Ultrasound" / "models" / "resnet18_best.pth")
        model = resnet18(weights=None)
        model.fc = nn.Linear(model.fc.in_features, len(M02_CLASSES))
        ck = torch.load(path, map_location="cpu", weights_only=True)
        sd = ck.get("model_state_dict", ck.get("state_dict", ck)) if isinstance(ck, dict) else ck
        model.load_state_dict(sd)
        model.eval().to(device)
        _CACHE["m02"] = model
    return _CACHE["m02"]


def _load_viral_rash_grouped():
    if "m03" not in _CACHE:
        device, _ = get_compute_device()
        # Strictly load leak-free 755-family grouped checkpoint (never contaminated resnet18_best.pth)
        path = _assert_trusted_model_path(PROJECT_ROOT / "03_Measles_Viral_Rash" / "models" / "resnet18_grouped_best.pth")
        model = resnet18(weights=None)
        model.fc = nn.Sequential(nn.Dropout(0.5), nn.Linear(model.fc.in_features, len(M03_CLASSES)))
        ck = torch.load(path, map_location="cpu", weights_only=True)
        sd = ck.get("model_state_dict", ck.get("state_dict", ck)) if isinstance(ck, dict) else ck
        model.load_state_dict(sd)
        model.eval().to(device)
        _CACHE["m03"] = model
    return _CACHE["m03"]


def _load_dermoped_exp_b():
    if "m06" not in _CACHE:
        device, _ = get_compute_device()
        path = _assert_trusted_model_path(PROJECT_ROOT / "06_DermoPed_Pediatric_Skin" / "proofs" / "EXP_B" / "model_best.pth")
        ck = torch.load(path, map_location="cpu", weights_only=True)
        classes = ck.get("class_names", M06_DEFAULT_CLASSES) if isinstance(ck, dict) else M06_DEFAULT_CLASSES
        model = resnet18(weights=None)
        model.fc = nn.Sequential(nn.Dropout(0.5), nn.Linear(model.fc.in_features, len(classes)))
        sd = ck.get("state_dict", ck.get("model_state_dict", ck)) if isinstance(ck, dict) else ck
        model.load_state_dict(sd)
        model.eval().to(device)
        _CACHE["m06"] = (model, list(classes))
    return _CACHE["m06"]


def _load_easyocr_reader(lang_mode: str = "en"):
    key = f"m04_reader_{lang_mode}"
    if key not in _CACHE:
        import easyocr

        device, _ = get_compute_device()
        use_gpu = device.type == "cuda"
        langs = ["en"] if lang_mode == "en" else ["bn", "en"]
        _CACHE[key] = easyocr.Reader(langs, gpu=use_gpu, verbose=False)
    return _CACHE[key]


def _decode_image_bytes(image_bytes: bytes, filename: str, module_key: str = "generic") -> tuple[Image.Image, str]:
    if not image_bytes:
        raise ValueError("Uploaded file is empty.")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise ValueError("Uploaded file exceeds 10 MB limit.")
    ext = Path(filename or "").suffix.lower()
    is_pdf = ext == ".pdf" or image_bytes[:4] == b"%PDF"

    # Strictly reject non-image formats for clinical vision models
    if module_key in ("pcos-ultrasound", "viral-rash", "dermoped"):
        if is_pdf:
            raise ValueError(
                "⚠️ ফাইল ফরম্যাট ত্রুটি: এই ক্লিনিক্যাল ভিশন মডিউলে শুধুমাত্র ছবি (JPG, JPEG, PNG, WEBP) গ্রহণযোগ্য; PDF বা ডকুমেন্ট ফাইল অনুমোদিত নয়। প্রেসক্রিপশন বা ডকুমেন্টের জন্য 'প্রেসক্রিপশন OCR' মডিউল ব্যবহার করুন।"
            )
        if ext and ext not in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
            raise ValueError(
                "⚠️ ফাইল ফরম্যাট ত্রুটি: শুধুমাত্র ইমেজ ফাইল (JPG, JPEG, PNG, WEBP) অনুমোদিত।"
            )

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise ValueError(f"Invalid or corrupted image file: {exc}") from exc

    sha = hashlib.sha256(image_bytes).hexdigest()

    # Content-level Medical Domain Guardrail
    if module_key == "pcos-ultrasound":
        # Ultrasound check: real pelvic USG is grayscale B-mode scan (monochrome acoustic shadow)
        thumb = img.resize((128, 128))
        arr = np.array(thumb, dtype=np.float32)
        diff_rg = np.abs(arr[:, :, 0] - arr[:, :, 1])
        diff_gb = np.abs(arr[:, :, 1] - arr[:, :, 2])
        diff_br = np.abs(arr[:, :, 2] - arr[:, :, 0])
        chroma_divergence = float(np.mean(diff_rg + diff_gb + diff_br))

        # Check for colorful natural scene, selfie, phone, outdoor car, etc.
        if chroma_divergence > 15.0:
            raise ValueError(
                "⚠️ অসংগতিপূর্ণ বা অ-চিকিৎসাগত ছবি সনাক্ত হয়েছে: এই ছবিটি পিসিওএস আল্ট্রাসাউন্ডের সাথে সঙ্গতিপূর্ণ নয় (সেলফি, মোবাইল ফোন বা সাধারণ রঙিন বস্তুর ছবি গ্রহণযোগ্য নয়)। অনুগ্রহ করে শুধুমাত্র সংশ্লিষ্ট ক্লিনিক্যাল পেলভিক আল্ট্রাসাউন্ড স্ক্যানের স্পষ্ট ছবি আপলোড করুন।"
            )

    elif module_key in ("viral-rash", "dermoped"):
        # Dermatological check: skin lesion photos must have human skin chrominance
        thumb = img.resize((128, 128))
        ycbcr = thumb.convert("YCbCr")
        yarr = np.array(ycbcr)
        cb, cr = yarr[:, :, 1], yarr[:, :, 2]
        skin_mask = (cb >= 77) & (cb <= 135) & (cr >= 125) & (cr <= 180)
        skin_ratio = float(np.mean(skin_mask))

        # Inanimate objects (smartphones, cars, furniture, abstract graphics, documents) have near zero skin tones
        if skin_ratio < 0.15:
            raise ValueError(
                "⚠️ অসংগতিপূর্ণ বা অ-চিকিৎসাগত ছবি সনাক্ত হয়েছে: এই ছবিটি চর্মরোগের সাথে সঙ্গতিপূর্ণ নয় (সেলফি, মোবাইল ফোন বা সাধারণ বস্তুর ছবি গ্রহণযোগ্য নয়)। অনুগ্রহ করে শুধুমাত্র সংশ্লিষ্ট আক্রান্ত ত্বকের স্পষ্ট ছবি আপলোড করুন।"
            )

    return img, sha


def infer_pcos_clinical(features: dict[str, Any]) -> dict[str, Any]:
    if not settings.ai_inference_enabled:
        return {
            "module_key": "pcos-clinical",
            "model_id": "M01-XGB-01",
            "model_name": "XGBoost Classifier (Shared Hosting Offline)",
            "classification": "RESEARCH_PREVIEW_NON_DIAGNOSTIC",
            "prediction": "OFFLINE_DEMO",
            "confidence": 0.0,
            "probabilities": [],
            "provided_features": [],
            "imputed_features": [],
            "latency_ms": 0.1,
            "device": "cpu",
            "status": "OFFLINE",
            "message": "AI inference offline on shared hosting mode",
            "mode": "cpanel_lightweight",
            "warning_bn": "হোস্টিং সার্ভারে এআই ইনফারেন্স অফলাইন রয়েছে।",
            "warning_en": "AI inference offline on shared hosting mode.",
            "doctor_review_recommended": True,
        }
    t0 = time.perf_counter()
    with _MODEL_LOCK:
        pipe = _load_pcos_xgb()

    row: dict[str, float] = {}
    provided_fields: list[str] = []
    imputed_fields: list[str] = []
    for col in M01_FEATURES:
        raw = features.get(col)
        if raw is None or (isinstance(raw, float) and math.isnan(raw)):
            row[col] = float("nan")
            imputed_fields.append(col)
        else:
            row[col] = float(raw)
            provided_fields.append(col)

    df = pd.DataFrame([row], columns=M01_FEATURES)
    probs = pipe.predict_proba(df)[0]
    p_control = float(probs[0])
    p_pcos = float(probs[1])
    pred_label = "PCOS_RESEARCH_PATTERN" if p_pcos >= 0.5 else "CONTROL_RESEARCH_PATTERN"
    top_conf = max(p_pcos, p_control)
    latency_ms = round((time.perf_counter() - t0) * 1000, 1)

    return {
        "module_key": "pcos-clinical",
        "model_id": "M01-XGB-01",
        "model_name": "XGBoost Classifier (Clinical Champion — model_best.joblib)",
        "classification": "RESEARCH_PREVIEW_NON_DIAGNOSTIC",
        "prediction": pred_label,
        "confidence": round(top_conf, 4),
        "probabilities": [
            {"label": "PCOS Clinical Cohort Pattern", "probability": round(p_pcos, 4)},
            {"label": "Control Cohort Pattern", "probability": round(p_control, 4)},
        ],
        "provided_features": provided_fields,
        "imputed_features": imputed_fields,
        "latency_ms": latency_ms,
        "device": "cpu (XGBoost Pipeline + SimpleImputer)",
        "warning_bn": "এটি কেবল N=88 গবেষণা মডেলের আউটপুট; কোনোভাবেই রোগ নির্ণয় বা চিকিৎসার বিকল্প নয়।",
        "warning_en": "NON-DIAGNOSTIC RESEARCH PREVIEW ONLY. Trained on small N=88 Mendeley tabular cohort (17/18 test, 88.57% CV bal acc); omitted features were median-imputed.",
        "doctor_review_recommended": True,
    }


def _run_torch_vision(model: nn.Module, classes: list[str], img: Image.Image) -> tuple[list[dict[str, Any]], float, str]:
    device, dev_label = get_compute_device()
    tensor = _EVAL_TRANSFORM(img).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()
    ranked = sorted(
        [{"label": classes[i], "probability": round(float(probs[i]), 4)} for i in range(len(classes))],
        key=lambda x: x["probability"],
        reverse=True,
    )
    return ranked, float(ranked[0]["probability"]), dev_label


def infer_pcos_ultrasound(image_bytes: bytes, filename: str) -> dict[str, Any]:
    if not settings.ai_inference_enabled or not TORCH_AVAILABLE:
        return {
            "module_key": "pcos-ultrasound",
            "model_id": "M02-RESNET-01",
            "model_name": "ResNet18 Ultrasound Morphology (Shared Hosting Offline)",
            "classification": "RESEARCH_PREVIEW_NON_DIAGNOSTIC",
            "prediction": "OFFLINE_DEMO",
            "confidence": 0.0,
            "probabilities": [],
            "image_width": 0,
            "image_height": 0,
            "file_sha256": "none",
            "latency_ms": 0.1,
            "device": "cpu",
            "status": "OFFLINE",
            "message": "AI inference offline on shared hosting mode",
            "mode": "cpanel_lightweight",
            "warning_bn": "হোস্টিং সার্ভারে এআই ইনফারেন্স অফলাইন রয়েছে।",
            "warning_en": "AI inference offline on shared hosting mode.",
            "doctor_review_recommended": True,
        }
    t0 = time.perf_counter()
    img, sha = _decode_image_bytes(image_bytes, filename, module_key="pcos-ultrasound")
    with _MODEL_LOCK:
        model = _load_usg_resnet()
        ranked, top_conf, dev_label = _run_torch_vision(model, M02_CLASSES, img)
    latency_ms = round((time.perf_counter() - t0) * 1000, 1)
    return {
        "module_key": "pcos-ultrasound",
        "model_id": "M02-RESNET-01",
        "model_name": "ResNet18 Ultrasound Morphology (resnet18_best.pth)",
        "classification": "RESEARCH_PREVIEW_NON_DIAGNOSTIC",
        "prediction": ranked[0]["label"],
        "confidence": round(top_conf, 4),
        "probabilities": ranked,
        "image_width": img.size[0],
        "image_height": img.size[1],
        "file_sha256": sha[:16],
        "latency_ms": latency_ms,
        "device": dev_label,
        "warning_bn": "PCOM আল্ট্রাসাউন্ড মরফোলজি একাই PCOS রোগ নির্ণয় প্রমাণ করে না; চিকিৎসকের মূল্যায়ন অপরিহার্য।",
        "warning_en": "NON-DIAGNOSTIC PCOM MORPHOLOGY PREVIEW ONLY (FR-PCOS-06). Ultrasound PCOM morphology alone does NOT establish clinical PCOS diagnosis (N=299 dataset, pseudo-patient caveats).",
        "doctor_review_recommended": True,
    }


def infer_viral_rash(image_bytes: bytes, filename: str) -> dict[str, Any]:
    if not settings.ai_inference_enabled or not TORCH_AVAILABLE:
        return {
            "module_key": "viral-rash",
            "model_id": "M03-RESNET-GROUPED-01",
            "model_name": "ResNet18 Grouped Model (Shared Hosting Offline)",
            "classification": "RESEARCH_PREVIEW_NON_DIAGNOSTIC",
            "prediction": "OFFLINE_DEMO",
            "confidence": 0.0,
            "probabilities": [],
            "image_width": 0,
            "image_height": 0,
            "file_sha256": "none",
            "latency_ms": 0.1,
            "device": "cpu",
            "status": "OFFLINE",
            "message": "AI inference offline on shared hosting mode",
            "mode": "cpanel_lightweight",
            "warning_bn": "হোস্টিং সার্ভারে এআই ইনফারেন্স অফলাইন রয়েছে।",
            "warning_en": "AI inference offline on shared hosting mode.",
            "doctor_review_recommended": True,
        }
    t0 = time.perf_counter()
    img, sha = _decode_image_bytes(image_bytes, filename, module_key="viral-rash")
    with _MODEL_LOCK:
        model = _load_viral_rash_grouped()
        ranked, top_conf, dev_label = _run_torch_vision(model, M03_CLASSES, img)
    latency_ms = round((time.perf_counter() - t0) * 1000, 1)
    return {
        "module_key": "viral-rash",
        "model_id": "M03-RESNET-GROUPED-01",
        "model_name": "ResNet18 Grouped 755-Family Model (resnet18_grouped_best.pth)",
        "classification": "RESEARCH_PREVIEW_NON_DIAGNOSTIC",
        "prediction": ranked[0]["label"],
        "confidence": round(top_conf, 4),
        "probabilities": ranked,
        "image_width": img.size[0],
        "image_height": img.size[1],
        "file_sha256": sha[:16],
        "latency_ms": latency_ms,
        "device": dev_label,
        "warning_bn": "গবেষণা-সতর্কতা: MCVSLD ডেটাসেট বাংলাদেশের ক্লিনিকাল জনসংখ্যার প্রতিনিধিত্ব করে না। নিশ্চিত রোগ নির্ণয় নয়; জ্বর/র‍্যাশে ডাক্তার দেখান।",
        "warning_en": "NON-DIAGNOSTIC RESEARCH PREVIEW ONLY (FR-VIR-03). Uses clean grouped 755-family checkpoint (84.65% val acc); non-Bangladesh dataset generalization is unvalidated. Never use to delay pediatric or infectious triage.",
        "doctor_review_recommended": True,
    }


def infer_dermoped(image_bytes: bytes, filename: str) -> dict[str, Any]:
    if not settings.ai_inference_enabled or not TORCH_AVAILABLE:
        return {
            "module_key": "dermoped",
            "model_id": "M06-EXP-B-01",
            "model_name": "ResNet18 DermoPed EXP_B Controlled (Shared Hosting Offline)",
            "classification": "RESEARCH_PREVIEW_NON_DIAGNOSTIC",
            "prediction": "OFFLINE_DEMO",
            "confidence": 0.0,
            "probabilities": [],
            "image_width": 0,
            "image_height": 0,
            "file_sha256": "none",
            "latency_ms": 0.1,
            "device": "cpu",
            "status": "OFFLINE",
            "message": "AI inference offline on shared hosting mode",
            "mode": "cpanel_lightweight",
            "warning_bn": "হোস্টিং সার্ভারে এআই ইনফারেন্স অফলাইন রয়েছে।",
            "warning_en": "AI inference offline on shared hosting mode.",
            "doctor_review_recommended": True,
        }
    t0 = time.perf_counter()
    img, sha = _decode_image_bytes(image_bytes, filename, module_key="dermoped")
    with _MODEL_LOCK:
        model, classes = _load_dermoped_exp_b()
        ranked, top_conf, dev_label = _run_torch_vision(model, classes, img)
    latency_ms = round((time.perf_counter() - t0) * 1000, 1)
    return {
        "module_key": "dermoped",
        "model_id": "M06-EXP-B-01",
        "model_name": "ResNet18 DermoPed EXP_B Controlled (model_best.pth)",
        "classification": "RESEARCH_PREVIEW_NON_DIAGNOSTIC",
        "prediction": ranked[0]["label"],
        "confidence": round(top_conf, 4),
        "probabilities": ranked,
        "image_width": img.size[0],
        "image_height": img.size[1],
        "file_sha256": sha[:16],
        "latency_ms": latency_ms,
        "device": dev_label,
        "warning_bn": "গুরুতর সীমাবদ্ধতা: স্থানীয় DermoPed সাবসেট মাত্র ২২ জন রোগী (১৯ চিকেনপক্স, ৩ পেডিকুলোসিস)। কেবল গবেষণা প্রদর্শনের জন্য — কখনোই চিকিৎসা সিদ্ধান্তে ব্যবহার করবেন না।",
        "warning_en": "SEVERE DATASET LIMITATION — RESEARCH PREVIEW ONLY. Local checkpoint evaluates only 2 classes across N=22 patients (19 Chickenpox, 3 Pediculosis). Human pediatric clinician review is mandatory.",
        "doctor_review_recommended": True,
    }


_MED_PREFIX_RE = re.compile(
    r"^(?:\d+[\)\.\-]\s*)?(?:rx\.?|tab\.?|tablet|cap\.?|capsule|syp\.?|syrup|susp\.?|inj\.?|ointment|oint\.?|drop|drops|ট্যাবলেট|ট্যাব|টযাব|ক্যাপসুল|ক্যাপ|কযাপ|সিরাপ|ইনজেকশন)[\s:\.\-_]*",
    re.IGNORECASE,
)
_NUM_PREFIX_RE = re.compile(r"^\d+[\)\.\-]\s*")
_KNOWN_BRANDS_RE = re.compile(
    r"\b(?:abciximab|vomilast|zoclar|gestakind|roxim|maxpro|rolac|tnabil|trilock|afrin|beuflox|paracetamol|napa|ace|sergel|pantobex|monas|fexo|azithromycin|cefixime|amoxicillin|metformin|rosuvastatin|eslor|omidon|emistat)\b",
    re.IGNORECASE,
)
_FREQ_RE = re.compile(
    r"(\b[0-4০-৪]\s*[\+\-\*]\s*[0-4০-৪]\s*[\+\-\*]\s*[0-4০-৪]\b|\b(?:od|bd|bid|tds|tid|qds|qid|sos|prn|hs|stat)\b|\b(?:\d+\s+)?(?:morning|night|afternoon|evening|noon)\b|\b(?:after\s+food|before\s+food|with\s+meal|after\s+meal|before\s+meal)\b|once\s+daily|twice\s+daily|three\s+times\s+daily|দিনে\s+[১-৪একদুইতিন]+\s+বার|সকালে|রাতে|খাওয়ার\s+পর|খাবার\s+পর|খাওয়ার\s+আগে|খাবার\s+আগে|প্রতিদিন\s+রাতে)",
    re.IGNORECASE,
)
_DUR_RE = re.compile(
    r"(\b\d+\s*(?:days?|weeks?|months?|yr|d|w|m)\b|\b[০-৯]+\s*(?:দিন|সপ্তাহ|মাস|বছর)\b|\bচলবে\b|tot\s*:\s*\d+\s*(?:tab|cap)?|\(?tot:[^\)]+\)?)",
    re.IGNORECASE,
)
_STRENGTH_RE = re.compile(
    r"(\b\d+(?:\.\d+)?[oO0]*(?:\+\d+(?:\.\d+)?[oO0]*)?|[০-৯]+(?:\.[০-৯]+)?)\s*(mg|ml|gm|g|mcg|iu|%|মি\.গ্রা|মিলিগ্রাম|মি\.লি)\b",
    re.IGNORECASE,
)
_HEADER_RE = re.compile(
    r"\b(?:medicine|composition|dosage|timing|duration|quantity|hospital|ticket|বহির্বিভাগীয়|ফরম|তারিখ|চিকিৎসা)\b",
    re.IGNORECASE,
)


def _cluster_boxes_into_lines(boxes: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    """Group 2D bounding boxes into natural horizontal lines based on vertical overlap."""
    if not boxes:
        return []
    sorted_boxes = sorted(boxes, key=lambda b: (b.get("y_center", b.get("y_pct", 0)), b.get("x_min", b.get("x_pct", 0))))
    lines: list[list[dict[str, Any]]] = []
    for b in sorted_boxes:
        if not lines:
            lines.append([b])
            continue
        prev = lines[-1]
        avg_y = sum(x.get("y_center", x.get("y_pct", 0)) for x in prev) / len(prev)
        avg_h = sum(x.get("height", x.get("h_pct", 10)) for x in prev) / len(prev)
        # 70% height vertical tolerance for same-line clustering
        thresh = max(18.0 if "y_center" in b else 2.2, avg_h * 0.72)
        cur_y = b.get("y_center", b.get("y_pct", 0))
        if abs(cur_y - avg_y) <= thresh:
            prev.append(b)
        else:
            lines.append([b])

    for l in lines:
        l.sort(key=lambda b: b.get("x_min", b.get("x_pct", 0)))
    return lines


def _extract_candidates_from_clustered_lines(
    lines: list[list[dict[str, Any]]],
    mean_conf: float,
) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []

    for line in lines:
        line_text = " ".join(b["text"] for b in line).strip()
        if not line_text:
            continue
        if _HEADER_RE.search(line_text) and not _MED_PREFIX_RE.search(line_text) and not _KNOWN_BRANDS_RE.search(line_text):
            continue

        first_text = line[0]["text"]
        has_med = bool(_MED_PREFIX_RE.search(first_text) or (len(line) > 1 and _MED_PREFIX_RE.search(first_text + " " + line[1]["text"])))
        has_num = bool(_NUM_PREFIX_RE.search(first_text))
        has_brand = bool(_KNOWN_BRANDS_RE.search(line_text))
        has_freq = any(_FREQ_RE.search(b["text"]) for b in line)
        has_dur = any(_DUR_RE.search(b["text"]) or "days" in b["text"].lower() or "tot" in b["text"].lower() for b in line)

        is_primary_med_row = has_med or (has_num and (has_freq or has_dur or has_brand)) or (has_freq and has_dur)

        if is_primary_med_row:
            med_tokens: list[str] = []
            freq_tokens: list[str] = []
            dur_tokens: list[str] = []

            for idx_b, b in enumerate(line):
                t = b["text"]
                is_dur_token = bool(_DUR_RE.search(t) or "days" in t.lower() or "tot" in t.lower())
                is_lone_num_for_dur = t.isdigit() and (
                    idx_b + 1 < len(line) and ("day" in line[idx_b + 1]["text"].lower() or "tot" in line[idx_b + 1]["text"].lower())
                )

                if is_dur_token or is_lone_num_for_dur:
                    dur_tokens.append(t)
                elif _FREQ_RE.search(t):
                    freq_tokens.append(t)
                else:
                    med_tokens.append(t)

            name = " ".join(med_tokens).strip() or line_text
            # Clean and normalize common OCR formulation prefixes
            name = re.sub(r"\bTAB_\b", "TAB.", name)
            name = re.sub(r"\bTAB\b(?!\.)", "TAB.", name, flags=re.IGNORECASE)
            name = re.sub(r"\bCAP\b(?!\.)", "CAP.", name, flags=re.IGNORECASE)
            name = re.sub(r"\b1O/SR\b", "10/SR", name, flags=re.IGNORECASE)

            dur = " ".join(dur_tokens).strip() if dur_tokens else "NEEDS_VERIFICATION"
            freq = " ".join(freq_tokens).strip() if freq_tokens else "NEEDS_VERIFICATION"

            m_str = _STRENGTH_RE.search(name)
            strength = f"{m_str.group(1)} {m_str.group(2)}" if m_str else "NEEDS_VERIFICATION"

            row_conf = round(float(sum(b.get("confidence", mean_conf) for b in line) / max(1, len(line))), 4)

            candidates.append(
                {
                    "group_index": len(candidates),
                    "medicine_name": name[:90],
                    "strength": strength,
                    "frequency": freq,
                    "duration": dur,
                    "confidence": row_conf,
                    "is_verified": False,
                    "needs_verification": True,
                }
            )
        elif candidates:
            # Secondary generic composition or continued dose subline for preceding medicine
            m_str = _STRENGTH_RE.findall(line_text)
            has_subline_chem = m_str or any(
                kw in line_text.lower()
                for kw in ["acid", "ip", "bp", "usp", "mg", "ml", "doxylamine", "pyridoxine", "clarithromycin", "isoxsuprine"]
            )
            if has_subline_chem and candidates[-1]["strength"] == "NEEDS_VERIFICATION":
                candidates[-1]["strength"] = line_text[:90]

            m_sub_freq = _FREQ_RE.search(line_text)
            if m_sub_freq and candidates[-1]["frequency"] == "NEEDS_VERIFICATION":
                candidates[-1]["frequency"] = m_sub_freq.group(0).strip()

            m_sub_dur = _DUR_RE.search(line_text)
            if m_sub_dur and candidates[-1]["duration"] == "NEEDS_VERIFICATION":
                candidates[-1]["duration"] = m_sub_dur.group(0).strip()

    # Safe fallback if prescription had unstructured text
    if not candidates and lines:
        for i, ln_boxes in enumerate(lines[:4]):
            full_ln = " ".join(b["text"] for b in ln_boxes).strip()
            if not full_ln or _HEADER_RE.search(full_ln):
                continue
            m_str = _STRENGTH_RE.search(full_ln)
            m_freq = _FREQ_RE.search(full_ln)
            m_dur = _DUR_RE.search(full_ln)
            c_val = round(float(sum(b.get("confidence", mean_conf) for b in ln_boxes) / max(1, len(ln_boxes))), 4)
            candidates.append(
                {
                    "group_index": len(candidates),
                    "medicine_name": full_ln[:90],
                    "strength": f"{m_str.group(1)} {m_str.group(2)}" if m_str else "NEEDS_VERIFICATION",
                    "frequency": m_freq.group(0).strip() if m_freq else "NEEDS_VERIFICATION",
                    "duration": m_dur.group(0).strip() if m_dur else "NEEDS_VERIFICATION",
                    "confidence": c_val,
                    "is_verified": False,
                    "needs_verification": True,
                }
            )

    return candidates


def infer_prescription_ocr(file_bytes: bytes, filename: str) -> dict[str, Any]:
    t0 = time.perf_counter()
    if not file_bytes:
        raise ValueError("Uploaded file is empty.")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise ValueError("Uploaded file exceeds 10 MB limit.")

    sha = hashlib.sha256(file_bytes).hexdigest()
    ext = Path(filename or "").suffix.lower()
    is_pdf = ext == ".pdf" or file_bytes[:4] == b"%PDF"

    bounding_boxes: list[dict[str, Any]] = []
    clustered_box_lines: list[list[dict[str, Any]]] = []
    raw_lines: list[str] = []
    line_confs: list[float] = []
    img_w, img_h = 0, 0
    _, dev_label = get_compute_device()

    if is_pdf:
        reader = PdfReader(io.BytesIO(file_bytes))
        for p_idx, page in enumerate(reader.pages[:5]):
            txt = (page.extract_text() or "").strip()
            for line in txt.splitlines():
                clean = line.strip()
                if clean:
                    raw_lines.append(clean)
                    line_confs.append(0.75)
                    clustered_box_lines.append([{"text": clean, "confidence": 0.75, "x_pct": 5.0, "y_pct": 10.0, "w_pct": 80.0, "h_pct": 5.0}])
        if not raw_lines:
            raw_lines = ["Scanned/image-only PDF detected — please upload a crisp JPG/PNG page photo for visual bounding-box OCR."]
            line_confs = [0.0]
        mean_conf = round(float(sum(line_confs) / max(1, len(line_confs))), 4)
        engine_label = f"pypdf PdfReader ({len(reader.pages)} page(s))"
    else:
        img, _ = _decode_image_bytes(file_bytes, filename)
        img_w, img_h = img.size
        arr = np.array(img)
        with _MODEL_LOCK:
            # Intelligent dual-reader strategy: run English pass first
            reader_en = _load_easyocr_reader("en")
            results_en = reader_en.readtext(arr)
            en_conf = sum(c for _, _, c in results_en) / max(1, len(results_en))
            has_bn_chars = any(any("\u0980" <= ch <= "\u09FF" for ch in t) for _, t, _ in results_en)

            if en_conf >= 0.65 and not has_bn_chars:
                results = results_en
                engine_label = "EasyOCR Latin ResNet-CTC (High Precision)"
            else:
                reader_bn = _load_easyocr_reader("bn")
                results_bn = reader_bn.readtext(arr)
                bn_conf = sum(c for _, _, c in results_bn) / max(1, len(results_bn))
                if bn_conf > en_conf or has_bn_chars:
                    results = results_bn
                    engine_label = "EasyOCR Bilingual CRAFT + ResNet-CTC (bn+en)"
                else:
                    results = results_en
                    engine_label = "EasyOCR Latin ResNet-CTC (Ensembled)"

        raw_box_list: list[dict[str, Any]] = []
        for pts, text, conf in results:
            clean = str(text).strip()
            if not clean:
                continue
            xs = [float(p[0]) for p in pts]
            ys = [float(p[1]) for p in pts]
            x_pct = max(0.0, min(98.0, (min(xs) / max(1, img_w)) * 100.0))
            y_pct = max(0.0, min(98.0, (min(ys) / max(1, img_h)) * 100.0))
            w_pct = max(1.0, min(100.0 - x_pct, ((max(xs) - min(xs)) / max(1, img_w)) * 100.0))
            h_pct = max(1.0, min(100.0 - y_pct, ((max(ys) - min(ys)) / max(1, img_h)) * 100.0))
            c_val = round(float(conf), 4)

            box_obj = {
                "text": clean,
                "confidence": c_val,
                "x_pct": round(x_pct, 2),
                "y_pct": round(y_pct, 2),
                "w_pct": round(w_pct, 2),
                "h_pct": round(h_pct, 2),
                "x_min": min(xs),
                "x_max": max(xs),
                "y_min": min(ys),
                "y_max": max(ys),
                "y_center": (min(ys) + max(ys)) / 2.0,
                "height": max(ys) - min(ys),
            }
            raw_box_list.append(box_obj)
            bounding_boxes.append(box_obj)
            line_confs.append(c_val)

        mean_conf = round(float(sum(line_confs) / len(line_confs)), 4) if line_confs else 0.0
        clustered_box_lines = _cluster_boxes_into_lines(raw_box_list)
        for cl in clustered_box_lines:
            raw_lines.append(" ".join(b["text"] for b in cl).strip())

    candidates = _extract_candidates_from_clustered_lines(clustered_box_lines, mean_conf)
    latency_ms = round((time.perf_counter() - t0) * 1000, 1)

    return {
        "module_key": "prescription-ocr",
        "model_id": "M04-EASYOCR-PIPELINE-01",
        "model_name": engine_label,
        "classification": "NEEDS_HUMAN_VERIFICATION",
        "is_pdf": is_pdf,
        "mean_confidence": mean_conf,
        "confidence": mean_conf,
        "token_count": len(bounding_boxes) if not is_pdf else len(raw_lines),
        "raw_text": "\n".join(raw_lines),
        "raw_lines": raw_lines,
        "bounding_boxes": bounding_boxes,
        "candidates": candidates,
        "reminder_auto_enabled": False,
        "verification_required": True,
        "image_width": img_w,
        "image_height": img_h,
        "file_sha256": sha[:16],
        "latency_ms": latency_ms,
        "device": dev_label,
        "warning_bn": "সতর্কতা (FR-OCR-03): হাতের লেখার ভুল ডোজ এড়াতে ব্যবহারকারী/চিকিৎসকের যাচাই ছাড়া রিমাইন্ডার চালু করা সম্পূর্ণ ব্লকড (HTTP 422 Gate)।",
        "warning_en": "SAFETY GATE ACTIVE (FR-OCR-03..05): Extracted medicine fields are provisional drafts only. Medication reminders remain locked (HTTP 422) until a human explicitly verifies every critical field.",
        "doctor_review_recommended": True,
    }


def get_curated_sample_image(module_key: str) -> tuple[bytes, str, str]:
    key = module_key.strip().lower()
    if key == "pcos-ultrasound":
        search_roots = [
            PROJECT_ROOT / "02_PCOS_Ultrasound" / "data" / "raw" / "extracted",
        ]
        preferred_names = ["PCO", "Dominant_Follicle", "Normal"]
    elif key == "viral-rash":
        search_roots = [
            PROJECT_ROOT / "03_Measles_Viral_Rash" / "data" / "raw" / "extracted",
        ]
        preferred_names = ["Measles", "Chickenpox", "HFMD"]
    elif key == "prescription-ocr":
        tbl = PROJECT_ROOT / "services" / "api" / "data" / "sample_realistic_rx.png"
        if tbl.exists():
            return tbl.read_bytes(), "sample_prescription_table.png", "image/png"
        p52 = PROJECT_ROOT / "04_Prescription_OCR" / "data" / "raw" / "extracted" / "images" / "Prescription_ images.jpg" / "0052.jpg"
        if p52.exists():
            return p52.read_bytes(), "sample_prescription_0052.jpg", "image/jpeg"
        search_roots = [PROJECT_ROOT / "04_Prescription_OCR" / "data"]
        preferred_names = []
    elif key == "dermoped":
        search_roots = [
            PROJECT_ROOT / "06_DermoPed_Pediatric_Skin" / "data" / "processed",
        ]
        preferred_names = []
    else:
        raise ValueError(f"No sample image available for module '{module_key}'.")

    for root in search_roots:
        if not root.exists():
            continue
        for pref in preferred_names + [""]:
            sub = root / pref if pref else root
            if not sub.exists():
                continue
            for p in sorted(sub.rglob("*")):
                if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"} and "_mask" not in p.name.lower():
                    mime = "image/png" if p.suffix.lower() == ".png" else "image/jpeg"
                    return p.read_bytes(), f"sample_{key}_{p.name}", mime

    raise FileNotFoundError(f"Curated local sample file not found for module '{module_key}'.")
