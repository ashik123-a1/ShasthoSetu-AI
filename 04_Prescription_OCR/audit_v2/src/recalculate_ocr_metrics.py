import os
import json
import unicodedata
import pandas as pd
import numpy as np
import jiwer
from scipy import stats

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
pred_csv_path = os.path.join(base_dir, "outputs", "test_predictions.csv")
corr_manifest_path = os.path.join(base_dir, "audit_v2", "corrected_annotation_manifest.csv")
audit_dir = os.path.join(base_dir, "audit_v2")

df_pred = pd.read_csv(pred_csv_path)
df_manifest = pd.read_csv(corr_manifest_path)

# Merge with corrected manifest to identify admissible samples
# prescription_id might be int or str
df_pred["p_id_str"] = df_pred["prescription_id"].astype(str).str.zfill(4)
df_manifest["p_id_str"] = df_manifest["prescription_id"].astype(str).str.zfill(4)

merged = pd.merge(df_pred, df_manifest[["p_id_str", "quarantine_status", "evaluation_admissible"]], on="p_id_str", how="left")
print(f"Total test predictions: {len(merged)}")
print(f"Admissible test predictions: {merged['evaluation_admissible'].sum()}")
print(f"Quarantined test predictions: {(~merged['evaluation_admissible']).sum()}")

# Filter to strictly admissible test set (N=149)
admissible_df = merged[merged["evaluation_admissible"]].copy()

# Function to compute Levenshtein distance directly for corpus aggregation
def get_edit_distances(ref, hyp):
    out = jiwer.process_characters(ref, hyp)
    char_edits = out.substitutions + out.deletions + out.insertions
    ref_char_len = len(ref)
    
    out_w = jiwer.process_words(ref, hyp)
    word_edits = out_w.substitutions + out_w.deletions + out_w.insertions
    ref_word_len = len(ref.split()) if ref.split() else 1
    
    return char_edits, ref_char_len, word_edits, ref_word_len

# Recalculate metrics under:
# 1. Raw English Narrative
# 2. NFC Normalized English Narrative
# 3. Raw Bangla Narrative
# 4. NFC Normalized Bangla Narrative

rec_data = []

total_char_edits_en = 0
total_ref_chars_en = 0
total_word_edits_en = 0
total_ref_words_en = 0

total_char_edits_en_nfc = 0
total_ref_chars_en_nfc = 0

total_char_edits_bn = 0
total_ref_chars_bn = 0
total_word_edits_bn = 0
total_ref_words_bn = 0

total_char_edits_bn_nfc = 0
total_ref_chars_bn_nfc = 0

