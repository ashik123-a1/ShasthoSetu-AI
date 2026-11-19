from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db.sqlite import apply_schema
from .routers import admin, auth, doctor, patient, public, support
from .seeds.seed_demo import seed_database


@asynccontextmanager
async def lifespan(_app: FastAPI):
    apply_schema()
    seed_database()
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
        allow_origin_regex=r"^https://[a-zA-Z0-9-]+\.trycloudflare\.com$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(public.router)
    app.include_router(patient.router)
    app.include_router(doctor.router)
    app.include_router(support.router)
    app.include_router(admin.router)
    return app


app = create_app()
