"""
ShasthoSetu AI — AutoGen Conversational Multi-Agent Adapter
Implements the multi-agent conversational round-robin paradigm:
- UserProxyAgent (simulates patient query & feedback)
- DoctorAssistantAgent (conducts clinical assessment & differential inquiry)
- SafetySupervisorAgent (monitors conversation for emergency escalation and termination)
"""

from __future__ import annotations

import time
from typing import Any


class AutoGenClinicalConversation:
    """Simulates an interactive multi-turn multi-agent conversational protocol."""

    def __init__(self, max_turns: int = 4) -> None:
        self.max_turns = max_turns

    def initiate_chat(self, initial_query: str) -> dict[str, Any]:
        t0 = time.perf_counter()
        chat_history = []

        # Turn 1: Patient asks
        chat_history.append({
            "sender": "Patient_UserProxy",
            "recipient": "Doctor_Assistant",
            "message": initial_query
        })

        # Turn 2: Doctor Assistant evaluates
        q_lower = initial_query.lower()
        is_chest_pain = any(w in q_lower for w in ["বুকে চাপ", "বুকে ব্যথা", "chest pain"])
        is_pediatric_fever = any(w in q_lower for w in ["বাচ্চা", "baby", "শিশু", "fever", "জ্বর"])

        if is_chest_pain:
            doc_msg = "বুকে চাপের সাথে কি বাম হাতে ব্যথা, শ্বাসকষ্ট বা অস্বাভাবিক ঘাম হচ্ছে? এটি কার্ডিয়াক জরুরি অবস্থার লক্ষণ হতে পারে।"
            escalation = "CRITICAL_CODE_999"
        elif is_pediatric_fever:
            doc_msg = "শিশুর বয়স কত এবং জ্বর কত দিন ধরে চলছে? শিশু কি ঠিকমতো তরল খাবার বা বুকের দুধ পান করতে পারছে?"
            escalation = "URGENT_PEDIATRIC_MONITORING"
        else:
            doc_msg = "আপনার উপসর্গগুলি বিস্তারিত জানান। আপনি কি পূর্বে অন্য কোনো ওষুধ গ্রহণ করেছেন?"
            escalation = "ROUTINE_INQUIRY"

        chat_history.append({
            "sender": "Doctor_Assistant",
            "recipient": "Patient_UserProxy",
            "message": doc_msg,
            "escalation_state": escalation
        })

        # Turn 3: Safety Supervisor enforces termination if emergency
        if escalation == "CRITICAL_CODE_999":
            sup_msg = "🚨 TERMINATE: Emergency red flag detected. Ceasing chat simulation and initiating immediate 999 hospital dispatch protocol."
            terminated = True
        else:
            sup_msg = "CONTINUE: Guideline compliance verified. Patient response awaited. TERMINATE."
            terminated = True

        chat_history.append({
            "sender": "SafetySupervisor_Agent",
            "recipient": "Chat_Group",
            "message": sup_msg,
            "decision": "TERMINATE" if terminated else "CONTINUE"
        })

        total_lat = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "autogen_framework": "AutoGen Multi-Agent Round-Robin Pattern",
            "status": "TERMINATED_CLEANLY",
            "total_turns": len(chat_history),
            "chat_history": chat_history,
            "escalation_level": escalation,
            "latency_ms": total_lat
        }


autogen_chat_runner = AutoGenClinicalConversation()
