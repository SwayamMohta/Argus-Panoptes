from logging.config import fileConfig

from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

import app.models  # noqa: F401  (register all models on Base.metadata)
from alembic import context
from app.core.config import get_settings
from app.db.base import Base

config = context.config
settings = get_settings()

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def include_object(object_, name, type_, reflected, compare_to):
    if type_ == "table" and name in {"spatial_ref_sys", "geography_columns", "geometry_columns"}:
        return False
    if type_ == "table" and getattr(object_, "schema", None) == "extensions":
        return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(
        settings.database_url,
        poolclass=NullPool,
        connect_args={"options": "-csearch_path=public,extensions"},
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
