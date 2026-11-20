import json
import math
import os
import subprocess
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(line_buffering=True)

OUT_ROOT = os.path.join("docs", "SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01")
BUILD_DIR = os.path.join(OUT_ROOT, "_build")
CLIPS_DIR = os.path.join(BUILD_DIR, "clips")
BROLL_DIR = os.path.join(BUILD_DIR, "broll")
VIDEO_DIR = os.path.join(OUT_ROOT, "video")
FINAL_QC_DIR = os.path.join(BUILD_DIR, "final_qc")
MANIFEST_PATH = os.path.join(BUILD_DIR, "timeline_manifest.json")
FFMPEG = r"C:\Users\ASHIK_CSE\AppData\Local\Programs\Python\Python311\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"

os.makedirs(VIDEO_DIR, exist_ok=True)
os.makedirs(FINAL_QC_DIR, exist_ok=True)

W, H = 1920, 1080
FPS = 30
XFADE_HALF = 6          # 0.40s smooth transition between major chapters
SUB_XFADE_HALF = 4      # 0.27s clean transition between B-roll <-> app cutaways

FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_SEMI = "C:/Windows/Fonts/seguisb.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_MONO = "C:/Windows/Fonts/consolab.ttf"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


F_ACT = load_font(FONT_BOLD, 16)
F_HEADLINE = load_font(FONT_SEMI, 22)
F_TIME = load_font(FONT_MONO, 18)
F_CARD_TITLE = load_font(FONT_BOLD, 17)
F_CARD_BODY = load_font(FONT_SEMI, 21)
F_SUB = load_font(FONT_BOLD, 33)

F_END_TITLE = load_font(FONT_BOLD, 68)
F_END_SUB = load_font(FONT_SEMI, 27)
F_END_HDR = load_font(FONT_BOLD, 18)
F_END_URL = load_font(FONT_MONO, 21)
F_END_TEAM = load_font(FONT_SEMI, 22)
F_END_ROLE = load_font(FONT_REG, 18)
F_END_FOOT = load_font(FONT_REG, 16)


