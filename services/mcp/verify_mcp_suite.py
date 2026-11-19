"""Live JSON-RPC MCP Verification Suite for ShasthoSetu AI (Custom 3 + Public 3 Stdio + External SSE Probe)."""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

PROJECT_ROOT = Path(__file__).resolve().parents[2]
VENV_PYTHON = str(PROJECT_ROOT / "_shared" / "venv" / "Scripts" / "python.exe")
DB_PATH = str(PROJECT_ROOT / "services" / "api" / "data" / "shasthosetu.db")
REPORT_PATH = PROJECT_ROOT / "docs" / "evidence" / "INT_01" / "mcp_verification_report.json"


def _extract_result_preview(res: Any) -> Any:
    texts: list[str] = []
    for item in getattr(res, "content", []) or []:
        txt = getattr(item, "text", None)
        if txt:
            texts.append(txt)
    if getattr(res, "structuredContent", None) is not None:
        return res.structuredContent
    joined = "\n".join(texts).strip()
    if not joined:
        return {"isError": getattr(res, "isError", False), "raw": str(res)[:300]}
    try:
        return json.loads(joined)
    except Exception:
        return joined[:600]


async def verify_stdio_server(
    server_id: str,
    command: str,
    args: list[str],
    env: dict[str, str] | None,
    tool_calls: list[tuple[str, dict[str, Any]]],
    check_resources: bool = True,
) -> dict[str, Any]:
    t0 = time.perf_counter()
    merged_env = {**os.environ, **(env or {}), "PYTHONUTF8": "1"}
    params = StdioServerParameters(command=command, args=args, env=merged_env)
    record: dict[str, Any] = {
        "server_id": server_id,
        "transport": "stdio",
        "command": command,
        "args": args,
        "status": "FAILED",
    }
    try:
        async with stdio_client(params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                init_res = await session.initialize()
                tools_res = await session.list_tools()
                tool_names = [t.name for t in tools_res.tools]

                resource_uris: list[str] = []
                if check_resources:
                    try:
                        res_list = await session.list_resources()
                        resource_uris = [str(r.uri) for r in res_list.resources]
                    except Exception:
                        resource_uris = []

                calls_out: list[dict[str, Any]] = []
                any_call_failed = False
                for tool_name, tool_args in tool_calls:
                    c_res = await session.call_tool(tool_name, tool_args)
                    preview = _extract_result_preview(c_res)
                    is_err = bool(getattr(c_res, "isError", False)) or (
                        isinstance(preview, str) and preview.startswith("Error executing tool")
                    )
                    if is_err:
                        any_call_failed = True
                    calls_out.append(
                        {
                            "tool": tool_name,
                            "arguments": tool_args,
                            "is_error": is_err,
                            "preview": preview,
                        }
                    )

                record.update(
                    {
                        "status": "FAILED" if any_call_failed else "PASS",
                        "server_info": {
                            "name": getattr(getattr(init_res, "serverInfo", None), "name", server_id),
                            "version": getattr(getattr(init_res, "serverInfo", None), "version", ""),
                            "protocol_version": getattr(init_res, "protocolVersion", ""),
                        },
                        "tools_count": len(tool_names),
                        "tools": tool_names,
                        "resources": resource_uris,
                        "tool_calls": calls_out,
                    }
                )
    except Exception as exc:
        record["error"] = f"{type(exc).__name__}: {exc}"
    record["latency_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    return record


def probe_remote_sse(url: str) -> dict[str, Any]:
    t0 = time.perf_counter()
    req = urllib.request.Request(url, headers={"Accept": "text/event-stream, application/json"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            snippet = resp.read(200).decode("utf-8", "ignore")
            return {
                "server_id": "cloudcamp-bd",
                "transport": "sse",
                "url": url,
                "reachable": True,
                "http_status": resp.status,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 1),
                "note": f"HTTP {resp.status} ({len(snippet)}B preview)",
            }
    except urllib.error.HTTPError as e:
        return {
            "server_id": "cloudcamp-bd",
            "transport": "sse",
            "url": url,
            "reachable": True,
            "http_status": e.code,
            "latency_ms": round((time.perf_counter() - t0) * 1000, 1),
            "note": f"Endpoint responded with HTTP {e.code} (configured external SSE server)",
        }
    except Exception as exc:
        return {
            "server_id": "cloudcamp-bd",
            "transport": "sse",
            "url": url,
            "reachable": False,
            "http_status": None,
            "latency_ms": round((time.perf_counter() - t0) * 1000, 1),
            "note": f"Probe note: {type(exc).__name__}: {exc}",
        }


async def main() -> int:
    common_env = {"SHASTHOSETU_DB_PATH": DB_PATH}
    mcp_dir = PROJECT_ROOT / "services" / "mcp"

    custom_specs = [
        (
            "guideline-mcp",
            VENV_PYTHON,
            [str(mcp_dir / "guideline_mcp.py"), "--transport", "stdio"],
            common_env,
            [
                ("search_clinical_guidelines", {"query": "PCOS insulin irregular", "language": "en", "top_k": 3}),
                ("list_approved_rag_sources", {}),
                ("get_frozen_model_register", {"module": ""}),
                ("check_clinical_safety_guard", {"text": "chest pain severe difficulty breathing"}),
            ],
            True,
        ),
        (
            "directory-mcp",
            VENV_PYTHON,
            [str(mcp_dir / "directory_mcp.py"), "--transport", "stdio"],
            common_env,
            [
                ("get_department_counts", {}),
                ("find_approved_doctors", {"specialty": "Gynecology", "limit": 3}),
                ("find_blood_requests_safe", {}),
            ],
            True,
        ),
        (
            "care-record-mcp",
            VENV_PYTHON,
            [str(mcp_dir / "care_record_mcp.py"), "--transport", "stdio"],
            common_env,
            [
                ("get_patient_care_summary", {"requester_role": "SUPPORT"}),
                ("get_patient_care_summary", {"requester_role": "PATIENT"}),
                ("check_medication_activation_gate", {}),
                ("list_immutable_audit_summary", {"requester_role": "ADMIN", "limit": 3}),
            ],
            True,
        ),
    ]

    docs_dir = str(PROJECT_ROOT / "docs")
    final_lock_dir = str(PROJECT_ROOT / "SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT" / "final_lock")
    kg_path = str(mcp_dir / "data" / "clinical_kg_memory.jsonl")

    public_specs = [
        (
            "filesystem",
            "cmd",
            ["/c", "npx", "-y", "@modelcontextprotocol/server-filesystem", docs_dir, final_lock_dir],
            {},
            [("list_allowed_directories", {})],
            False,
        ),
        (
            "memory",
            "cmd",
            ["/c", "npx", "-y", "@modelcontextprotocol/server-memory"],
            {"MEMORY_FILE_PATH": kg_path},
            [("read_graph", {})],
            False,
        ),
        (
            "sequential-thinking",
            "cmd",
            ["/c", "npx", "-y", "@modelcontextprotocol/server-sequential-thinking"],
            {},
            [
                (
                    "sequentialthinking",
                    {
                        "thought": "Verify Zero-PHI barrier prevents SUPPORT role from reading clinical OCR/PHR records before response.",
                        "nextThoughtNeeded": False,
                        "thoughtNumber": 1,
                        "totalThoughts": 1,
                    },
                )
            ],
            False,
        ),
    ]

    custom_results = []
    for spec in custom_specs:
        res = await verify_stdio_server(*spec)
        custom_results.append(res)
        print(f"[CUSTOM] {res['server_id']}: {res['status']} (tools={res.get('tools_count', 0)}, {res['latency_ms']}ms)", file=sys.stderr)

    public_results = []
    for spec in public_specs:
        res = await verify_stdio_server(*spec)
        public_results.append(res)
        print(f"[PUBLIC] {res['server_id']}: {res['status']} (tools={res.get('tools_count', 0)}, {res['latency_ms']}ms)", file=sys.stderr)

    cloudcamp_probe = probe_remote_sse("https://cloudcamp-bd-mcp.equisaas-bd.com")
    print(f"[EXTERNAL_SSE] cloudcamp-bd: {cloudcamp_probe['note']}", file=sys.stderr)

    # Extra semantic security checks on custom results
    zero_phi_verified = False
    blood_mask_verified = False
    for r in custom_results:
        if r["server_id"] == "care-record-mcp" and r["status"] == "PASS":
            for call in r.get("tool_calls", []):
                prev = call.get("preview")
                if call["tool"] == "get_patient_care_summary" and call["arguments"].get("requester_role") == "SUPPORT":
                    if isinstance(prev, dict) and prev.get("error_code") == "ERR_ZERO_PHI_FORBIDDEN":
                        zero_phi_verified = True
        if r["server_id"] == "directory-mcp" and r["status"] == "PASS":
            for call in r.get("tool_calls", []):
                prev = call.get("preview")
                if call["tool"] == "find_blood_requests_safe" and isinstance(prev, dict):
                    if prev.get("privacy_gate") == "ZERO_PHI_PHONE_MASKING_ENFORCED":
                        blood_mask_verified = True

    custom_pass = sum(1 for r in custom_results if r["status"] == "PASS")
    public_pass = sum(1 for r in public_results if r["status"] == "PASS")

    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "protocol_client": "mcp.ClientSession (stdio JSON-RPC)",
        "summary": {
            "custom_built_total": len(custom_results),
            "custom_built_passed": custom_pass,
            "public_stdio_total": len(public_results),
            "public_stdio_passed": public_pass,
            "external_sse_configured": 1,
            "zero_phi_support_block_verified": zero_phi_verified,
            "blood_phone_masking_verified": blood_mask_verified,
        },
        "custom_servers": custom_results,
        "public_servers": public_results,
        "external_sse_servers": [cloudcamp_probe],
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], indent=2))
    return 0 if (custom_pass == 3 and public_pass == 3 and zero_phi_verified and blood_mask_verified) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
