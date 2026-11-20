import os
import sys
import unittest
import json
import torch
import soundfile as sf
import numpy as np

# Setup paths
BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test"
PATCH_V1_DIR = os.path.join(BASE_DIR, "04_Prescription_OCR", "final_integration", "patch_v1")
SRC_DIR = os.path.join(PATCH_V1_DIR, "src")
sys.path.insert(0, SRC_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "demo"))

from safety_gate_v2 import (
    PrescriptionDocument,
    UnverifiedMedicationCandidate,
    MedicationReminderService,
    ExecutionMode,
    ClinicalSafetyViolationError,
    validate_file_upload,
    sanitize_log_message
)

class TestBilingualIntegration(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.device = "cuda:0" if torch.cuda.is_available() else "cpu"
        cls.bilingual_voice_dir = os.path.join(BASE_DIR, "05_Bangla_Voice_AI", "data", "bilingual_test")
        cls.ocr_img_path = os.path.join(BASE_DIR, "04_Prescription_OCR", "data", "raw", "extracted", "images", "Prescription_ images.jpg", "0052.jpg")

    def test_01_voice_auto_detect_lid(self):
        """Test 1: Verify Whisper Auto-Detect correctly identifies <|bn|> and <|en|>."""
        from transformers import WhisperProcessor, WhisperForConditionalGeneration
        
        processor = WhisperProcessor.from_pretrained("openai/whisper-tiny")
        model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-tiny").to(self.device)
        model.eval()
        
        # Test English audio
        en_wav = os.path.join(self.bilingual_voice_dir, "en_clinical_01.wav")
        self.assertTrue(os.path.exists(en_wav), f"Missing: {en_wav}")
        audio_en, sr = sf.read(en_wav)
        inputs_en = processor(audio_en, sampling_rate=sr, return_tensors="pt").input_features.to(self.device)
        
        with torch.no_grad():
            gen_en = model.generate(inputs_en, task="transcribe", return_dict_in_generate=True, max_new_tokens=64)
        toks_en = processor.tokenizer.convert_ids_to_tokens(gen_en.sequences[0][:5])
        self.assertEqual(toks_en[1], "<|en|>", f"Expected <|en|> for English audio, got {toks_en[1]}")
        
        # Test Bengali audio
        bn_wav = os.path.join(self.bilingual_voice_dir, "bn_sample_01.wav")
        self.assertTrue(os.path.exists(bn_wav), f"Missing: {bn_wav}")
        audio_bn, sr = sf.read(bn_wav)
        inputs_bn = processor(audio_bn, sampling_rate=sr, return_tensors="pt").input_features.to(self.device)
        
        with torch.no_grad():
            gen_bn = model.generate(inputs_bn, task="transcribe", return_dict_in_generate=True, max_new_tokens=64)
        toks_bn = processor.tokenizer.convert_ids_to_tokens(gen_bn.sequences[0][:5])
        self.assertEqual(toks_bn[1], "<|bn|>", f"Expected <|bn|> for Bengali audio, got {toks_bn[1]}")

    def test_02_voice_medical_term_preservation(self):
        """Test 2: Verify English medical terms are transcribed and preserved accurately."""
        from transformers import WhisperProcessor, WhisperForConditionalGeneration
        
        processor = WhisperProcessor.from_pretrained("openai/whisper-tiny")
        model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-tiny").to(self.device)
        model.eval()
        
        en_wav = os.path.join(self.bilingual_voice_dir, "en_clinical_01.wav")
        audio_en, sr = sf.read(en_wav)
        inputs_en = processor(audio_en, sampling_rate=sr, return_tensors="pt").input_features.to(self.device)
        
        with torch.no_grad():
            gen_en = model.generate(inputs_en, task="transcribe", max_new_tokens=64)
        pred_text = processor.batch_decode(gen_en, skip_special_tokens=True)[0].lower()
        
        # Check vital medical terms
        self.assertIn("blood pressure", pred_text)
        self.assertIn("120", pred_text)
        self.assertIn("80", pred_text)

    def test_03_ocr_bilingual_script_integrity(self):
        """Test 3: Verify EasyOCR captures both Bangla Unicode and English text on real prescription."""
        import easyocr
        reader = easyocr.Reader(['bn', 'en'], gpu=(self.device != "cpu"))
        
        self.assertTrue(os.path.exists(self.ocr_img_path), f"Missing: {self.ocr_img_path}")
        results = reader.readtext(self.ocr_img_path)
        all_text = " ".join([r[1] for r in results])
        
        # Verify Bangla presence
        has_bangla = any(0x0980 <= ord(c) <= 0x09FF for c in all_text)
        self.assertTrue(has_bangla, "No Bengali Unicode detected in 0052.jpg")
        self.assertIn("বাংলাদেশ", all_text)
        
        # Verify English presence
        has_english = any(c.isascii() and c.isalpha() for c in all_text)
        self.assertTrue(has_english, "No English ASCII detected in 0052.jpg")
        self.assertIn("Roxim", all_text)
        self.assertIn("Cap", all_text)

    def test_04_ui_i18n_dictionary_completeness(self):
        """Test 4: Verify UI i18n dictionary has complete translations for both English and Bangla."""
        from app import I18N
        
        self.assertIn("English", I18N)
        self.assertIn("বাংলা", I18N)
        
        en_keys = set(I18N["English"].keys())
        bn_keys = set(I18N["বাংলা"].keys())
        
        # Check no missing keys between languages
        diff = en_keys.symmetric_difference(bn_keys)
        self.assertEqual(len(diff), 0, f"Mismatched i18n keys: {diff}")
        
        # Check all values are non-empty strings
        for k in en_keys:
            self.assertTrue(len(I18N["English"][k].strip()) > 0)
            self.assertTrue(len(I18N["বাংলা"][k].strip()) > 0)

    def test_05_safety_gate_persistence_on_bilingual_input(self):
        """Test 5: Verify safety gate strictly locks reminders even with bilingual input."""
        # Mixed Bangla and English candidate
        cand = UnverifiedMedicationCandidate(
            candidate_id=1,
            raw_text="Cap. Roxim 400mg ১+০+১ (সকাল-রাত)",
            medicine_name="Roxim",
            strength="400mg",
            frequency="TDS after meal",
            duration="৭ দিন (7 days)",
            confidence=0.88
        )
        doc = PrescriptionDocument(
            prescription_id="BILINGUAL_TEST_01",
            filename="0052.jpg",
            ocr_raw_text="Cap. Roxim 400mg",
            mean_confidence=0.88,
            candidates=[cand],
            mode=ExecutionMode.RESEARCH_DEMO
        )
        
        # Simulate review
        doc.simulate_human_review(
            reviewer_id="SIM_PHARMACIST_DEMO_01",
            reviewer_name="Demo Pharmacist",
            corrected_orders=[{
                "medicine_name": "Cap. Roxim 400mg",
                "frequency": "১+০+১ (সকাল-রাত)",
                "duration": "৭ দিন"
            }],
            legal_declaration_signed=True
        )
        self.assertEqual(doc.verification_status, "SIMULATED_REVIEW_ONLY")
        
        # Attempt direct reminder scheduling -> MUST raise ClinicalSafetyViolationError
        service = MedicationReminderService(mode=ExecutionMode.RESEARCH_DEMO)
        with self.assertRaises(ClinicalSafetyViolationError):
            service.create_actionable_schedule(doc)

    def test_06_utf8_encoding_and_digit_preservation(self):
        """Test 6: Verify UTF-8 preservation for both Bangla numerals and English text."""
        raw_sig = "Tab Napa Extra 500mg: ১+০+১ খাবার পর"
        doc_dict = {
            "sig": raw_sig,
            "bengali_digits": "১, ২, ৩",
            "english_digits": "1, 2, 3"
        }
        encoded = json.dumps(doc_dict, ensure_ascii=False)
        decoded = json.loads(encoded)
        
        self.assertEqual(decoded["sig"], raw_sig)
        self.assertEqual(decoded["bengali_digits"], "১, ২, ৩")
        self.assertEqual(decoded["english_digits"], "1, 2, 3")

if __name__ == "__main__":
    unittest.main()
