import os
import sys
import re
import wave
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import av
import cv2

sys.stdout.reconfigure(line_buffering=True)

BASE_DIR = "docs/SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01"
VIDEO_DIR = os.path.join(BASE_DIR, "video")
AUDIO_DIR = os.path.join(BASE_DIR, "audio")
CAPTURES_DIR = os.path.join(BASE_DIR, "captures")
CLINICAL_DIR = os.path.join(BASE_DIR, "source/clinical_references")
SUBTITLES_PATH = os.path.join(BASE_DIR, "subtitles/shasthosetu_en.srt")
MASTER_AUDIO_PATH = os.path.join(AUDIO_DIR, "master_audio_mixed.wav")

OUT_1080P = os.path.join(VIDEO_DIR, "SHASTHOSETU_COMPETITION_FINAL_1080P.mp4")
OUT_720P = os.path.join(VIDEO_DIR, "SHASTHOSETU_COMPETITION_PREVIEW_720P.mp4")

FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_SEMI = "C:/Windows/Fonts/seguisb.ttf"

def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

def parse_srt(srt_path):
    entries = []
    if not os.path.exists(srt_path):
        return entries
        
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    pattern = re.compile(r"(\d+)\s*\n(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})\s*\n(.*?)(?=\n\n|\n*$)", re.DOTALL)
    
    def parse_time(ts_str):
        h, m, rest = ts_str.split(":")
        s, ms = rest.split(",")
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0
        
    for m in pattern.finditer(content):
        start_t = parse_time(m.group(2))
        end_t = parse_time(m.group(3))
        text = m.group(4).replace("\n", " ").strip()
        entries.append((start_t, end_t, text))
        
    return entries

def get_scene_info(frame_idx, fps=30):
    t = frame_idx / float(fps)
    
    # 13 Scenes mapping
    if t < 15.0:
        # Scene 01: Healthcare Crisis (15s)
        if t < 3.75:
            img = "scene_01_a_pediatric_fever_crisis.png"
        elif t < 7.5:
            img = "scene_01_b_pcos_maternal_agony.png"
        elif t < 11.25:
            img = "scene_01_c_dengue_blood_emergency.png"
        else:
            img = "scene_01_d_prescription_toxicity_hazard.png"
        badge = "[CRISIS OVERVIEW] Acute Pediatric Fevers, Dengue & Maternal Care Void"
        badge_color = (239, 68, 68) # Red
        
    elif t < 18.0:
        # Scene 02: Preloader & Logo (3s)
        img = "scene_02_preloader.png"
        badge = "[BRAND IDENTITY] ShasthoSetu AI Foundation Platform"
        badge_color = (14, 165, 233) # Sky Blue
        
    elif t < 30.0:
        # Scene 03: Platform Solution (12s)
        img = "scene_03_homepage.png"
        badge = "[SYSTEM ARCHITECTURE] Web Platform & Bilingual Patient Portal"
        badge_color = (16, 185, 129) # Emerald
        
    elif t < 45.0:
        # Scene 04: Patient Journey & Doctors (15s)
        img = "scene_04_find_care.png"
        badge = "[CARE DELIVERY] 64-District Verified Doctor Network"
        badge_color = (56, 189, 248) # Cyan
        
    elif t < 68.0:
        # Scene 05: PCOS AI Dual Modality (23s)
        if t < 56.5:
            img = "scene_05_pcos_multimodal.png"
        else:
            img = "pcos_02_menstrual_cycle.jpg"
        badge = "[M01 & M02] Multimodal PCOS AI | XGBoost + ResNet18 Ultrasound"
        badge_color = (244, 63, 94) # Rose
        
    elif t < 88.0:
        # Scene 06: Measles & Pediatric Dermatology (20s)
        if t < 78.0:
            img = "scene_06_viral_rash.png"
        else:
            img = "scene_06_pediatric_dermatology.png"
        badge = "[M03 & M06] MobileNetV2 Measles & Pediatric Rash AI"
        badge_color = (249, 115, 22) # Orange
        
    elif t < 110.0:
        # Scene 07: Prescription OCR Studio (22s)
        img = "scene_07_ocr_studio.png"
        badge = "[M04] ViT-TrOCR Clinician Studio & Doctor Verification Gate"
        badge_color = (234, 179, 8) # Amber
        
    elif t < 124.0:
        # Scene 08: Bangla Voice AI (14s)
        img = "scene_08_bangla_voice.png"
        badge = "[M05] Whisper-v3 Fine-Tuned Bangla Voice AI & Unicode Transcript"
        badge_color = (168, 85, 247) # Purple
        
    elif t < 142.0:
        # Scene 09: Clinical RAG & LangGraph (18s)
        img = "scene_09_clinical_rag.png"
        badge = "[CLINICAL RAG] LangGraph Multi-Agent + Qdrant Hybrid + BM25"
        badge_color = (20, 184, 166) # Teal
        
    elif t < 158.0:
        # Scene 10: Telemedicine Live Studio (16s)
        img = "scene_10_doctor_telemedicine.png"
        badge = "[TELEMEDICINE] WebRTC HD Video & Digital e-Prescription Pad"
        badge_color = (59, 130, 246) # Blue
        
    elif t < 166.0:
        # Scene 11: Blood Connect Emergency (8s)
        img = "scene_11_blood_connect.png"
        badge = "[BLOOD CONNECT] Real-Time Geospatial Donor Dispatch"
        badge_color = (239, 68, 68) # Red
        
    elif t < 173.0:
        # Scene 12: Trust, Security & Privacy (7s)
        img = "scene_12_admin_security.png"
        badge = "[TRUST & SECURITY] Air-Gapped Zero-PHI Pipeline & RBAC"
        badge_color = (16, 185, 129) # Emerald
        
    else:
        # Scene 13: Research Lab & Platform Roadmap (7s)
        img = "scene_13_research_roadmap.png"
        badge = "[RESEARCH ROADMAP] Bangladesh Nationwide Healthcare Impact"
        badge_color = (14, 165, 233) # Sky Blue
        
    # Resolve image path
    img_path = resolve_image_path(img)
    return img_path, badge, badge_color

