from __future__ import annotations

import re
import unicodedata
from typing import Any

# Prompt injection patterns across English, Bengali, and Banglish
_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above|system)\s+(?:\w+\s+){0,2}(instructions|rules|prompts)", re.I),
    re.compile(r"(reveal|print|show|dump|output)\s+(your\s+)?(system\s+prompt|internal\s+prompt|system\s+instructions|hidden\s+instructions|api\s+key|password|database|sql)", re.I),
    re.compile(r"(you\s+are\s+now|act\s+as|pretend\s+to\s+be)\s+(an?\s+)?(autonomous\s+doctor|unrestricted|jailbreak|dan|admin)", re.I),
    re.compile(r"bypass\s+(safety|guardrails|medical\s+policy|verification|422)", re.I),
    re.compile(r"(prescribe|diagnose\s+me\s+definitively|issue\s+prescription|modify\s+database)", re.I),
    re.compile(r"<\s*/?\s*(system|instruction|approved_sources|user_prescription_document)\s*>", re.I),
    re.compile(r"((?:আগের|পূর্বের)\s+(?:সব|সকল)\s+নিয়ম\s+ভুলে\s+যাও|সিস্টেম\s+প্রম্পট\s+দেখাও|নিয়ম\s+অমান্য\s+করো|প্রেসক্রিপশন\s*লিখে\s*(?:দাও|দিন))", re.I),
    re.compile(r"(ager\s+shob\s+niyom\s+bhule|system\s+prompt\s+dekhao|doctor\s+chara\s+osudh\s+likhe\s+dao)", re.I),
]

# High-risk emergency red flags across English, Bengali, and Banglish
_EMERGENCY_PATTERNS = [
    re.compile(r"\b(chest\s+pain|chest\s+tightness|crushing\s+chest|heart\s+attack)\b", re.I),
    re.compile(r"\b(can'?t\s+breathe|cannot\s+breathe|severe\s+difficulty\s+breathing|shortness\s+of\s+breath\s+at\s+rest|gasping|blue\s+lips)\b", re.I),
    re.compile(r"\b(unconscious|unresponsive|fainted|seizure|convulsion|convulsions|fitting)\b", re.I),
    re.compile(r"\b(stroke|face\s+drooping|slurred\s+speech|one\s+side\s+weakness)\b", re.I),
    re.compile(r"\b(heavy\s+bleeding|uncontrolled\s+bleeding|suicidal|overdose|poisoning|anaphylaxis|swollen\s+tongue|throat\s+closing)\b", re.I),
    re.compile(r"\b(non-?blanching|purple\s+spots|petechiae)\b", re.I),
    re.compile(r"(বুকে(?:\s+\S+){0,2}\s*ব্যথা|বুক(?:\s+\S+){0,2}\s*ব্যথা|শ্বাস\s*কষ্ট|শ্বাসকষ্ট|(?:নিঃ)?শ্বাস\s*নিতে\s*(?:কষ্ট|পারছে\s*না|পারছি\s*না)|অজ্ঞান|খিঁচুনি|স্ট্রোক|অতিরিক্ত\s*রক্তক্ষরণ|গলা\s*ফুলে\s*যাচ্ছে)", re.I),
    re.compile(r"\b(buke\s+byatha|buke\s+betha|shash\s*koshto|shashkoshto|oggyan|khichuni)\b", re.I),
]

_INFANT_FEVER_RE = re.compile(r"(newborn|infant|baby|শিশু|বাচ্চা|baccha).{0,40}?(month|weeks|দিন|মাস|mas).{0,30}?(fever|জ্বর|jor|100\.4|38)", re.I)

# Direct clinical-prescription / diagnosis solicitation (non-emergency policy boundary)
_UNSAFE_DOSAGE_REQUEST_RE = re.compile(
    r"(tell\s+me\s+exact\s+dose|how\s+many\s+mg\s+should\s+i\s+take|write\s+(a\s+)?prescription\s+for|diagnose\s+my\s+(rash|pcos|illness)|confirm\s+if\s+this\s+prescription\s+is\s+safe\s+without\s+doctor|"
    r"কত\s*মিলিগ্রাম\s*খাব|আমাকে\s*প্রেসক্রিপশন\s*লিখে\s*দিন|রোগ\s*নির্ণয়\s*করে\s*দিন|koto\s+mg\s+khabo|osudh\s+likhe\s+den)",
    re.I,
)

# Output safety patterns (if LLM tries to fabricate a definitive diagnosis or specific new prescription)
_OUTPUT_UNSAFE_RE = [
    re.compile(r"\b(you\s+definitely\s+have|i\s+diagnose\s+you\s+with|i\s+prescribe\s+you|take\s+\d+\s*mg\s+of\s+[a-z]+\s+twice\s+daily)\b", re.I),
    re.compile(r"(আপনার\s+নিশ্চিতভাবে\s+.{2,25}\s+রোগ\s+হয়েছে|আমি\s+আপনাকে\s+প্রেসক্রিপশন\s+দিচ্ছি)", re.I),
]


