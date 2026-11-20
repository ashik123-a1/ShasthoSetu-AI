import jiwer

ref = "Histal 4 mg tablet should be taken one tablet at night for 21 days."
hyp = "Histal 4 mg tab should be taken 1 tab at night"

wer = jiwer.wer(ref, hyp)
cer = jiwer.cer(ref, hyp)
print(f"Sample WER: {wer:.4f}, CER: {cer:.4f}")