class VideoReader:
    """Random/sequential frame reader with sequential optimization and clean wraparound."""
    def __init__(self, path: str):
        if not os.path.exists(path):
            raise FileNotFoundError(f"Missing video asset: {path}")
        self.path = path
        self.cap = cv2.VideoCapture(path)
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        self.total_frames = max(1, int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT)))
        self.duration = self.total_frames / self.fps
        self.last_idx = -2
        self.last_frame = np.zeros((H, W, 3), dtype=np.uint8)

    def get_frame_at_time(self, t_sec: float) -> np.ndarray:
        if self.total_frames <= 1:
            idx = 0
        else:
            # Clamp cleanly or loop smoothly near tail
            t_clamped = max(0.0, t_sec)
            idx = int(round(t_clamped * self.fps))
            if idx >= self.total_frames:
                idx = min(self.total_frames - 1, self.total_frames - 1 - (idx % max(1, self.total_frames // 3)))

        if idx == self.last_idx:
            return self.last_frame

        if idx == self.last_idx + 1:
            ok, fr = self.cap.read()
        else:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ok, fr = self.cap.read()

        if ok and fr is not None:
            if fr.shape[1] != W or fr.shape[0] != H:
                fr = cv2.resize(fr, (W, H), interpolation=cv2.INTER_LANCZOS4)
            self.last_idx = idx
            self.last_frame = fr
        return self.last_frame

    def close(self):
        self.cap.release()


def apply_camera_zoom(frame: np.ndarray, zoom_factor: float, cx_norm: float = 0.5, cy_norm: float = 0.5) -> np.ndarray:
    if zoom_factor <= 1.001:
        return frame
    cw = max(2, int(round(W / zoom_factor)))
    ch = max(2, int(round(H / zoom_factor)))
    cx = int(round(cx_norm * W))
    cy = int(round(cy_norm * H))
    x0 = max(0, min(W - cw, cx - cw // 2))
    y0 = max(0, min(H - ch, cy - ch // 2))
    crop = frame[y0:y0 + ch, x0:x0 + cw]
    return cv2.resize(crop, (W, H), interpolation=cv2.INTER_LINEAR)


def grade_clinical_broll(frame: np.ndarray, mode: str) -> np.ndarray:
    """Applies cohesive dark obsidian/cinematic LUT & radial vignette to YouTube clinical B-roll."""
    f = frame.astype(np.float32)
    if mode == "crisis":
        # Desaturated cool dark clinical grade with deep shadows
        gray = 0.114 * f[:, :, 0] + 0.587 * f[:, :, 1] + 0.299 * f[:, :, 2]
        gray3 = np.stack([gray, gray, gray], axis=-1)
        f = 0.65 * f + 0.35 * gray3
        f[:, :, 0] *= 1.03   # slight cold blue shadows
        f[:, :, 1] *= 0.90
        f[:, :, 2] *= 0.94
        f *= 0.86
    else:
        # Clean cool medical contrast boost matching ShasthoSetu dark navy aesthetic
        f[:, :, 0] *= 1.04
        f[:, :, 1] *= 0.96
        f[:, :, 2] *= 0.90
        f *= 0.90
    return np.clip(f * _VIGNETTE_3CH, 0, 255).astype(np.uint8)


def _build_vignette() -> np.ndarray:
    yy, xx = np.mgrid[0:H, 0:W]
    nx = (xx - W * 0.5) / (W * 0.5)
    ny = (yy - H * 0.5) / (H * 0.5)
    r2 = nx * nx + ny * ny
    v = np.clip(1.06 - 0.30 * r2, 0.55, 1.0).astype(np.float32)
    return v[:, :, None]


_VIGNETTE_3CH = _build_vignette()


def alpha_composite_bgr(base_bgr: np.ndarray, overlay_rgba: np.ndarray, opacity: float = 1.0) -> np.ndarray:
    if opacity <= 0.004:
        return base_bgr
    alpha = (overlay_rgba[:, :, 3].astype(np.float32) / 255.0) * opacity
    mask = alpha > 0.002
    if not np.any(mask):
        return base_bgr
    ys, xs = np.where(mask)
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1

    out = base_bgr.copy()
    sub_base = out[y0:y1, x0:x1].astype(np.float32)
    sub_ov = overlay_rgba[y0:y1, x0:x1, :3][:, :, ::-1].astype(np.float32)  # RGB -> BGR
    a = alpha[y0:y1, x0:x1, None]
    out[y0:y1, x0:x1] = np.clip(sub_base * (1.0 - a) + sub_ov * a, 0, 255).astype(np.uint8)
    return out


def alpha_composite_box_bgr(base_bgr: np.ndarray, box_rgba: np.ndarray, bx: int, by: int, opacity: float = 1.0) -> np.ndarray:
    if opacity <= 0.004:
        return base_bgr
    bh, bw = box_rgba.shape[:2]
    x0 = max(0, bx)
    y0 = max(0, by)
    x1 = min(W, bx + bw)
    y1 = min(H, by + bh)
    if x1 <= x0 or y1 <= y0:
        return base_bgr
    sx0, sy0 = x0 - bx, y0 - by
    sx1, sy1 = sx0 + (x1 - x0), sy0 + (y1 - y0)

    out = base_bgr.copy()
    sub_base = out[y0:y1, x0:x1].astype(np.float32)
    sub_ov = box_rgba[sy0:sy1, sx0:sx1, :3][:, :, ::-1].astype(np.float32)
    a = (box_rgba[sy0:sy1, sx0:sx1, 3:4].astype(np.float32) / 255.0) * opacity
    out[y0:y1, x0:x1] = np.clip(sub_base * (1.0 - a) + sub_ov * a, 0, 255).astype(np.uint8)
    return out


# ---------------------------------------------------------------------------
# UI OVERLAY RENDERERS (Cached where possible for fast 5,400-frame rendering)
# ---------------------------------------------------------------------------
_SUB_CACHE = {}


def get_subtitle_box(text: str) -> tuple[np.ndarray, int, int] | None:
    if not text or not text.strip():
        return None
    if text in _SUB_CACHE:
        return _SUB_CACHE[text]

    lines = text.split("\n")[:2]
    dummy = Image.new("RGBA", (10, 10))
    d0 = ImageDraw.Draw(dummy)
    widths = []
    line_h = 40
    for ln in lines:
        bb = d0.textbbox((0, 0), ln, font=F_SUB)
        widths.append(bb[2] - bb[0])
    pad_x, pad_y = 32, 14
    box_w = min(W - 140, max(280, max(widths) + pad_x * 2))
    box_h = len(lines) * line_h + pad_y * 2

    img = Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        [(0, 0), (box_w - 1, box_h - 1)],
        radius=16,
        fill=(6, 11, 22, 224),
        outline=(56, 189, 248, 125),
        width=2,
    )
    for i, ln in enumerate(lines):
        bb = draw.textbbox((0, 0), ln, font=F_SUB)
        tw = bb[2] - bb[0]
        tx = (box_w - tw) // 2
        ty = pad_y + i * line_h - 2
        # Soft drop shadow + crisp white caption text
        draw.text((tx + 2, ty + 2), ln, fill=(0, 0, 0, 200), font=F_SUB)
        draw.text((tx, ty), ln, fill=(248, 250, 252, 255), font=F_SUB)

    arr = np.array(img)
    bx = (W - box_w) // 2
    by = H - box_h - 32
    _SUB_CACHE[text] = (arr, bx, by)
    return _SUB_CACHE[text]


_HUD_BASE_CACHE = {}


def fit_font(draw: ImageDraw.ImageDraw, font_path: str, text: str, max_px: int, start_sz: int, min_sz: int = 12):
    for sz in range(start_sz, min_sz - 1, -1):
        f = load_font(font_path, sz)
        bb = draw.textbbox((0, 0), text, font=f)
        if (bb[2] - bb[0]) <= max_px:
            return f
    return load_font(font_path, min_sz)


def render_top_hud_rgba(
    act: str,
    headline: str,
    accent_rgb: tuple[int, int, int],
    t_global: float,
    total_dur: float,
    seg_progress: float,
) -> np.ndarray:
    """Compact glassmorphic top-left telemetry bar (corner clock pill removed cleanly per user request)."""
    key = (act, headline, accent_rgb)
    if key not in _HUD_BASE_CACHE:
        bar = Image.new("RGBA", (W, 84), (0, 0, 0, 0))
        d = ImageDraw.Draw(bar)
        bb_act = d.textbbox((0, 0), act, font=F_ACT)
        act_w = (bb_act[2] - bb_act[0]) + 26
        max_hl_w = (W - 120) - (44 + 8 + act_w + 18 + 28)
        hl_font = fit_font(d, FONT_SEMI, headline, max_hl_w, 22, 15)
        bb_hl = d.textbbox((0, 0), headline, font=hl_font)
        left_w = min(W - 88, max(520, 8 + act_w + 18 + (bb_hl[2] - bb_hl[0]) + 28))
        x0, y0, x1, y1 = 44, 18, 44 + left_w, 72
        d.rounded_rectangle(
            [(x0, y0), (x1, y1)],
            radius=14,
            fill=(7, 13, 25, 212),
            outline=(accent_rgb[0], accent_rgb[1], accent_rgb[2], 145),
            width=2,
        )
        # Left colored accent pill
        d.rounded_rectangle([(x0 + 8, y0 + 8), (x0 + 8 + act_w, y1 - 8)], radius=10, fill=(*accent_rgb, 240))
        d.text((x0 + 21, y0 + 18), act, fill=(6, 10, 18, 255), font=F_ACT)
        # Headline (vertically centered)
        hl_h = bb_hl[3] - bb_hl[1]
        d.text((x0 + 8 + act_w + 18, y0 + (54 - hl_h) // 2 - 2), headline, fill=(241, 245, 249, 255), font=hl_font)
        _HUD_BASE_CACHE[key] = (np.array(bar), x0, y0, x1, y1)

    base_arr, x0, y0, x1, y1 = _HUD_BASE_CACHE[key]
    img = Image.fromarray(base_arr.copy(), mode="RGBA")
    d = ImageDraw.Draw(img)

    # Thin bottom scene progress line along left pill
    px0, py0 = x0 + 14, y1 - 5
    px1 = x1 - 14
    pw = max(1, int((px1 - px0) * max(0.0, min(1.0, seg_progress))))
    d.rectangle([(px0, py0), (px1, py0 + 2)], fill=(51, 65, 85, 160))
    d.rectangle([(px0, py0), (px0 + pw, py0 + 2)], fill=(*accent_rgb, 240))
    return np.array(img)


_CARD_CACHE = {}


def get_evidence_card_box(title: str, detail: str, accent_rgb: tuple[int, int, int]) -> np.ndarray:
    key = (title, detail, accent_rgb)
    if key in _CARD_CACHE:
        return _CARD_CACHE[key]
    dummy = Image.new("RGBA", (10, 10))
    d0 = ImageDraw.Draw(dummy)
    max_body_w = 1040 - 60
    t_font = fit_font(d0, FONT_BOLD, title, max_body_w, 17, 13)
    b_font = fit_font(d0, FONT_SEMI, detail, max_body_w, 21, 14)
    w1 = d0.textbbox((0, 0), title, font=t_font)[2]
    w2 = d0.textbbox((0, 0), detail, font=b_font)[2]
    cw = min(1040, max(440, max(w1, w2) + 60))
    ch = 78
    img = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(
        [(0, 0), (cw - 1, ch - 1)],
        radius=14,
        fill=(7, 13, 25, 222),
        outline=(*accent_rgb, 175),
        width=2,
    )
    d.rectangle([(14, 14), (19, ch - 14)], fill=(*accent_rgb, 255))
    d.text((34, 13), title, fill=(*accent_rgb, 255), font=t_font)
    bh = d.textbbox((0, 0), detail, font=b_font)[3]
    d.text((34, 38 + max(0, (26 - bh) // 2)), detail, fill=(241, 245, 249, 255), font=b_font)
    _CARD_CACHE[key] = np.array(img)
    return _CARD_CACHE[key]


_ENDCARD_RGBA = None


def get_endcard_rgba() -> np.ndarray:
    global _ENDCARD_RGBA
    if _ENDCARD_RGBA is not None:
        return _ENDCARD_RGBA

    img = Image.new("RGBA", (W, H), (5, 10, 20, 214))
    d = ImageDraw.Draw(img)

    # Outer main glass container (leaving space at bottom y >= 905 for closing narration caption pill!)
    cx0, cy0, cx1, cy1 = 120, 74, W - 120, 868
    d.rounded_rectangle(
        [(cx0, cy0), (cx1, cy1)],
        radius=28,
        fill=(9, 16, 32, 232),
        outline=(56, 189, 248, 175),
        width=3,
    )

    # Subtle glowing header pill
    d.rounded_rectangle([(175, 110), (740, 148)], radius=18, fill=(14, 165, 233, 45), outline=(56, 189, 248, 180), width=1)
    d.text((196, 118), "OPEN CLINICAL TRIAGE & VERIFICATION INFRASTRUCTURE", fill=(125, 211, 252, 255), font=F_END_HDR)

    d.text((175, 165), "SHASTHOSETU AI", fill=(255, 255, 255, 255), font=F_END_TITLE)
    d.text((175, 250), "Audited · Bilingual (EN / Bangla) · Doctor-Governed · Zero-PHI Synthetic Demo", fill=(148, 210, 224, 255), font=F_END_SUB)

    # Divider line
    d.rectangle([(175, 304), (cx1 - 55, 306)], fill=(51, 65, 85, 180))

    # Row 1: Two Side-by-Side Glass Link Cards (GitHub + Hugging Face) with exact bbox fit
    links = [
        ("GITHUB SOURCE REPOSITORY", "https://github.com/ashik123-a1/ShasthoSetu-AI", (56, 189, 248)),
        ("HUGGING FACE CLINICAL DATASETS", "https://huggingface.co/datasets/ashik1236/shasthosetu-clinical-datasets", (16, 185, 129)),
    ]
    lx = 175
    lw = 765
    for idx_l, (l_hdr, l_url, col) in enumerate(links):
        rx = lx + lw
        d.rounded_rectangle([(lx, 328), (rx, 434)], radius=18, fill=(15, 24, 44, 235), outline=(*col, 195), width=2)
        d.rectangle([(lx + 20, 348), (lx + 26, 414)], fill=(*col, 255))
        d.text((lx + 42, 344), l_hdr, fill=(*col, 255), font=F_END_HDR)
        url_font = fit_font(d, FONT_MONO, l_url, lw - 66, 20, 12)
        d.text((lx + 42, 380), l_url, fill=(248, 250, 252, 255), font=url_font)
        lx += lw + 40

    # Row 2: 5-Member Dhaka Engineering Team Strip (verbatim roles from teamData.ts)
    d.text((175, 464), "TEAM SHASTHOSETU AI  ·  DHAKA, BANGLADESH", fill=(148, 163, 184, 255), font=F_END_HDR)
    team = [
        ("Nakib Md Ashik", "Team Leader &\nSystem Architect"),
        ("Mynuddin Ahmed", "Frontend & 3D\nGeospatial UI/UX"),
        ("Hasin Ishruq", "Clinical AI & ML\nResearch Engineer"),
        ("Al Kabir", "Backend, Security &\nTelemetry Engineer"),
        ("Rifah Sunjidah Remu", "Clinical QA &\nHealth Informatics"),
    ]
    tx = 175
    tw = 304
    gap = 12
    f_role_sm = load_font(FONT_REG, 17)
    for m_name, m_role in team:
        d.rounded_rectangle([(tx, 498), (tx + tw, 636)], radius=16, fill=(13, 21, 40, 230), outline=(71, 85, 105, 185), width=1)
        name_font = fit_font(d, FONT_SEMI, m_name, tw - 36, 22, 16)
        d.text((tx + 18, 518), m_name, fill=(248, 250, 252, 255), font=name_font)
        d.multiline_text((tx + 18, 558), m_role, fill=(125, 211, 252, 235), font=f_role_sm, spacing=6)
        tx += tw + gap

    # Row 3: Honest Codebase Metrics + Verifiable Media Credits
    d.rounded_rectangle([(175, 668), (cx1 - 55, 826)], radius=18, fill=(12, 19, 36, 230), outline=(51, 65, 85, 180), width=1)
    max_foot_w = (cx1 - 55) - 205 - 24
    line1 = "VERIFIED AUDIT BENCHMARKS:  M01 PCOS XGBoost 94.44% | M02 Ultrasound ResNet18 86.67% | M03 Viral Rash 91.94% Measles Recall"
    line2 = "SAFEGUARDS:  M04 Safe-OCR HTTP 422 Gate | M05 Whisper-Small-BN 98.37% BN Integrity | Zero-PHI Support HTTP 403 | 40/40 RBAC Checks"
    line3 = "CLINICAL B-ROLL: Curated Medical Animations (YouTube IDs: 73N4ePv56Es, 0ztF-419fac, o7fokX0Wloo, t7a1BAlcoHo, auIKg09zXbE, RYZ4daFwMa8) | Voice: Edge Neural TTS"
    d.text((205, 688), line1, fill=(226, 232, 240, 255), font=fit_font(d, FONT_REG, line1, max_foot_w, 18, 12))
    d.text((205, 724), line2, fill=(110, 231, 183, 245), font=fit_font(d, FONT_REG, line2, max_foot_w, 18, 12))
    d.text((205, 764), line3, fill=(148, 163, 184, 235), font=fit_font(d, FONT_REG, line3, max_foot_w, 16, 11))

    _ENDCARD_RGBA = np.array(img)
    return _ENDCARD_RGBA


# ---------------------------------------------------------------------------
# 13-CHAPTER SHOT CHOREOGRAPHY (Rhythmic Clinical B-Roll <-> Live Web App)
# Format per shot: (frac_start, frac_end, rel_path, offset_s, speed, (z0, z1, cx, cy), broll_grade_or_None)
# ---------------------------------------------------------------------------
ACCENT_SKY = (56, 189, 248)
ACCENT_ROSE = (244, 63, 94)
ACCENT_EMERALD = (16, 185, 129)
ACCENT_AMBER = (245, 158, 11)
ACCENT_VIOLET = (167, 139, 250)

CHAPTER_CONFIG = {
    "s01_crisis_hook": {
        "accent": ACCENT_ROSE,
        "hud_delay": 0.0,
        "card": ("ACUTE CARE & DIAGNOSTIC GAP", "170M+ Citizens · Severe Specialist Deficit · Unverified Paper Rx Harm"),
        "shots": [
            (0.00, 0.35, "broll/broll_dengue_fever.mp4", 0.0, 0.95, (1.00, 1.05, 0.50, 0.46), "crisis"),
            (0.35, 0.68, "broll/broll_dengue_fever.mp4", 9.2, 1.00, (1.00, 1.06, 0.50, 0.50), "crisis"),
            (0.68, 1.00, "broll/broll_lab_diagnostics_3d.mp4", 0.0, 1.00, (1.00, 1.05, 0.50, 0.48), "crisis"),
        ],
    },
    "s02_preloader": {
        "accent": ACCENT_SKY,
        "hud_delay": 999.0,  # Keep 8,600-particle 2 Doctors -> SHASTHOSETU AI reveal unobstructed!
        "card": None,
        "shots": [
            (0.00, 1.00, "clips/clip_00_preloader_fast.mp4", 0.15, 1.72, (1.00, 1.02, 0.50, 0.48), None),
        ],
    },
    "s03_platform_care_map": {
        "accent": ACCENT_EMERALD,
        "hud_delay": 0.0,
        "card": ("BILINGUAL INFRASTRUCTURE", "EN / Bangla Instant Toggle · 8-Division Care Atlas · Atomic Slot Booking"),
        "shots": [
            (0.00, 0.38, "clips/clip_02_home_care_map.mp4", 0.0, 1.15, (1.00, 1.02, 0.50, 0.50), None),
            (0.38, 0.53, "broll/broll_blood_cells_3d.mp4", 9.2, 1.00, (1.00, 1.05, 0.50, 0.50), "cool"),
            (0.53, 1.00, "clips/clip_02_home_care_map.mp4", 5.2, 1.25, (1.00, 1.02, 0.50, 0.50), None),
        ],
    },
    "s04_pcos_multimodal": {
        "accent": ACCENT_VIOLET,
        "hud_delay": 0.0,
        "card": ("M01 & M02 LIVE EXECUTION & LIMITS", "XGBoost 94.44% -> Ultrasound ResNet18 86.67% | Non-Diagnostic Decision Support"),
        "shots": [
            (0.00, 0.11, "broll/broll_pcos_3d.mp4", 0.0, 1.00, (1.01, 1.06, 0.50, 0.50), "cool"),
            (0.11, 0.49, "clips/clip_03_pcos_live.mp4", 0.0, 1.00, (1.00, 1.02, 0.50, 0.48), None),
            (0.49, 0.59, "broll/broll_pcos_3d.mp4", 9.2, 1.00, (1.01, 1.06, 0.50, 0.50), "cool"),
            (0.59, 1.00, "clips/clip_03_pcos_live.mp4", 8.6, 1.02, (1.00, 1.02, 0.50, 0.48), None),
        ],
    },
    "s05_viral_pediatric": {
        "accent": ACCENT_AMBER,
        "hud_delay": 0.0,
        "card": ("M03 & M06 LIVE EXECUTION & LIMITS", "91.94% Measles Recall (99.10% Leak Quarantined) | DermoPed N=22 Cohort Limit"),
        "shots": [
            (0.00, 0.11, "broll/broll_dengue_fever.mp4", 4.8, 1.00, (1.00, 1.05, 0.50, 0.50), "cool"),
            (0.11, 0.51, "clips/clip_04_viral_pediatric_live.mp4", 0.0, 1.16, (1.00, 1.02, 0.50, 0.48), None),
            (0.51, 0.61, "broll/broll_lab_diagnostics_3d.mp4", 9.2, 1.00, (1.00, 1.05, 0.50, 0.50), "cool"),
            (0.61, 1.00, "clips/clip_04_viral_pediatric_live.mp4", 9.6, 1.18, (1.00, 1.02, 0.50, 0.48), None),
        ],
    },
    "s06_prescription_ocr": {
        "accent": ACCENT_AMBER,
        "hud_delay": 0.0,
        "card": ("M04 SAFE-OCR DUAL GATE", "Patient: Text Verified Only (HTTP 422 Lock) | Approved Doctor: Clinical Authorization"),
        "shots": [
            (0.00, 0.11, "broll/broll_lab_diagnostics_3d.mp4", 4.6, 1.00, (1.00, 1.05, 0.50, 0.50), "cool"),
            (0.11, 0.60, "clips/clip_05_ocr_dual_gate.mp4", 0.0, 1.22, (1.00, 1.02, 0.50, 0.48), None),
            (0.60, 0.70, "broll/broll_dengue_fever.mp4", 1.2, 0.90, (1.00, 1.05, 0.50, 0.46), "cool"),
            (0.70, 1.00, "clips/clip_05_ocr_dual_gate.mp4", 11.3, 1.10, (1.00, 1.02, 0.50, 0.48), None),
        ],
    },
    "s07_bangla_voice": {
        "accent": ACCENT_SKY,
        "hud_delay": 0.0,
        "card": ("M05 LIVE BANGLA QUERY & FLEURS LIMIT", "Whisper-Small-BN 98.37% Unicode Integrity | Disclosed 39.09% FLEURS WER Band"),
        "shots": [
            (0.00, 0.13, "broll/broll_pcos_3d.mp4", 5.2, 1.00, (1.01, 1.05, 0.50, 0.50), "cool"),
            (0.13, 1.00, "clips/clip_06_bangla_voice_live.mp4", 0.0, 1.01, (1.00, 1.03, 0.50, 0.46), None),
        ],
    },
    "s08_rag_citations_999": {
        "accent": ACCENT_ROSE,
        "hud_delay": 0.0,
        "card": ("CLINICAL RAG + CITATION DRAWER + 999", "Verified Guideline Citations · 3D Body Scanner · Instant 999 Emergency Override"),
        "shots": [
            (0.00, 0.45, "clips/clip_07_rag_citations_live.mp4", 0.0, 1.16, (1.00, 1.02, 0.50, 0.50), None),
            (0.45, 0.57, "broll/broll_ecg_cardiac.mp4", 3.8, 1.00, (1.01, 1.06, 0.50, 0.50), "cool"),
            (0.57, 1.00, "clips/clip_07_rag_citations_live.mp4", 9.2, 1.45, (1.00, 1.02, 0.50, 0.50), None),
        ],
    },
    "s09_telemedicine": {
        "accent": ACCENT_EMERALD,
        "hud_delay": 0.0,
        "card": ("BMDC CLINICIAN WORKSPACE", "Verified Dr. Farhana (BMDC #91044) · Live Consultation & e-Prescription"),
        "shots": [
            (0.00, 0.18, "broll/broll_ecg_cardiac.mp4", 0.0, 1.00, (1.00, 1.05, 0.50, 0.50), "cool"),
            (0.18, 1.00, "clips/clip_08_doctor_telemedicine.mp4", 0.0, 1.20, (1.00, 1.02, 0.50, 0.48), None),
        ],
    },
    "s10_blood_connect": {
        "accent": ACCENT_ROSE,
        "hud_delay": 0.0,
        "card": ("GEO-RADIUS BLOOD NETWORK", "Interactive 5 / 10 / 20 km Donor Discovery · Masked Phone Privacy"),
        "shots": [
            (0.00, 0.20, "broll/broll_blood_cells_3d.mp4", 0.0, 1.00, (1.00, 1.05, 0.50, 0.50), "cool"),
            (0.20, 0.78, "clips/clip_09_blood_connect.mp4", 0.0, 1.25, (1.00, 1.02, 0.50, 0.50), None),
            (0.78, 1.00, "broll/broll_blood_cells_3d.mp4", 4.8, 1.00, (1.00, 1.05, 0.50, 0.50), "cool"),
        ],
    },
    "s11_security_zerophi": {
        "accent": ACCENT_EMERALD,
        "hud_delay": 0.0,
        "card": ("SECURITY & ZERO-PHI AUDIT", "5-Role RBAC · Support HTTP 403 Clinical Isolation · 40/40 Checks Passed"),
        "shots": [
            (0.00, 1.00, "clips/clip_10_security_rbac.mp4", 0.0, 0.95, (1.00, 1.02, 0.50, 0.50), None),
        ],
    },
    "s12_team_brief": {
        "accent": ACCENT_SKY,
        "hud_delay": 0.0,
        "card": ("TEAM SHASTHOSETU AI", "Leader: Nakib Md Ashik · Mynuddin · Hasin · Al Kabir · Rifah Remu"),
        "shots": [
            (0.00, 1.00, "clips/clip_01_team_roster.mp4", 0.6, 1.10, (1.00, 1.02, 0.50, 0.50), None),
        ],
    },
    "s13_closing_endcard": {
        "accent": ACCENT_SKY,
        "hud_delay": 999.0,  # Endcard provides full clean frame
        "card": None,
        "shots": [
            (0.00, 1.00, "clips/clip_11_closing_bg.mp4", 0.0, 0.90, (1.00, 1.03, 0.50, 0.50), None),
        ],
    },
}


class ReaderPool:
    def __init__(self):
        self.pool: dict[str, VideoReader] = {}

    def get(self, rel_path: str) -> VideoReader:
        abs_p = os.path.join(BUILD_DIR, rel_path)
        if abs_p not in self.pool:
            self.pool[abs_p] = VideoReader(abs_p)
        return self.pool[abs_p]

    def close_all(self):
        for vr in self.pool.values():
            vr.close()


def eval_shot_frame(pool: ReaderPool, shot: tuple, seg_prog: float, seg_elapsed: float, seg_dur: float) -> np.ndarray:
    f0, f1, rel_path, offset_s, speed, (z0, z1, cx, cy), grade = shot
    shot_span = max(0.05, (f1 - f0) * seg_dur)
    local_p = max(0.0, min(1.0, (seg_prog - f0) / max(1e-6, f1 - f0)))
    vr = pool.get(rel_path)
    src_t = offset_s + local_p * shot_span * speed
    fr = vr.get_frame_at_time(src_t)
    z = z0 + (z1 - z0) * local_p
    fr = apply_camera_zoom(fr, z, cx, cy)
    if grade:
        fr = grade_clinical_broll(fr, grade)
    return fr


def render_segment_raw(pool: ReaderPool, seg: dict, t_global: float) -> np.ndarray:
    cfg = CHAPTER_CONFIG[seg["id"]]
    shots = cfg["shots"]
    seg_s = float(seg["scene_start"])
    seg_e = float(seg["scene_end"])
    seg_dur = max(0.1, seg_e - seg_s)
    elapsed = max(0.0, t_global - seg_s)
    prog = max(0.0, min(1.0, elapsed / seg_dur))

    # Find primary shot matching seg progress
    chosen_idx = len(shots) - 1
    for i, sh in enumerate(shots):
        if prog < sh[1]:
            chosen_idx = i
            break

    fr = eval_shot_frame(pool, shots[chosen_idx], prog, elapsed, seg_dur)

    # Smooth intra-chapter crossfade between consecutive B-roll / App shots
    if chosen_idx > 0:
        cut_prog = shots[chosen_idx][0]
        dist_frames = (prog - cut_prog) * seg_dur * FPS
        if 0 <= dist_frames < SUB_XFADE_HALF:
            prev_fr = eval_shot_frame(pool, shots[chosen_idx - 1], prog, elapsed, seg_dur)
            alpha = 0.5 + 0.5 * (dist_frames / SUB_XFADE_HALF)
            fr = cv2.addWeighted(prev_fr, 1.0 - alpha, fr, alpha, 0.0)
    if chosen_idx + 1 < len(shots):
        cut_prog = shots[chosen_idx][1]
        dist_frames = (cut_prog - prog) * seg_dur * FPS
        if 0 <= dist_frames < SUB_XFADE_HALF:
            next_fr = eval_shot_frame(pool, shots[chosen_idx + 1], prog, elapsed, seg_dur)
            alpha = 0.5 - 0.5 * (dist_frames / SUB_XFADE_HALF)
            fr = cv2.addWeighted(fr, 1.0 - alpha, next_fr, alpha, 0.0)

    return fr


def active_cue_for_time(cues: list[dict], t_sec: float) -> str:
    for c in cues:
        if c["start"] <= t_sec <= c["end"]:
            return c["text"]
    return ""


def main():
    if not os.path.exists(MANIFEST_PATH):
        raise FileNotFoundError(f"Missing manifest: {MANIFEST_PATH}")
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)["pitch_180s"]

    segments = manifest["segments"]
    cues = manifest["cues"]
    total_dur = float(manifest["total_duration_s"])
    master_wav = manifest["audio_wav"]

    out_1080 = os.path.join(VIDEO_DIR, "SHASTHOSETU_COMPETITION_FINAL_1080P.mp4")
    out_720 = os.path.join(VIDEO_DIR, "SHASTHOSETU_COMPETITION_PREVIEW_720P.mp4")
    n_frames = int(math.ceil(total_dur * FPS))

    print(f"============================================================")
    print(f"SHASTHOSETU AI v2 COMPOSITOR | {n_frames} frames ({total_dur:.2f}s @ {FPS}fps)")
    print(f"============================================================")

    pool = ReaderPool()
    cmd = [
        FFMPEG, "-y", "-loglevel", "warning",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-s", f"{W}x{H}", "-pix_fmt", "bgr24", "-r", str(FPS),
        "-i", "-",
        "-i", master_wav,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-shortest",
        out_1080,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    # Precompute target frame indices for per-chapter QC snapshot dumps (midpoint of every segment + key highlights)
    qc_targets = {}
    for idx_s, s in enumerate(segments):
        mid_t = 0.5 * (s["start_s"] + s["end_s"])
        if s["id"] == "s02_preloader":
            mid_t = s["scene_start"] + 1.15  # Capture clean 2 Doctors Back-to-Back peak!
        elif s["id"] == "s08_rag_citations_999":
            mid_t = s["scene_start"] + 6.0   # Capture open CitationDrawer dialog!
        elif s["id"] == "s13_closing_endcard":
            mid_t = s["start_s"] + 4.5       # Capture full glassmorphic Endcard!
        qc_targets[int(round(mid_t * FPS))] = f"ch_{idx_s+1:02d}_{s['id']}.png"

    endcard_rgba = get_endcard_rgba()
    last_seg_idx = 0

    for fi in range(n_frames):
        t = fi / float(FPS)
        # -0.08s visual lead matches AgriSense smooth scene anticipation
        t_vis = max(0.0, t + 0.08)

        while last_seg_idx + 1 < len(segments) and t_vis >= segments[last_seg_idx + 1]["scene_start"]:
            last_seg_idx += 1
        seg = segments[last_seg_idx]
        cfg = CHAPTER_CONFIG[seg["id"]]

        # Render current chapter raw frame
        fr = render_segment_raw(pool, seg, t_vis)

        # Inter-chapter XFADE_HALF blend
        if last_seg_idx > 0:
            prev_seg = segments[last_seg_idx - 1]
            dt_f = (t_vis - prev_seg["scene_end"]) * FPS
            if -XFADE_HALF <= dt_f < XFADE_HALF:
                w_cur = 0.5 + 0.5 * (dt_f / XFADE_HALF)
                prev_fr = render_segment_raw(pool, prev_seg, t_vis)
                fr = cv2.addWeighted(prev_fr, 1.0 - w_cur, fr, w_cur, 0.0)
        if last_seg_idx + 1 < len(segments):
            next_seg = segments[last_seg_idx + 1]
            dt_f = (next_seg["scene_start"] - t_vis) * FPS
            if 0.0 <= dt_f < XFADE_HALF:
                w_next = 0.5 - 0.5 * (dt_f / XFADE_HALF)
                next_fr = render_segment_raw(pool, next_seg, t_vis)
                fr = cv2.addWeighted(fr, 1.0 - w_next, next_fr, w_next, 0.0)

        # Closing Glassmorphic Endcard overlay
        seg_elapsed = t_vis - seg["scene_start"]
        seg_dur = max(0.1, seg["scene_end"] - seg["scene_start"])
        seg_prog = max(0.0, min(1.0, seg_elapsed / seg_dur))

        if seg["id"] == "s13_closing_endcard" and seg_elapsed >= 1.4:
            fade_in = min(1.0, (seg_elapsed - 1.4) / 0.65)
            fr = alpha_composite_bgr(fr, endcard_rgba, opacity=fade_in)

        # Top Broadcast HUD
        if seg_elapsed >= cfg["hud_delay"]:
            hud_alpha = min(1.0, (seg_elapsed - cfg["hud_delay"]) / 0.40)
            hud_rgba = render_top_hud_rgba(
                seg["act"], seg["label"], cfg["accent"], t, total_dur, seg_prog
            )
            fr = alpha_composite_box_bgr(fr, hud_rgba, 0, 0, opacity=hud_alpha)

        # Evidence Slide-in Glass Card (positioned cleanly above subtitle zone)
        if cfg["card"] and 0.45 <= seg_elapsed <= seg_dur - 0.45:
            t_in = min(1.0, (seg_elapsed - 0.45) / 0.38)
            t_out = min(1.0, (seg_dur - 0.45 - seg_elapsed) / 0.35)
            ease = 1.0 - (1.0 - t_in) ** 3
            card_rgba = get_evidence_card_box(cfg["card"][0], cfg["card"][1], cfg["accent"])
            slide_x = int(52 - (1.0 - ease) * 44)
            fr = alpha_composite_box_bgr(fr, card_rgba, slide_x, 754, opacity=min(t_in, t_out))

        # Balanced 2-Line Captions
        cue_txt = active_cue_for_time(cues, t)
        if cue_txt:
            sub_res = get_subtitle_box(cue_txt)
            if sub_res is not None:
                s_arr, sx, sy = sub_res
                fr = alpha_composite_box_bgr(fr, s_arr, sx, sy, opacity=1.0)

        # Final 0.40s smooth fade-to-black at end of video
        rem = total_dur - t
        if rem < 0.40:
            fade_black = max(0.0, min(1.0, rem / 0.40))
            fr = (fr.astype(np.float32) * fade_black).astype(np.uint8)

        if fi in qc_targets:
            cv2.imwrite(os.path.join(FINAL_QC_DIR, qc_targets[fi]), fr)

        proc.stdin.write(fr.tobytes())
        if fi % 600 == 0 or fi == n_frames - 1:
            print(f"  [RENDER] {fi+1}/{n_frames} frames ({100.0*(fi+1)/n_frames:.1f}%) @ t={t:.1f}s")

    proc.stdin.close()
    rc = proc.wait()
    pool.close_all()
    if rc != 0:
        raise RuntimeError(f"FFmpeg 1080p encode failed with exit code {rc}")
    print(f"[SAVED 1080P] {out_1080} ({os.path.getsize(out_1080)/1e6:.2f} MB)")

    print("[TRANSCODE] Generating 720p lightweight review preview...")
    subprocess.run([
        FFMPEG, "-y", "-loglevel", "warning",
        "-i", out_1080,
        "-vf", "scale=1280:720:flags=lanczos",
        "-c:v", "libx264", "-preset", "medium", "-crf", "21",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
        out_720,
    ], check=True)
    print(f"[SAVED 720P] {out_720} ({os.path.getsize(out_720)/1e6:.2f} MB)")


if __name__ == "__main__":
    main()
