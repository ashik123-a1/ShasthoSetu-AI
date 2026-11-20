# -*- coding: utf-8 -*-
"""
ShasthoSetu AI — Narration Audio & Subtitle Generator
Task ID: SHASTHOSETU-COMPETITION-VIDEO-AND-SECURITY-01
Uses Windows built-in SpeechSynthesizer (Microsoft Zira Desktop)
Generates:
1. Individual scene audio clips in docs/SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01/audio/scenes/
2. Master mixed narration audio in docs/SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01/audio/narration_final.wav (180s target)
3. Synchronized subtitles: shasthosetu_en.srt and shasthosetu_en.vtt
"""

import os
import sys
import subprocess
import wave
import soundfile as sf
import numpy as np
from pathlib import Path

WORKSPACE = Path(r"F:\Clude cccccccccccccccccccccccc\data we test")
AUDIO_DIR = WORKSPACE / "docs" / "SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01" / "audio"
SCENE_AUDIO_DIR = AUDIO_DIR / "scenes"
SUBTITLE_DIR = WORKSPACE / "docs" / "SHASTHOSETU_COMPETITION_VIDEO_SECURITY_01" / "subtitles"

SCENE_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
SUBTITLE_DIR.mkdir(parents=True, exist_ok=True)

SCENES = [
    {
        "id": 1,
        "name": "The Healthcare Crisis",
        "target_start": 0.0,
        "target_duration": 15.0,
        "text": "Across South Asia, accessing basic healthcare is an agonizing crisis. For parents watching a child suffer from severe fever and blistering rash, or families desperately seeking blood during emergency surgery, delays are fatal. Fragmented steps cost lives."
    },
    {
        "id": 2,
        "name": "Brand Reveal",
        "target_start": 15.0,
        "target_duration": 3.0,
        "text": "This is why we built ShasthoSetu AI."
    },
    {
        "id": 3,
        "name": "Platform Solution",
        "target_start": 18.0,
        "target_duration": 12.0,
        "text": "A unified, multilingual platform designed to bridge diagnostic delays, connecting patients, doctors, and responsible clinical AI into one accessible ecosystem."
    },
    {
        "id": 4,
        "name": "Patient Journey",
        "target_start": 30.0,
        "target_duration": 15.0,
        "text": "Patients instantly browse verified specialists, review qualifications, and schedule appointments in seconds, demonstrated here using completely isolated synthetic records."
    },
    {
        "id": 5,
        "name": "PCOS AI Research",
        "target_start": 45.0,
        "target_duration": 23.0,
        "text": "Our research pipeline directly targets major diagnostic bottlenecks. Model 01 uses XGBoost across eighteen clinical markers for early PCOS screening, achieving ninety-four percent accuracy on held-out research data. Model 02 employs a ResNet-18 architecture to evaluate ovarian ultrasound morphology, providing objective decision support to clinicians."
    },
    {
        "id": 6,
        "name": "Viral Rash & Pediatric Dermatology",
        "target_start": 68.0,
        "target_duration": 20.0,
        "text": "In pediatric health, distinguishing measles from common viral rashes is vital. Model 03 evaluates viral rash patterns using rigorous family-grouped splits to eliminate data leakage, while our pediatric dermatology module assists triage for vulnerable children in underserved clinics."
    },
    {
        "id": 7,
        "name": "Prescription OCR Studio Gate",
        "target_start": 88.0,
        "target_duration": 22.0,
        "text": "Handwritten prescriptions frequently cause dangerous medication toxicity. ShasthoSetu's OCR Studio extracts dosage, frequency, and warnings into structured digital records. Crucially, patient confirmation verifies text accuracy only. Activating clinical medication plans strictly requires approved doctor authorization."
    },
    {
        "id": 8,
        "name": "Bangla Voice AI",
        "target_start": 110.0,
        "target_duration": 14.0,
        "text": "To overcome literacy and language divides, Model 05 provides bilingual speech recognition, transcribing spoken Bengali into editable Unicode text so patients can review descriptions before AI processing."
    },
    {
        "id": 9,
        "name": "Clinical RAG & LangGraph Agent",
        "target_start": 124.0,
        "target_duration": 18.0,
        "text": "Our bilingual RAG engine fuses dense embeddings with BM25 keyword retrieval. Orchestrated by LangGraph, it cites verified clinical guidelines while automatically intercepting medical emergencies with immediate 999 redirection."
    },
    {
        "id": 10,
        "name": "Telemedicine Studio & Doctor eRx",
        "target_start": 142.0,
        "target_duration": 16.0,
        "text": "Doctors remain the ultimate decision-makers. Inside the live telemedicine studio, physicians conduct video consultations, review AI summaries, and issue authorized digital prescriptions with auditable consent."
    },
    {
        "id": 11,
        "name": "Blood Connect Emergency Network",
        "target_start": 158.0,
        "target_duration": 8.0,
        "text": "In critical emergencies, Blood Connect rapidly matches voluntary blood donors across Bangladesh, with strictly masked contact details."
    },
    {
        "id": 12,
        "name": "Trust, Security & Privacy",
        "target_start": 166.0,
        "target_duration": 7.0,
        "text": "Built with role-based access, Zero-PHI support barriers, and strict synthetic demo isolation."
    },
    {
        "id": 13,
        "name": "Impact & Future Roadmap",
        "target_start": 173.0,
        "target_duration": 7.0,
        "text": "ShasthoSetu AI: responsible, multilingual healthcare intelligence. Next, we expand towards formal clinical validation."
    }
]

