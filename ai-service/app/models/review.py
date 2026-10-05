from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class OfficerIdentity(BaseModel):
    officer_id: str | None = None
    officer_role: str = 'GOVERNMENT_OFFICER'


class Anomaly(BaseModel):
    anomaly_id: str = Field(default_factory=lambda: f'ANOM-{uuid4().hex[:8].upper()}')
    anomaly_type: str
    field: str | None = None
    severity: str = 'WARNING'
    status: str = 'OPEN'
    source: str = 'SYSTEM'
    review_required: bool = False
    message: str
    explanation: str = ''
    value: Any = None
    confidence: float | None = None
    source_page: int | None = None
    source_bbox: list[int] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=utc_now)


class OfficerNote(BaseModel):
    note_id: str = Field(default_factory=lambda: f'NOTE-{uuid4().hex[:8].upper()}')
    case_id: str
    officer_id: str
    text: str
    created_at: str = Field(default_factory=utc_now)


class FieldCorrection(BaseModel):
    field: str
    original_value: Any = None
    corrected_value: Any = None
    reason: str
    source: str = 'OFFICER'
    officer_id: str
    timestamp: str = Field(default_factory=utc_now)


class AuditEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f'EVT-{uuid4().hex[:8].upper()}')
    case_id: str
    actor_id: str
    actor_role: str
    action: str
    timestamp: str = Field(default_factory=utc_now)
    field: str | None = None
    old_value: Any = None
    new_value: Any = None
    reason: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ReviewCase(BaseModel):
    case_id: str
    document_id: str
    land_record_id: str | None = None
    status: str = 'PENDING_REVIEW'
    priority: str = 'LOW'
    validation_score: float = 100.0
    land_record: dict[str, Any] = Field(default_factory=dict)
    original_land_record: dict[str, Any] = Field(default_factory=dict)
    validation_result: dict[str, Any] = Field(default_factory=dict)
    gis_result: dict[str, Any] | None = None
    anomalies: list[Anomaly] = Field(default_factory=list)
    notes: list[OfficerNote] = Field(default_factory=list)
    field_corrections: list[FieldCorrection] = Field(default_factory=list)
    audit_events: list[AuditEvent] = Field(default_factory=list)
    assigned_officer: str | None = None
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)
