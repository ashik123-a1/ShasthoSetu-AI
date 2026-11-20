import os
import sys
import subprocess
import math
import argparse
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import yt_dlp

sys.stdout.reconfigure(line_buffering=True)

FFMPEG = r"C:\Users\ASHIK_CSE\AppData\Local\Programs\Python\Python311\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
BASE_BROLL_DIR = os.path.join("docs", "SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01", "_build", "broll")
RAW_DIR = os.path.join(BASE_BROLL_DIR, "raw")
SCOUT_DIR = os.path.join(BASE_BROLL_DIR, "scout")

SOURCES = [
    ("raw_pcos", "https://www.youtube.com/watch?v=RMWy9_CQZxc", "PCOS & Menstrual Cycle Animation"),
    ("raw_pcos_3d", "https://www.youtube.com/watch?v=IvbjjJdKWTg", "Understanding PCOS 3D Animation"),
    ("raw_dengue", "https://www.youtube.com/watch?v=WvuLKjYMfCg", "Dengue Fever Symptoms & Blood Tests"),
    ("raw_blood_rbc", "https://www.youtube.com/watch?v=o7fokX0Wloo", "Red Blood Cells 3D Animation"),
    ("raw_lab_urine", "https://www.youtube.com/watch?v=auIKg09zXbE", "Urinalysis 3D Animation"),
    ("raw_lab_hb", "https://www.youtube.com/watch?v=t7a1BAlcoHo", "Hemoglobin 3D Lab Diagnosis"),
    ("raw_ecg", "https://www.youtube.com/watch?v=RYZ4daFwMa8", "Cardiac Conduction & ECG Animation"),
]

# Populated after visual inspection of all scout contact sheets (zero talking heads / zero watermarks)
TRIM_SPECS = [
    {
        "out": "broll_pcos_3d.mp4",
        "crop": "crop=in_w*0.86:in_h*0.78:in_w*0.14:in_h*0.08",
        "grade": "eq=contrast=1.08:saturation=0.90",
        "segments": [
            ("alt_pcos_hl.mp4", 94.5, 99.0),     # Dark atmospheric 3D follicle/ovum (zero text, zero corner icon)
            ("alt_pcos_hl.mp4", 112.0, 116.5),   # Deep red-dark endocrine blood vessel (zero corner icon)
            ("alt_pcos_hl.mp4", 144.0, 148.0),   # Dark 3D cystic ovary structure (zero corner icon)
        ],
    },
    {
        "out": "broll_dengue_fever.mp4",
        "grade": "eq=contrast=1.08:brightness=-0.03:saturation=0.82",
        "segments": [
            ("alt_dengue_ab.mp4", 85.5, 90.0),   # Masked patient in hospital bed with gloved doctor
            ("alt_dengue_ab.mp4", 8.0, 12.5),    # Deep blue 3D viral particles
            ("alt_dengue_ab.mp4", 111.5, 115.5), # Crowded urban bridge during outbreak
        ],
    },
    {
        "out": "broll_blood_cells_3d.mp4",
        "grade": "eq=contrast=1.06:saturation=0.95",
        "segments": [
            ("raw_blood_rbc.mp4", 10.0, 14.5),   # Cinema-grade 3D Red Blood Cells
            ("raw_lab_hb.mp4", 95.0, 99.5),      # 3D blood vessel O2/Hb circulation
            ("raw_blood_rbc.mp4", 153.0, 157.0), # Automated CBC purple-top vials in lab
        ],
    },
    {
        "out": "broll_lab_diagnostics_3d.mp4",
        "grade": "eq=contrast=1.05:saturation=0.94",
        "segments": [
            ("raw_lab_urine.mp4", 290.0, 294.5), # Pathologist examining sample via microscope
            ("raw_lab_urine.mp4", 314.0, 318.5), # Gloved lab clinician adjusting optical stage
            ("raw_lab_hb.mp4", 180.0, 183.5),    # Laser optical hematology telemetry reader
        ],
    },
    {
        "out": "broll_ecg_cardiac.mp4",
        "crop": "crop=in_w*0.88:in_h*0.58:in_w*0.06:in_h*0.25",
        "grade": "eq=contrast=1.10:saturation=1.05",
        "segments": [
            ("raw_ecg.mp4", 104.5, 109.0),       # Crisp green/red ECG QRS complex (watermarks cropped out)
            ("raw_ecg.mp4", 152.5, 157.0),       # Synchronized beating heart & ECG trace (watermarks cropped out)
        ],
    },
]


