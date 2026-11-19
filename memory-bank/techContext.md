# Technical Context: ShasthoSetu AI

## Technology Stack
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Three.js, Canvas gauges.
- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLite with WAL journaling.
- **Local AI & Embedding**: Ollama daemon (`qwen2.5:7b`, `bge-m3`, `deepseek-r1:8b`, `glm4:9b`).
- **MCP Framework**: `mcp==2.3.0` (FastMCP / Model Context Protocol) with Stdio, SSE, and Streamable HTTP.
- **Agent Orchestration**: LangGraph, CrewAI, AutoGen, OpenAI Agents SDK, Swarm.
- **Workflow Automation**: n8n, Prefect, Dagster.
- **Evaluation & Benchmarks**: Custom RAG evaluation suite (MRR, Hit@3, Faithfulness, Zero-PHI verification).

## Hardware Baseline
- Dedicated GPU: NVIDIA GeForce RTX 5060 Ti (16 GB VRAM).
- Host RAM: 16 GB DDR4/DDR5.
- Storage: High-capacity secondary NVMe drive (`G:\`) for model weights and GGUF caches.