def detect_script_language(text: str) -> str:
    """Classify query as 'bn', 'en', 'banglish', or 'mixed'."""
    t = (text or "").strip()
    if not t:
        return "en"
    bn_chars = sum(1 for c in t if 0x0980 <= ord(c) <= 0x09FF)
    ascii_letters = sum(1 for c in t if ("a" <= c <= "z") or ("A" <= c <= "Z"))
    if bn_chars > 0 and ascii_letters > 8:
        # Mixed Bengali script + substantial English/Latin text
        return "mixed"
    if bn_chars >= 3:
        return "bn"

    banglish_markers = {
        "ki", "kono", "keno", "kivabe", "kothay", "amar", "apnar", "tumi", "amake",
        "khaben", "khawa", "korte", "hobe", "ache", "ase", "nai", "lagbe", "parbo",
        "er", "ta", "te", "holo", "mane", "bujhan", "osudh", "daktar", "dorkar",
        "jor", "byatha", "betha", "shash", "khichuni", "din", "bar", "sokale", "rate",
        "khabar", "age", "pore", "por", "korben", "dekha", "jacche", "koren", "bolo",
    }
    words = set(re.findall(r"[a-z]+", t.lower()))
    hits = words.intersection(banglish_markers)
    if len(hits) >= 2 or (len(hits) == 1 and len(words) <= 6):
        return "banglish"
    return "en"


def sanitize_untrusted_text(raw_text: str, max_chars: int = 8000) -> tuple[str, list[str]]:
    """Strip HTML tags, control chars, and neutralize embedded prompt-injection lines in retrieved or OCR text."""
    flags: list[str] = []
    txt = unicodedata.normalize("NFC", raw_text or "")
    txt = re.sub(r"<[^>]{1,120}>", " ", txt)
    txt = "".join(ch for ch in txt if ch in ("\n", "\t", "\r") or ord(ch) >= 32)
    clean_lines: list[str] = []
    for line in txt.splitlines():
        if any(pat.search(line) for pat in _INJECTION_PATTERNS):
            flags.append("DOCUMENT_INJECTION_LINE_STRIPPED")
            continue
        clean_lines.append(line)
    cleaned = "\n".join(clean_lines).strip()
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars] + "\n...[truncated for context bound]"
        flags.append("CONTEXT_TRUNCATED")
    return cleaned, flags


def inspect_user_query(query: str) -> dict[str, Any]:
    """Run prompt-injection, emergency red-flag, and unsafe-prescribing checks before retrieval/LLM."""
    q = (query or "").strip()
    lang_detected = detect_script_language(q)
    flags: list[str] = []

    is_injection = any(pat.search(q) for pat in _INJECTION_PATTERNS)
    if is_injection:
        flags.append("PROMPT_INJECTION_BLOCKED")

    is_emergency = any(pat.search(q) for pat in _EMERGENCY_PATTERNS) or bool(_INFANT_FEVER_RE.search(q))
    if is_emergency:
        flags.append("EMERGENCY_RED_FLAG")

    asks_dosage_or_rx = bool(_UNSAFE_DOSAGE_REQUEST_RE.search(q))
    if asks_dosage_or_rx:
        flags.append("CLINICAL_BOUNDARY_NOTICE")

    return {
        "language_detected": lang_detected,
        "is_injection": is_injection,
        "is_emergency": is_emergency,
        "asks_dosage_or_rx": asks_dosage_or_rx,
        "flags": flags,
    }


def validate_llm_response(answer_text: str, response_lang: str) -> tuple[str, list[str]]:
    """Post-generation policy safeguard ensuring no autonomous diagnosing or dosing slips through."""
    flags: list[str] = []
    out = (answer_text or "").strip()
    for pat in _OUTPUT_UNSAFE_RE:
        if pat.search(out):
            flags.append("RESPONSE_SAFETY_OVERRIDE")
            if response_lang == "bn":
                return (
                    "আমি সরাসরি কোনো রোগ নির্ণয় বা নির্দিষ্ট ওষুধের ডোজ/প্রেসক্রিপশন দিতে পারি না। "
                    "নিরাপদ মূল্যায়নের জন্য অনুগ্রহ করে অনুমোদিত চিকিৎসকের সাথে পরামর্শ করুন।",
                    flags,
                )
            return (
                "I cannot provide a definitive medical diagnosis or prescribe/adjust medication dosages. "
                "Please consult an approved physician for personalized clinical evaluation.",
                flags,
            )
    return out, flags


def redact_for_audit(text: str) -> dict[str, Any]:
    """Never store raw patient messages, voice transcripts, or prescription PHI in audit_logs."""
    return {
        "char_length": len(text or ""),
        "script_type": detect_script_language(text or ""),
        "phi_redacted": True,
    }