def ensure_dirs():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(SCOUT_DIR, exist_ok=True)
    os.makedirs(BASE_BROLL_DIR, exist_ok=True)


def download_raw_sources():
    ensure_dirs()
    for name, url, desc in SOURCES:
        out_tmpl = os.path.join(RAW_DIR, f"{name}.%(ext)s")
        expected_mp4 = os.path.join(RAW_DIR, f"{name}.mp4")
        if os.path.exists(expected_mp4) and os.path.getsize(expected_mp4) > 100_000:
            print(f"[SKIP] Already exists: {expected_mp4} ({os.path.getsize(expected_mp4)//1024} KB)")
            continue
        print(f"[DL] Downloading {name} ({desc}) from {url}...")
        ydl_opts = {
            "format": "bestvideo[height<=1080][ext=mp4]/bestvideo[height<=1080]/bestvideo[ext=mp4]/best[ext=mp4]",
            "outtmpl": out_tmpl,
            "ffmpeg_location": FFMPEG,
            "quiet": False,
            "no_warnings": True,
            "overwrites": True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as e:
            print(f"[ERR] Failed downloading {name}: {e}")


def load_font(size=24):
    for p in ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf"]:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def generate_scout_sheets():
    ensure_dirs()
    font = load_font(22)
    raw_files = sorted(f for f in os.listdir(RAW_DIR) if f.endswith((".mp4", ".webm", ".mkv")))
    for fname in raw_files:
        stem = os.path.splitext(fname)[0]
        raw_path = os.path.join(RAW_DIR, fname)
        scout_path = os.path.join(SCOUT_DIR, f"scout_{stem}.jpg")

        cap = cv2.VideoCapture(raw_path)
        if not cap.isOpened():
            print(f"[ERR] Cannot open {raw_path}")
            continue
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        dur = total_frames / fps
        print(f"[SCOUT] {fname}: {dur:.1f}s @ {fps:.2f}fps ({int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))})")

        cols, rows = 5, 4
        num_tiles = cols * rows
        tile_w, tile_h = 384, 216
        sheet = Image.new("RGB", (cols * tile_w, rows * tile_h), (12, 16, 24))

        # Sample across usable body of video (skip first/last 2s slightly if long, else full)
        start_s = 2.0 if dur > 20 else 0.0
        end_s = max(start_s + 1.0, dur - 2.0)
        times = np.linspace(start_s, end_s, num_tiles)

        for idx, t in enumerate(times):
            f_idx = min(total_frames - 1, max(0, int(round(t * fps))))
            cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
            ok, frm = cap.read()
            if not ok or frm is None:
                continue
            frm_rgb = cv2.cvtColor(frm, cv2.COLOR_BGR2RGB)
            tile = Image.fromarray(frm_rgb).resize((tile_w, tile_h), Image.Resampling.LANCZOS)
            draw = ImageDraw.Draw(tile)
            mm = int(t // 60)
            ss = int(t % 60)
            label = f"{mm:02d}:{ss:02d} ({t:.0f}s)"
            draw.rectangle([6, 6, 170, 36], fill=(0, 0, 0))
            draw.text((12, 9), label, fill=(255, 235, 59), font=font)

            r = idx // cols
            c = idx % cols
            sheet.paste(tile, (c * tile_w, r * tile_h))

        cap.release()
        sheet.save(scout_path, quality=90)
        print(f"[SAVED] Scout sheet: {scout_path}")


def trim_broll_clips():
    ensure_dirs()
    if not TRIM_SPECS:
        print("[INFO] TRIM_SPECS is empty. Populate TRIM_SPECS after scouting.")
        return

    for spec in TRIM_SPECS:
        out_name = spec["out"]
        out_path = os.path.join(BASE_BROLL_DIR, out_name)
        segments = spec["segments"]
        crop_filter = spec.get("crop", "")
        grade_filter = spec.get("grade", "")

        part_paths = []
        for idx, (src_file, t_start, t_end) in enumerate(segments):
            src_path = os.path.join(RAW_DIR, src_file)
            part_path = os.path.join(RAW_DIR, f"_tmp_{out_name}_{idx}.mp4")
            vf_chain = []
            if crop_filter:
                vf_chain.append(crop_filter)
            vf_chain.append("scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1")
            if grade_filter:
                vf_chain.append(grade_filter)
            vf = ",".join(vf_chain)

            cmd = [
                FFMPEG, "-y", "-loglevel", "error",
                "-ss", f"{t_start:.2f}",
                "-to", f"{t_end:.2f}",
                "-i", src_path,
                "-an",
                "-vf", vf,
                "-r", "30",
                "-c:v", "libx264", "-preset", "medium", "-crf", "16",
                "-pix_fmt", "yuv420p",
                part_path,
            ]
            print(f"[TRIM] {out_name} part {idx}: {src_file} [{t_start:.1f}s -> {t_end:.1f}s]")
            subprocess.run(cmd, check=True)
            part_paths.append(part_path)

        if len(part_paths) == 1:
            if os.path.exists(out_path):
                os.remove(out_path)
            os.replace(part_paths[0], out_path)
        else:
            concat_txt = os.path.join(RAW_DIR, f"_concat_{out_name}.txt")
            with open(concat_txt, "w", encoding="utf-8") as f:
                for pp in part_paths:
                    f.write(f"file '{os.path.abspath(pp)}'\n")
            cmd_concat = [
                FFMPEG, "-y", "-loglevel", "error",
                "-f", "concat", "-safe", "0", "-i", concat_txt,
                "-c", "copy", "-movflags", "+faststart",
                out_path,
            ]
            subprocess.run(cmd_concat, check=True)
            for pp in part_paths:
                if os.path.exists(pp):
                    os.remove(pp)
            if os.path.exists(concat_txt):
                os.remove(concat_txt)

        # Verify output
        cap = cv2.VideoCapture(out_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        print(f"[OK] Trimmed {out_name}: {w}x{h} @ {fps:.1f}fps, {frames} frames ({frames/max(fps,1):.2f}s)")

    # Generate 1 confirmation contact sheet of all final trimmed B-rolls
    broll_files = sorted(f for f in os.listdir(BASE_BROLL_DIR) if f.startswith("broll_") and f.endswith(".mp4"))
    if broll_files:
        font = load_font(24)
        tw, th = 480, 270
        cols = 3
        rows = len(broll_files)
        qc_img = Image.new("RGB", (cols * tw, rows * th), (10, 14, 22))
        for r_idx, bf in enumerate(broll_files):
            bp = os.path.join(BASE_BROLL_DIR, bf)
            cap = cv2.VideoCapture(bp)
            total = max(1, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            for c_idx, frac in enumerate([0.15, 0.50, 0.85]):
                fi = min(total - 1, int(total * frac))
                cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
                ok, frm = cap.read()
                if not ok or frm is None:
                    continue
                tile = Image.fromarray(cv2.cvtColor(frm, cv2.COLOR_BGR2RGB)).resize((tw, th), Image.Resampling.LANCZOS)
                draw = ImageDraw.Draw(tile)
                draw.rectangle([6, 6, 420, 38], fill=(0, 0, 0))
                draw.text((12, 9), f"{bf} @ {fi/fps:.1f}s", fill=(52, 211, 153), font=font)
                qc_img.paste(tile, (c_idx * tw, r_idx * th))
            cap.release()
        qc_path = os.path.join(SCOUT_DIR, "trimmed_broll_qc.jpg")
        qc_img.save(qc_path, quality=92)
        print(f"[QC] Saved trimmed B-roll contact sheet: {qc_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--trim", action="store_true", help="Trim finalized B-roll segments")
    args = parser.parse_args()
    if args.trim:
        trim_broll_clips()
    else:
        download_raw_sources()
        generate_scout_sheets()
