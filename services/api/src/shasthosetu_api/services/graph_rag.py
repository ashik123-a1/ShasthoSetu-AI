"""
ShasthoSetu AI — Clinical Knowledge Graph & Graph RAG Service
Implements entity-relation-entity knowledge graph traversal for multi-hop clinical reasoning.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


@dataclass
class GraphEntity:
    id: str
    name_en: str
    name_bn: str
    entity_type: str  # SYMPTOM, CONDITION, GUIDELINE, DRUG, CONTRAINDICATION, DEPARTMENT
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class GraphTriple:
    source: str
    relation: str
    target: str
    evidence_score: float = 1.0


# Authoritative Clinical Knowledge Graph Triples grounded in DGHS Bangladesh & WHO
CLINICAL_ENTITIES: dict[str, GraphEntity] = {
    # Conditions
    "cond_dengue": GraphEntity(
        id="cond_dengue",
        name_en="Dengue Fever",
        name_bn="ডেঙ্গু জ্বর",
        entity_type="CONDITION",
        metadata={"icd11": "1D20", "warning_signs": ["persistent_vomiting", "severe_abdominal_pain", "mucosal_bleeding"]}
    ),
    "cond_ami": GraphEntity(
        id="cond_ami",
        name_en="Acute Myocardial Infarction",
        name_bn="তীব্র হৃদরোগ / হার্ট অ্যাটাক",
        entity_type="CONDITION",
        metadata={"icd11": "BA41", "emergency_level": "CODE_999"}
    ),
    "cond_pcos": GraphEntity(
        id="cond_pcos",
        name_en="Polycystic Ovary Syndrome (PCOS)",
        name_bn="পলিসিস্টিক ওভারি সিন্ড্রোম (পিসিওএস)",
        entity_type="CONDITION",
        metadata={"rotterdam_criteria": True, "department": "dept_gyn"}
    ),
    "cond_pediatric_fever": GraphEntity(
        id="cond_pediatric_fever",
        name_en="Pediatric Febrile Illness",
        name_bn="শিশুদের তীব্র জ্বর",
        entity_type="CONDITION",
        metadata={"pediatric_n22": True, "department": "dept_ped"}
    ),

    # Symptoms
    "sym_retro_orbital_pain": GraphEntity(
        id="sym_retro_orbital_pain",
        name_en="Retro-orbital Eye Pain",
        name_bn="চোখের পেছনে তীব্র ব্যথা",
        entity_type="SYMPTOM"
    ),
    "sym_chest_pressure": GraphEntity(
        id="sym_chest_pressure",
        name_en="Crushing Chest Pressure",
        name_bn="বুকে তীব্র ভারী চাপ ও ব্যথা",
        entity_type="SYMPTOM"
    ),
    "sym_irregular_menses": GraphEntity(
        id="sym_irregular_menses",
        name_en="Irregular Menstrual Cycles",
        name_bn="অনিয়মিত মাসিক চক্র",
        entity_type="SYMPTOM"
    ),

    # Guidelines
    "guide_dghs_dengue_2024": GraphEntity(
        id="guide_dghs_dengue_2024",
        name_en="DGHS National Dengue Clinical Management Guideline 6th Edition",
        name_bn="স্বাস্থ্য অধিদপ্তর জাতীয় ডেঙ্গু ক্লিনিক্যাল গাইডলাইন",
        entity_type="GUIDELINE"
    ),

    # Drugs & Safe Treatments
    "drug_paracetamol": GraphEntity(
        id="drug_paracetamol",
        name_en="Paracetamol (Acetaminophen)",
        name_bn="প্যারাসিটামল",
        entity_type="DRUG",
        metadata={"max_adult_daily_g": 4.0}
    ),
    "drug_ors": GraphEntity(
        id="drug_ors",
        name_en="Oral Rehydration Salt (ORS)",
        name_bn="খাবার স্যালাইন (ওআরএস)",
        entity_type="DRUG"
    ),

    # Contraindications
    "contra_nsaids": GraphEntity(
        id="contra_nsaids",
        name_en="Aspirin and NSAIDs (Ibuprofen, Naproxen, Diclofenac)",
        name_bn="অ্যাসপিরিন ও এনএসএআইডি (রক্তক্ষরণের ঝুঁকি বাড়ায়)",
        entity_type="CONTRAINDICATION"
    ),

    # Departments
    "dept_cardio": GraphEntity(
        id="dept_cardio",
        name_en="Cardiology Department",
        name_bn="কার্ডিওলজি / হৃদরোগ বিভাগ",
        entity_type="DEPARTMENT"
    ),
    "dept_gyn": GraphEntity(
        id="dept_gyn",
        name_en="Gynecology & Obstetrics",
        name_bn="স্ত্রী ও প্রসূতিরোগ বিভাগ",
        entity_type="DEPARTMENT"
    ),
    "dept_ped": GraphEntity(
        id="dept_ped",
        name_en="Pediatrics & Child Care",
        name_bn="শিশু ও কিশোর রোগ বিভাগ",
        entity_type="DEPARTMENT"
    )
}

CLINICAL_TRIPLES: list[GraphTriple] = [
    # Dengue Relations
    GraphTriple("sym_retro_orbital_pain", "INDICATES_POSSIBLE", "cond_dengue", 0.95),
    GraphTriple("cond_dengue", "MANAGED_UNDER", "guide_dghs_dengue_2024", 1.0),
    GraphTriple("cond_dengue", "FIRST_LINE_RECOMMENDED", "drug_paracetamol", 0.98),
    GraphTriple("cond_dengue", "HYDRATION_RECOMMENDED", "drug_ors", 0.95),
    GraphTriple("cond_dengue", "STRICTLY_CONTRAINDICATED", "contra_nsaids", 1.0),

    # Cardiac Emergency
    GraphTriple("sym_chest_pressure", "INDICATES_EMERGENCY", "cond_ami", 1.0),
    GraphTriple("cond_ami", "REQUIRES_DEPARTMENT", "dept_cardio", 1.0),

    # PCOS
    GraphTriple("sym_irregular_menses", "ASSOCIATED_WITH", "cond_pcos", 0.88),
    GraphTriple("cond_pcos", "REQUIRES_DEPARTMENT", "dept_gyn", 0.95),

    # Pediatrics
    GraphTriple("cond_pediatric_fever", "REQUIRES_DEPARTMENT", "dept_ped", 1.0),
    GraphTriple("cond_pediatric_fever", "STRICTLY_CONTRAINDICATED", "contra_nsaids", 1.0),
]


class ClinicalKnowledgeGraph:
    def __init__(self) -> None:
        self.entities = CLINICAL_ENTITIES
        self.triples = CLINICAL_TRIPLES

    def traverse_query(self, query: str) -> list[dict[str, Any]]:
        """
        Traverses clinical knowledge graph for matching symptoms or conditions,
        returning 1-hop and 2-hop connected relations.
        """
        query_lower = query.lower()
        matched_entity_ids: set[str] = set()

        for ent_id, ent in self.entities.items():
            if ent.name_en.lower() in query_lower or ent.name_bn in query_lower:
                matched_entity_ids.add(ent_id)

        # Keyword heuristics for Bengali/English colloquial terms
        if any(term in query_lower for term in ["চোখে ব্যথা", "চোখের পেছনে", "retro-orbital", "dengue", "ডেঙ্গু"]):
            matched_entity_ids.add("sym_retro_orbital_pain")
            matched_entity_ids.add("cond_dengue")
        if any(term in query_lower for term in ["বুকে চাপ", "chest pain", "heart", "হার্ট"]):
            matched_entity_ids.add("sym_chest_pressure")
            matched_entity_ids.add("cond_ami")
        if any(term in query_lower for term in ["মাসিক", "ঋতুস্রাব", "menses", "pcos", "পিসিওএস"]):
            matched_entity_ids.add("sym_irregular_menses")
            matched_entity_ids.add("cond_pcos")

        results: list[dict[str, Any]] = []
        visited_triples: set[tuple[str, str, str]] = set()

        # 1-Hop & 2-Hop multi-hop expansion
        hop1_targets: set[str] = set()
        for t in self.triples:
            if t.source in matched_entity_ids or t.target in matched_entity_ids:
                triple_key = (t.source, t.relation, t.target)
                if triple_key not in visited_triples:
                    visited_triples.add(triple_key)
                    s_ent = self.entities.get(t.source)
                    tgt_ent = self.entities.get(t.target)
                    results.append({
                        "source_id": t.source,
                        "source_name": s_ent.name_en if s_ent else t.source,
                        "relation": t.relation,
                        "target_id": t.target,
                        "target_name": tgt_ent.name_en if tgt_ent else t.target,
                        "target_name_bn": tgt_ent.name_bn if tgt_ent else "",
                        "evidence_score": t.evidence_score,
                        "hop": 1,
                    })
                    hop1_targets.add(t.target)
                    hop1_targets.add(t.source)

        # 2-Hop expansion
        for t in self.triples:
            if t.source in hop1_targets and t.source not in matched_entity_ids:
                triple_key = (t.source, t.relation, t.target)
                if triple_key not in visited_triples:
                    visited_triples.add(triple_key)
                    s_ent = self.entities.get(t.source)
                    tgt_ent = self.entities.get(t.target)
                    results.append({
                        "source_id": t.source,
                        "source_name": s_ent.name_en if s_ent else t.source,
                        "relation": t.relation,
                        "target_id": t.target,
                        "target_name": tgt_ent.name_en if tgt_ent else t.target,
                        "target_name_bn": tgt_ent.name_bn if tgt_ent else "",
                        "evidence_score": t.evidence_score * 0.9,
                        "hop": 2,
                    })

        return results


clinical_kg = ClinicalKnowledgeGraph()
