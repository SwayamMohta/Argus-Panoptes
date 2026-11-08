"""Seed the Supabase database with reference data, GHMC wards, and demo reports.

The schema must already be applied (Alembic head b4f6a2c81d37). This script
runs the same idempotent seeds used locally:

    reference data -> 155 GHMC wards -> 9 Hyderabad demo reports

Run from backend/ with a Supabase **direct/session** connection string (port
5432). Copy it from Supabase Dashboard -> Project Settings -> Database ->
Connection string. Do not use the transaction pooler for this script.

    SUPABASE_DATABASE_URL="postgresql://postgres:<password>@<host>:5432/postgres" \
      ./.venv/Scripts/python.exe -m scripts.sync_supabase

The URL (including the password) is never printed.
"""

import os
import sys
from pathlib import Path
from urllib.parse import urlparse


def _from_dotenv(key: str) -> str | None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return None
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith(f"{key}="):
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
            return value or None
    return None


RAW = (
    os.environ.get("SUPABASE_DATABASE_URL")
    or os.environ.get("DATABASE_URL")
    or _from_dotenv("SUPABASE_DATABASE_URL")
    or _from_dotenv("DATABASE_URL")
)
if not RAW:
    print(
        "Set SUPABASE_DATABASE_URL (or DATABASE_URL) in backend/.env to a Supabase\n"
        "direct/session connection string, or pass it inline:\n"
        '  SUPABASE_DATABASE_URL="postgresql://postgres:<password>@<host>:5432/postgres" \\\n'
        "    python -m scripts.sync_supabase",
        file=sys.stderr,
    )
    raise SystemExit(1)

# SQLAlchemy needs the psycopg driver explicitly.
url = RAW
if url.startswith("postgres://"):
    url = "postgresql+psycopg://" + url[len("postgres://") :]
elif url.startswith("postgresql://"):
    url = "postgresql+psycopg://" + url[len("postgresql://") :]
elif not url.startswith("postgresql+psycopg://"):
    print(
        "Use a postgresql:// or postgresql+psycopg:// URL "
        "(the Supabase dashboard connection string is fine).",
        file=sys.stderr,
    )
    raise SystemExit(1)

os.environ["DATABASE_URL"] = url
parsed = urlparse(url)
print(f"Target: host={parsed.hostname} db={parsed.path.lstrip('/')}")

# Import after DATABASE_URL is set: app.db.session creates the engine on import.
from sqlalchemy import text  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from scripts.import_ghmc_wards import main as import_wards  # noqa: E402
from scripts.seed_demo_data import main as seed_demo  # noqa: E402
from scripts.seed_reference import main as seed_reference  # noqa: E402

EXPECTED_HEAD = "b4f6a2c81d37"

with SessionLocal() as db:
    version = db.scalar(text("SELECT version_num FROM alembic_version"))

if version != EXPECTED_HEAD:
    print(
        f"Schema is not at {EXPECTED_HEAD} (found {version!r}).\n"
        "Apply the Alembic migrations first, then re-run this script.",
        file=sys.stderr,
    )
    raise SystemExit(1)

print("Seeding reference data...")
seed_reference()
print("Importing 155 GHMC wards...")
import_wards()
print("Seeding Hyderabad demo reports...")
seed_demo()

with SessionLocal() as db:
    counts = {
        table: db.scalar(text(f"SELECT count(*) FROM {table}"))
        for table in (
            "areas",
            "categories",
            "category_checkpoints",
            "notices",
            "service_standards",
            "profiles",
            "issues",
            "comments",
        )
    }

print("Sync complete:")
for table, count in counts.items():
    print(f"  {table}: {count}")