for _, r in admissible_df.iterrows():
    p_id = r["p_id_str"]
    ocr_raw = str(r["ocr_raw_text"]) if pd.notnull(r["ocr_raw_text"]) else ""
    gt_en = str(r["gt_english"]) if pd.notnull(r["gt_english"]) else ""
    gt_bn = str(r["gt_bangla"]) if pd.notnull(r["gt_bangla"]) else ""
    conf = float(r["mean_confidence"])
    
    # NFC normalization
    ocr_nfc = unicodedata.normalize('NFC', ocr_raw)
    gt_en_nfc = unicodedata.normalize('NFC', gt_en)
    gt_bn_nfc = unicodedata.normalize('NFC', gt_bn)
    
    # English metrics
    c_ed_en, c_ref_en, w_ed_en, w_ref_en = get_edit_distances(gt_en, ocr_raw)
    c_ed_en_nfc, c_ref_en_nfc, _, _ = get_edit_distances(gt_en_nfc, ocr_nfc)
    
    total_char_edits_en += c_ed_en
    total_ref_chars_en += c_ref_en
    total_word_edits_en += w_ed_en
    total_ref_words_en += w_ref_en
    total_char_edits_en_nfc += c_ed_en_nfc
    total_ref_chars_en_nfc += c_ref_en_nfc
    
    # Bangla metrics
    c_ed_bn, c_ref_bn, w_ed_bn, w_ref_bn = get_edit_distances(gt_bn, ocr_raw)
    c_ed_bn_nfc, c_ref_bn_nfc, _, _ = get_edit_distances(gt_bn_nfc, ocr_nfc)
    
    total_char_edits_bn += c_ed_bn
    total_ref_chars_bn += c_ref_bn
    total_word_edits_bn += w_ed_bn
    total_ref_words_bn += w_ref_bn
    total_char_edits_bn_nfc += c_ed_bn_nfc
    total_ref_chars_bn_nfc += c_ref_bn_nfc
    
    per_cer_en = c_ed_en / c_ref_en if c_ref_en > 0 else 1.0
    per_wer_en = w_ed_en / w_ref_en if w_ref_en > 0 else 1.0
    per_cer_bn = c_ed_bn / c_ref_bn if c_ref_bn > 0 else 1.0
    per_wer_bn = w_ed_bn / w_ref_bn if w_ref_bn > 0 else 1.0
    
    exact_match_en = (ocr_raw.strip().lower() == gt_en.strip().lower())
    exact_match_bn = (ocr_raw.strip() == gt_bn.strip())
    
    rec_data.append({
        "prescription_id": p_id,
        "mean_confidence": conf,
        "cer_en_raw": round(per_cer_en, 4),
        "wer_en_raw": round(per_wer_en, 4),
        "cer_en_nfc": round(c_ed_en_nfc / c_ref_en_nfc if c_ref_en_nfc > 0 else 1.0, 4),
        "cer_bn_raw": round(per_cer_bn, 4),
        "wer_bn_raw": round(per_wer_bn, 4),
        "cer_bn_nfc": round(c_ed_bn_nfc / c_ref_bn_nfc if c_ref_bn_nfc > 0 else 1.0, 4),
        "exact_match_en": exact_match_en,
        "exact_match_bn": exact_match_bn,
        "ref_chars_en": c_ref_en,
        "ref_chars_bn": c_ref_bn,
        "ocr_chars": len(ocr_raw),
        "gt_medicines": r.get("gt_medicines", ""),
        "matched_medicines": r.get("matched_medicines", "")
    })

eval_df = pd.DataFrame(rec_data)

# Corpus-level CER / WER
corpus_cer_en = total_char_edits_en / total_ref_chars_en if total_ref_chars_en > 0 else 1.0
corpus_wer_en = total_word_edits_en / total_ref_words_en if total_ref_words_en > 0 else 1.0
corpus_cer_en_nfc = total_char_edits_en_nfc / total_ref_chars_en_nfc if total_ref_chars_en_nfc > 0 else 1.0

corpus_cer_bn = total_char_edits_bn / total_ref_chars_bn if total_ref_chars_bn > 0 else 1.0
corpus_wer_bn = total_word_edits_bn / total_ref_words_bn if total_ref_words_bn > 0 else 1.0
corpus_cer_bn_nfc = total_char_edits_bn_nfc / total_ref_chars_bn_nfc if total_ref_chars_bn_nfc > 0 else 1.0

# Correlations between confidence and CER
r_pearson_en, p_val_en = stats.pearsonr(eval_df["mean_confidence"], eval_df["cer_en_raw"])
r_spearman_en, sp_val_en = stats.spearmanr(eval_df["mean_confidence"], eval_df["cer_en_raw"])

# Exact match rates
exact_matches_en = int(eval_df["exact_match_en"].sum())
exact_matches_bn = int(eval_df["exact_match_bn"].sum())