def wrap_text(text, max_chars=80):
    words = text.split(" ")
    lines = []
    curr = []
    curr_len = 0
    for w in words:
        if curr_len + len(w) + 1 <= max_chars:
            curr.append(w)
            curr_len += len(w) + 1
        else:
            lines.append(" ".join(curr))
            curr = [w]
            curr_len = len(w)
    if curr:
        lines.append(" ".join(curr))
    return lines

def resolve_image_path(img_ref):
    if os.path.isabs(img_ref) and os.path.exists(img_ref):
        return img_ref
    p1 = os.path.join(CAPTURES_DIR, img_ref)
    if os.path.exists(p1):
        return p1
    p2 = os.path.join(CLINICAL_DIR, img_ref)
    if os.path.exists(p2):
        return p2
    return p1
def precompute_cached_images(target_w=1920, target_h=1080):
    print("Pre-caching and scaling scene image textures...")
    image_cache = {}
    
    all_images = [
        "scene_01_a_pediatric_fever_crisis.png",
        "scene_01_b_pcos_maternal_agony.png",
        "scene_01_c_dengue_blood_emergency.png",
        "scene_01_d_prescription_toxicity_hazard.png",
        "scene_02_preloader.png",
        "scene_03_homepage.png",
        "scene_04_find_care.png",
        "scene_05_pcos_multimodal.png",
        "pcos_02_menstrual_cycle.jpg",
        "scene_06_viral_rash.png",
        "scene_06_pediatric_dermatology.png",
        "scene_07_ocr_studio.png",
        "scene_08_bangla_voice.png",
        "scene_09_clinical_rag.png",
        "scene_10_doctor_telemedicine.png",
        "scene_11_blood_connect.png",
        "scene_12_admin_security.png",
        "scene_13_research_roadmap.png",
    ]
    
    for img_ref in all_images:
        path = resolve_image_path(img_ref)
        if os.path.exists(path):
            im = Image.open(path).convert("RGB")
            w, h = im.size
            if w != target_w or h != target_h:
                im.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
                canvas = Image.new("RGB", (target_w, target_h), (10, 14, 23))
                offset_x = (target_w - im.width) // 2
                offset_y = (target_h - im.height) // 2
                canvas.paste(im, (offset_x, offset_y))
                im = canvas
            image_cache[path] = im
            image_cache[img_ref] = im
        else:
            print(f"Warning: image path not found: {path}")
            
    return image_cache

