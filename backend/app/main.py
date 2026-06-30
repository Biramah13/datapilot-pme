from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api.routes.assistant import router as assistant_router
from app.api.routes.auth import router as auth_router
from app.api.routes.exports import router as exports_router
from app.api.routes.files import router as files_router
from app.api.routes.profile import router as profile_router
from app.db.database import Base, engine
from app.core.config import settings
from app.models import Company, UploadedFile, User  # noqa: F401,F403

app = FastAPI(title="DataPilot PME", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(auth_router)
app.include_router(files_router)
app.include_router(assistant_router)
app.include_router(profile_router)
app.include_router(exports_router)


def ensure_company_columns() -> None:
    inspector = inspect(engine)
    if "companies" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("companies")}
    missing = {
        "country": "VARCHAR DEFAULT ''",
        "city": "VARCHAR DEFAULT ''",
        "currency": "VARCHAR DEFAULT 'EUR'",
    }
    with engine.begin() as connection:
        for name, definition in missing.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE companies ADD COLUMN {name} {definition}"))


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    ensure_company_columns()


@app.get("/health")
def health_check():
    return {"status": "ok"}