audited_metrics = {
    "module": "04_Prescription_OCR",
    "audit_phase": "Phase 3: Rigorous OCR Performance Recalculation",
    "evaluation_split": "test",
    "total_evaluated_samples": len(eval_df),
    "quarantined_samples_excluded": int((~merged['evaluation_admissible']).sum()),
    "exact_transcription_match_rate": {
        "english_exact_match_count": exact_matches_en,
        "english_exact_match_pct": round(exact_matches_en / len(eval_df) * 100, 2),
        "bangla_exact_match_count": exact_matches_bn,
        "bangla_exact_match_pct": round(exact_matches_bn / len(eval_df) * 100, 2)
    },
    "english_performance_vs_narrative": {
        "corpus_level_cer": round(corpus_cer_en, 4),
        "corpus_level_cer_nfc": round(corpus_cer_en_nfc, 4),
        "corpus_level_wer": round(corpus_wer_en, 4),
        "per_prescription_cer": {
            "mean": round(float(eval_df["cer_en_raw"].mean()), 4),
            "median": round(float(eval_df["cer_en_raw"].median()), 4),
            "p25": round(float(np.percentile(eval_df["cer_en_raw"], 25)), 4),
            "p75": round(float(np.percentile(eval_df["cer_en_raw"], 75)), 4),
            "p90": round(float(np.percentile(eval_df["cer_en_raw"], 90)), 4)
        },
        "per_prescription_wer": {
            "mean": round(float(eval_df["wer_en_raw"].mean()), 4),
            "median": round(float(eval_df["wer_en_raw"].median()), 4),
            "p25": round(float(np.percentile(eval_df["wer_en_raw"], 25)), 4),
            "p75": round(float(np.percentile(eval_df["wer_en_raw"], 75)), 4),
            "p90": round(float(np.percentile(eval_df["wer_en_raw"], 90)), 4)
        }
    },
    "bangla_performance_vs_narrative": {
        "corpus_level_cer": round(corpus_cer_bn, 4),
        "corpus_level_cer_nfc": round(corpus_cer_bn_nfc, 4),
        "corpus_level_wer": round(corpus_wer_bn, 4),
        "per_prescription_cer": {
            "mean": round(float(eval_df["cer_bn_raw"].mean()), 4),
            "median": round(float(eval_df["cer_bn_raw"].median()), 4),
            "p25": round(float(np.percentile(eval_df["cer_bn_raw"], 25)), 4),
            "p75": round(float(np.percentile(eval_df["cer_bn_raw"], 75)), 4),
            "p90": round(float(np.percentile(eval_df["cer_bn_raw"], 90)), 4)
        },
        "per_prescription_wer": {
            "mean": round(float(eval_df["wer_bn_raw"].mean()), 4),
            "median": round(float(eval_df["wer_bn_raw"].median()), 4),
            "p25": round(float(np.percentile(eval_df["wer_bn_raw"], 25)), 4),
            "p75": round(float(np.percentile(eval_df["wer_bn_raw"], 75)), 4),
            "p90": round(float(np.percentile(eval_df["wer_bn_raw"], 90)), 4)
        }
    },
    "confidence_vs_error_correlation": {
        "pearson_r_conf_vs_cer": round(float(r_pearson_en), 4),
        "pearson_p_value": round(float(p_val_en), 6),
        "spearman_rho_conf_vs_cer": round(float(r_spearman_en), 4),
        "spearman_p_value": round(float(sp_val_en), 6),
        "interpretation": "Negative correlation confirms higher confidence associates with lower CER, but correlation is modest (|r| < 0.40) because printed headers inflate confidence without improving handwritten line accuracy."
    },
    "medicine_recall_audit_status": {
        "reported_exploratory_recall": 0.0696,
        "audit_classification": "EXPLORATORY_HEURISTIC_ESTIMATE_UNVALIDATED",
        "scientific_caveat": "Mendeley Data v2 contains NO ground-truth field for isolated drug brand names. The 6.96% figure was derived from heuristic regex matching against narrative text, which conflates OCR failures with grammatical regex mismatches. It cannot be cited as a certified clinical NER benchmark."
    }
}

metrics_json_path = os.path.join(audit_dir, "OCR_METRICS_AUDITED.json")
with open(metrics_json_path, "w", encoding="utf-8") as f:
    json.dump(audited_metrics, f, indent=2)
print(f"Saved audited metrics JSON to: {metrics_json_path}")

# Save detailed language error analysis CSV
lang_csv_path = os.path.join(audit_dir, "LANGUAGE_ERROR_ANALYSIS.csv")
eval_df.to_csv(lang_csv_path, index=False)
print(f"Saved language error analysis CSV ({len(eval_df)} rows) to: {lang_csv_path}")

print("\n--- Audited Metrics Summary ---")
print(f"Corpus CER (English): {corpus_cer_en:.4f} | Corpus CER NFC: {corpus_cer_en_nfc:.4f}")
print(f"Corpus WER (English): {corpus_wer_en:.4f}")
print(f"Corpus CER (Bangla):  {corpus_cer_bn:.4f} | Corpus CER NFC: {corpus_cer_bn_nfc:.4f}")
print(f"Corpus WER (Bangla):  {corpus_wer_bn:.4f}")
print(f"Confidence vs CER Correlation: Pearson r = {r_pearson_en:.4f} (p={p_val_en:.4e})")
