import json
from pathlib import Path

p = Path(r"F:\Clude cccccccccccccccccccccccc\data we test\docs\COMP_FULL_MARKS_IMPLEMENTATION_05\rag_benchmark_comparison.json")
d = json.loads(p.read_text(encoding="utf-8"))

for q in d["query_evaluations"]:
    if q["type"] == "MEDICAL":
        h_rank = q["modes"]["baseline_hybrid"]["rank"]
        c_rank = q["modes"]["combined_contextual_semantic"]["rank"]
        if h_rank != c_rank:
            print(f"Difference on {q['id']}: hybrid rank={h_rank}, combo rank={c_rank}, target={q['target']}")
            print("  hybrid top slugs:", q["modes"]["baseline_hybrid"]["top_5_slugs"])
            print("  combo top slugs:", q["modes"]["combined_contextual_semantic"]["top_5_slugs"])
