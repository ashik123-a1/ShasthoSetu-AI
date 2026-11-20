"""
Unit test verifying genuine LangGraph StateGraph execution in ShasthoSetu AI.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Add project root to sys.path
_PROJECT_ROOT = str(Path(__file__).resolve().parents[2])
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from services.agents.langgraph_triage import (
    LANGGRAPH_AVAILABLE,
    LangGraphClinicalTriage,
    langgraph_triage_engine,
)


def test_langgraph_engine_initialization():
    assert LANGGRAPH_AVAILABLE, "langgraph package must be installed and importable"
    assert langgraph_triage_engine.is_compiled, "LangGraph StateGraph must compile cleanly"
    print("PASS: LangGraph StateGraph initialized and compiled.")


def test_routine_clinical_query_execution():
    query = "আমার ৩ দিন ধরে ১০৩ ডিগ্রি জ্বর এবং চোখের পেছনে তীব্র ব্যথা"
    result = langgraph_triage_engine.run(query=query, language="bn")

    assert result["is_emergency"] is False, "Dengue fever query should not be immediate 999"
    assert result["triage_level"] == "URGENT", "Severe fever query should be URGENT"
    assert len(result["trace_steps"]) == 5, f"Expected 5 nodes executed, got {len(result['trace_steps'])}"
    assert result["trace_steps"][0]["node"] == "IntentTriageNode"
    assert result["trace_steps"][1]["node"] == "EmergencyGateNode"
    assert result["trace_steps"][2]["node"] == "GraphRAGNode"
    assert result["trace_steps"][3]["node"] == "MCPToolExecutorNode"
    assert result["trace_steps"][4]["node"] == "CitationGuardNode"
    assert "guideline_mcp.search_clinical_guidelines" in result["mcp_tools_invoked"]
    assert result["disclaimer_attached"] is True

    print("PASS: Routine clinical query traversed all 5 nodes successfully.")


def test_emergency_code_999_short_circuit():
    query = "বুকে তীব্র ভারী চাপ লাগছে আর ব্যথাটা বাম বাহুতে ছড়িয়ে পড়ছে"
    result = langgraph_triage_engine.run(query=query, language="bn")

    assert result["is_emergency"] is True, "AMI chest pain symptom must trigger emergency gate"
    assert result["triage_level"] == "EMERGENCY_CODE_999"
    # Conditional edge should exit early after EmergencyGateNode
    assert len(result["trace_steps"]) == 2, f"Expected 2 nodes executed before early exit, got {len(result['trace_steps'])}"
    assert result["trace_steps"][0]["node"] == "IntentTriageNode"
    assert result["trace_steps"][1]["node"] == "EmergencyGateNode"
    assert "৯৯৯" in result["clinical_advice"] or "999" in result["clinical_advice"]

    print("PASS: Emergency query exited immediately at Node 2 (Code 999 Gate) via conditional edge.")


if __name__ == "__main__":
    test_langgraph_engine_initialization()
    test_routine_clinical_query_execution()
    test_emergency_code_999_short_circuit()
    print("\nALL REAL LANGGRAPH STATEGRAPH TESTS PASSED (100%)!")
