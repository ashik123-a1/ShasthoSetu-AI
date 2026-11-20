from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db.sqlite import apply_schema
from .routers import (
    admin,
    admin_rag,
    agents_and_automation,
    ai_assistant,
    ai_inference,
    ai_ocr,
    auth,
    blood_connect,
    consultations,
    doctor,
    journal,
    mcp_hub,
    patient,
    public,
    support,
)
from .seeds.seed_demo import seed_database


@asynccontextmanager
async def lifespan(_app: FastAPI):
    import os
    apply_schema()
    if settings.env != "production" and os.getenv("SHASTHOSETU_ENV") != "production":
        seed_database()
    try:
        from .services.rag_ingestion import seed_curated_corpus
        seed_curated_corpus(force_reindex=False)
    except Exception:
        # Resilient startup even if Ollama runtime is offline
        pass
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="ShasthoSetu AI Platform API",
        version="1.0.0",
        description=(
            "Full-stack bilingual healthcare platform API backed by normalized SQLite (WAL), "
            "Argon2id + HttpOnly cookies, strict RBAC, atomic booking locks, and safe non-diagnostic AI research previews."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"],
    )

    app.include_router(auth.router)
    app.include_router(public.router)
    app.include_router(ai_inference.router)
    app.include_router(ai_assistant.router)
    app.include_router(ai_ocr.router)
    app.include_router(blood_connect.router)
    app.include_router(journal.router)
    app.include_router(patient.router)
    app.include_router(doctor.router)
    app.include_router(consultations.router)
    app.include_router(support.router)
    app.include_router(admin.router)
    app.include_router(admin_rag.router)
    app.include_router(mcp_hub.router)
    app.include_router(agents_and_automation.router)
    return app


app = create_app()