def render_video(out_path, width=1920, height=1080, fps=30, total_duration=180.0, audio_path=None):
    print(f"\n=======================================================")
    print(f"Rendering Competition Video: {out_path}")
    print(f"Resolution: {width}x{height} @ {fps} fps | Duration: {total_duration}s")
    print(f"=======================================================")
    
    srt_entries = parse_srt(SUBTITLES_PATH)
    print(f"Loaded {len(srt_entries)} subtitle cues from {SUBTITLES_PATH}")
    
    image_cache = precompute_cached_images(width, height)
    total_frames = int(total_duration * fps)
    
    # Fonts
    scale = width / 1920.0
    f_badge = load_font(FONT_BOLD, int(20 * scale))
    f_top = load_font(FONT_SEMI, int(15 * scale))
    f_sub = load_font(FONT_BOLD, int(23 * scale))
    
    # Setup PyAV Container
    container = av.open(out_path, mode="w")
    v_stream = container.add_stream("libx264", rate=fps)
    v_stream.width = width
    v_stream.height = height
    v_stream.pix_fmt = "yuv420p"
    v_stream.options = {"preset": "fast", "crf": "22"}
    
    a_stream = None
    audio_frames = []
    
    if audio_path and os.path.exists(audio_path):
        a_stream = container.add_stream("aac", rate=44100, layout="stereo")
        a_stream.bit_rate = 192000
        
        # Load entire mixed audio into memory
        with wave.open(audio_path, "rb") as wf:
            rate = wf.getframerate()
            channels = wf.getnchannels()
            n_frames = wf.getnframes()
            raw_audio = wf.readframes(n_frames)
            
        audio_arr = np.frombuffer(raw_audio, dtype=np.int16).astype(np.float32) / 32768.0
        if channels == 2:
            audio_stereo = audio_arr.reshape(-1, 2).T # (2, N)
        else:
            audio_stereo = np.tile(audio_arr, (2, 1))
            
        print(f"Master Audio loaded: {audio_stereo.shape[1]} samples ({audio_stereo.shape[1]/44100.0:.2f}s)")
    
    t_start = time.time()
    
    # Render all video frames
    current_sub_text = ""
    current_sub_lines = []
    
    for i in range(total_frames):
        t = i / float(fps)
        img_path, badge, badge_color = get_scene_info(i, fps=fps)
        
        # Base image
        base_im = image_cache.get(img_path)
        if base_im is None:
            frame_im = Image.new("RGB", (width, height), (15, 23, 42))
        else:
            frame_im = base_im.copy()
            
        draw = ImageDraw.Draw(frame_im)
        
        # Top Global Status Rail
        draw.rectangle([(0, 0), (width, int(42 * scale))], fill=(10, 14, 23))
        draw.line([(0, int(42 * scale)), (width, int(42 * scale))], fill=(51, 65, 85), width=1)
        draw.text((int(30 * scale), int(10 * scale)), "SHASTHOSETU AI  |  MULTIMODAL HEALTHCARE INFRASTRUCTURE", fill=(203, 213, 225), font=f_top)
        draw.text((width - int(380 * scale), int(10 * scale)), "GOOGLE AI COMPETITION 2026", fill=(56, 189, 248), font=f_top)
        
        # Lower-Third Technical Badge (Bottom Left)
        badge_y = height - int(140 * scale)
        badge_w = int(760 * scale)
        badge_h = int(48 * scale)
        draw.rounded_rectangle([(int(30 * scale), badge_y), (int(30 * scale) + badge_w, badge_y + badge_h)], radius=6, fill=(15, 23, 42), outline=badge_color, width=2)
        draw.text((int(45 * scale), badge_y + int(10 * scale)), badge, fill=(255, 255, 255), font=f_badge)
        
        # Subtitle Logic
        # Find active subtitle cue
        active_text = ""
        for s_start, s_end, s_txt in srt_entries:
            if s_start <= t <= s_end:
                active_text = s_txt
                break
                
        if active_text != current_sub_text:
            current_sub_text = active_text
            current_sub_lines = wrap_text(current_sub_text, max_chars=int(68 * scale)) if current_sub_text else []
            
        if current_sub_lines:
            n_lines = len(current_sub_lines)
            line_h = int(32 * scale)
            box_h = (n_lines * line_h) + int(24 * scale)
            box_y = height - box_h - int(24 * scale)
            
            # Measure longest line to center box
            max_line_w = max([draw.textlength(l, font=f_sub) for l in current_sub_lines])
            box_w = max_line_w + int(60 * scale)
            box_x = (width - box_w) // 2
            
            # Semi-dark subtitle glass container
            draw.rounded_rectangle([(box_x, box_y), (box_x + box_w, box_y + box_h)], radius=8, fill=(10, 14, 23), outline=(51, 65, 85), width=1)
            
            # Draw lines
            y_txt = box_y + int(12 * scale)
            for line in current_sub_lines:
                lw = draw.textlength(line, font=f_sub)
                lx = (width - lw) // 2
                draw.text((lx, y_txt), line, fill=(254, 240, 138), font=f_sub) # Warm readable light yellow
                y_txt += line_h
                
        # Convert to numpy array & PyAV frame
        frame_np = np.array(frame_im)
        vf = av.VideoFrame.from_ndarray(frame_np, format="rgb24")
        vf.pts = i
        
        for packet in v_stream.encode(vf):
            container.mux(packet)
            
        if (i + 1) % 450 == 0 or (i + 1) == total_frames:
            elapsed = time.time() - t_start
            fps_cur = (i + 1) / elapsed
            pct = ((i + 1) / total_frames) * 100.0
            print(f"Progress: {i+1}/{total_frames} frames ({pct:.1f}%) | {fps_cur:.1f} fps | Elapsed: {elapsed:.1f}s")
            
    # Flush video packets
    for packet in v_stream.encode():
        container.mux(packet)
        
    # Mux Audio Packets if stream exists
    if a_stream and audio_stereo is not None:
        print("Muxing synchronized master AAC audio stream...")
        samples_per_frame = 1024
        total_audio_samples = audio_stereo.shape[1]
        a_frame_idx = 0
        
        for offset in range(0, total_audio_samples, samples_per_frame):
            chunk = audio_stereo[:, offset:offset + samples_per_frame]
            if chunk.shape[1] < samples_per_frame:
                # Zero-pad final chunk
                pad = np.zeros((2, samples_per_frame - chunk.shape[1]), dtype=np.float32)
                chunk = np.hstack((chunk, pad))
                
            c_chunk = np.ascontiguousarray(chunk, dtype=np.float32)
            af = av.AudioFrame.from_ndarray(c_chunk, format="fltp", layout="stereo")
            af.sample_rate = 44100
            af.pts = a_frame_idx * samples_per_frame
            a_frame_idx += 1
            
            for packet in a_stream.encode(af):
                container.mux(packet)
                
        # Flush audio packets
        for packet in a_stream.encode():
            container.mux(packet)
            
    container.close()
    
    total_time = time.time() - t_start
    file_size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"Encoding Completed: {out_path} ({file_size_mb:.2f} MB, {total_time:.2f}s total)")

if __name__ == "__main__":
    # Render Master 1080p
    render_video(OUT_1080P, width=1920, height=1080, fps=30, total_duration=180.0, audio_path=MASTER_AUDIO_PATH)
    # Render Preview 720p
    render_video(OUT_720P, width=1280, height=720, fps=30, total_duration=180.0, audio_path=MASTER_AUDIO_PATH)