def synthesize_scene_audio(scene, out_wav_path, rate=0):
    text_clean = scene["text"].replace('"', '""').replace("'", "''")
    ps_cmd = f"""
Add-Type -AssemblyName System.Speech;
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$synth.SelectVoice("Microsoft Zira Desktop");
$synth.Rate = {rate};
$synth.SetOutputToWaveFile("{str(out_wav_path)}");
$synth.Speak("{text_clean}");
$synth.Dispose();
"""
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], check=True, capture_output=True)

def generate_subtitles(scenes, actual_timings):
    def format_time(seconds, vtt=False):
        millis = int((seconds - int(seconds)) * 1000)
        secs = int(seconds) % 60
        mins = (int(seconds) // 60) % 60
        hours = int(seconds) // 3600
        sep = "." if vtt else ","
        return f"{hours:02d}:{mins:02d}:{secs:02d}{sep}{millis:03d}"

    srt_lines = []
    vtt_lines = ["WEBVTT\n"]

    for i, (sc, timing) in enumerate(zip(scenes, actual_timings), start=1):
        start_s = timing["start"]
        end_s = timing["end"]
        # Split text into 2 readable lines if long
        words = sc["text"].split()
        if len(words) > 10:
            mid = len(words) // 2
            sub_text = " ".join(words[:mid]) + "\n" + " ".join(words[mid:])
        else:
            sub_text = sc["text"]

        srt_lines.append(f"{i}\n{format_time(start_s)} --> {format_time(end_s)}\n{sub_text}\n")
        vtt_lines.append(f"{i}\n{format_time(start_s, vtt=True)} --> {format_time(end_s, vtt=True)}\n{sub_text}\n")

    with open(SUBTITLE_DIR / "shasthosetu_en.srt", "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))
    with open(SUBTITLE_DIR / "shasthosetu_en.vtt", "w", encoding="utf-8") as f:
        f.write("\n".join(vtt_lines))
    print("Wrote synchronized subtitles (.srt & .vtt)")

def build_narration_audio():
    sample_rate = 44100
    total_duration_sec = 180.0
    master_audio = np.zeros(int(total_duration_sec * sample_rate), dtype=np.float32)

    actual_timings = []

    for sc in SCENES:
        scene_id = sc["id"]
        out_wav = SCENE_AUDIO_DIR / f"scene_{scene_id:02d}.wav"
        
        # Adjust speech rate slightly for longer texts to fit target duration smoothly
        words_count = len(sc["text"].split())
        wps = words_count / sc["target_duration"]
        rate = 0
        if wps > 2.8:
            rate = 1
        elif wps < 2.0:
            rate = 0

        synthesize_scene_audio(sc, out_wav, rate=rate)
        data, sr = sf.read(str(out_wav))
        
        # Resample to 44100 if needed
        if sr != sample_rate:
            # Resample linearly
            num_samples = int(len(data) * sample_rate / sr)
            data = np.interp(np.linspace(0, len(data), num_samples), np.arange(len(data)), data)

        duration = len(data) / sample_rate
        print(f"Scene {scene_id:02d} ({sc['name']}): Target {sc['target_duration']}s, Audio {duration:.2f}s")

        start_time = sc["target_start"]
        start_idx = int(start_time * sample_rate)
        end_idx = min(start_idx + len(data), len(master_audio))
        
        # Insert audio clip
        clip_len = end_idx - start_idx
        master_audio[start_idx:end_idx] = data[:clip_len]

        actual_timings.append({
            "scene_id": scene_id,
            "name": sc["name"],
            "start": start_time,
            "end": start_time + (clip_len / sample_rate),
            "duration": clip_len / sample_rate
        })

    master_wav_path = AUDIO_DIR / "narration_final.wav"
    sf.write(str(master_wav_path), master_audio, sample_rate)
    print(f"Master narration audio generated: {master_wav_path} ({total_duration_sec}s, {sample_rate}Hz)")

    generate_subtitles(SCENES, actual_timings)
    return actual_timings

if __name__ == "__main__":
    build_narration_audio()
