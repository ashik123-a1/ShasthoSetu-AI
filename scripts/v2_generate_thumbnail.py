import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

BUILD_DIR = os.path.join("docs", "SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01", "_build")
CLIPS_DIR = os.path.join(BUILD_DIR, "clips")
OUT_PATH = os.path.join("docs", "SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01", "video", "SHASTHOSETU_COMPETITION_THUMBNAIL.png")

FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_SEMI = "C:/Windows/Fonts/seguisb.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"


def load_font(path: str, size: int):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def extract_clip_frame(clip_name: str, frac: float) -> Image.Image:
    p = os.path.join(CLIPS_DIR, clip_name)
    cap = cv2.VideoCapture(p)
    total = max(1, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
    idx = max(0, min(total - 1, int(total * frac)))
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
    ok, fr = cap.read()
    cap.release()
    if not ok or fr is None:
        return Image.new("RGBA", (1920, 1080), (10, 16, 30, 255))
    rgb = cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb).convert("RGBA")


def main():
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    bg = extract_clip_frame("clip_11_closing_bg.mp4", 0.65).resize((1920, 1080), Image.Resampling.LANCZOS)
    darken = Image.new("RGBA", (1920, 1080), (7, 12, 24, 218))
    canvas = Image.alpha_composite(bg, darken)
    d = ImageDraw.Draw(canvas)

    # Outer accent frame
    d.rounded_rectangle([(24, 24), (1896, 1056)], radius=24, outline=(56, 189, 248, 140), width=3)

    # Top pill badge (measured tightly via textbbox so text never clips)
    f_tag = load_font(FONT_BOLD, 20)
    tag_txt = "OFFICIAL COMPETITION PITCH · 3-MIN DOCUMENTARY"
    bb_tag = d.textbbox((0, 0), tag_txt, font=f_tag)
    tag_w = (bb_tag[2] - bb_tag[0]) + 56
    d.rounded_rectangle([(78, 66), (78 + tag_w, 110)], radius=22, fill=(14, 165, 233, 235))
    d.text((106, 77), tag_txt, fill=(6, 10, 18, 255), font=f_tag)

    # Hero Titles
    f_h1 = load_font(FONT_BOLD, 86)
    f_h2 = load_font(FONT_SEMI, 40)
    f_sub = load_font(FONT_REG, 25)
    d.text((78, 134), "SHASTHOSETU AI", fill=(255, 255, 255, 255), font=f_h1)
    d.text((78, 236), "Audited Clinical Triage, Safe-OCR & Telemedicine for Bangladesh", fill=(56, 189, 248, 255), font=f_h2)
    d.text((78, 294), "Bilingual EN / Bangla Care Platform · 6 Verified AI Modules · 5-Role Zero-PHI Security Architecture", fill=(203, 213, 225, 255), font=f_sub)

    # 4 Live App Feature Cards (never preloader!)
    cards = [
        ("M01/M02 PCOS AI (94.44%)", "clip_03_pcos_ai.mp4", 0.30, (167, 139, 250)),
        ("M04 Safe-OCR (HTTP 422)", "clip_05_ocr_studio.mp4", 0.25, (245, 158, 11)),
        ("5-Member Team & 3D Care", "clip_01_team_roster.mp4", 0.55, (56, 189, 248)),
        ("Geo-Radius Blood Connect", "clip_09_blood_connect.mp4", 0.45, (16, 185, 129)),
    ]

    x_pos = 78
    f_ct = load_font(FONT_BOLD, 21)
    for title, clip_name, frac, col in cards:
        thumb = extract_clip_frame(clip_name, frac).resize((414, 246), Image.Resampling.LANCZOS)
        frame_box = Image.new("RGBA", (422, 254), (*col, 245))
        frame_box.paste(thumb, (4, 4))
        canvas.paste(frame_box, (x_pos, 388))

        d.rounded_rectangle([(x_pos, 662), (x_pos + 422, 714)], radius=10, fill=(11, 18, 34, 238), outline=(*col, 210), width=2)
        d.text((x_pos + 18, 676), title, fill=(248, 250, 252, 255), font=f_ct)
        x_pos += 448

    # Bottom verification metrics panel
    d.rounded_rectangle([(78, 772), (1842, 992)], radius=20, fill=(10, 17, 33, 240), outline=(56, 189, 248, 125), width=2)
    f_pt = load_font(FONT_BOLD, 24)
    f_pd = load_font(FONT_REG, 20)
    highlights = [
        ("6 AUDITED CLINICAL MODELS", "XGBoost 94.44% · ResNet18 86.67%", "Measles 91.94% · Whisper-BN 98.37%", (56, 189, 248)),
        ("BILINGUAL RAG & 999 GATE", "LangGraph Clinical Triage State", "Hybrid Vector+BM25 · 3D Body Scanner", (16, 185, 129)),
        ("ZERO-PHI SECURITY VERIFIED", "5-Role RBAC · HTTP 403 Support Block", "40/40 Security Checks · Synthetic Demo", (245, 158, 11)),
    ]
    x_hl = 114
    for ht, line1, line2, col in highlights:
        d.rectangle([(x_hl, 804), (x_hl + 5, 956)], fill=(*col, 255))
        d.text((x_hl + 22, 806), ht, fill=(*col, 255), font=f_pt)
        d.text((x_hl + 22, 858), line1, fill=(241, 245, 249, 255), font=f_pd)
        d.text((x_hl + 22, 898), line2, fill=(148, 163, 184, 255), font=f_pd)
        x_hl += 580

    canvas.save(OUT_PATH)
    print(f"[SAVED THUMBNAIL] {OUT_PATH} ({os.path.getsize(OUT_PATH)/1e6:.2f} MB)")


if __name__ == "__main__":
    main()
