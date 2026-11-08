from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.admin import AdminAuditLog
from app.models.user import Profile


def log_audit(
    db: Session,
    actor: Profile,
    action: str,
    entity_type: str,
    entity_id: UUID | str,
    details: dict[str, Any] | None = None,
) -> None:
    db.add(
        AdminAuditLog(
            actor_id=actor.id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            details=details or {},
        )
    )
