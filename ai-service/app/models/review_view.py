from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ReviewViewCase(BaseModel):
    case_id: str
    status: str
    created_at: str
    updated_at: str
    priority: str
    review_required: bool


class LandRecordView(BaseModel):
    owner_name: Any = None
    survey_number: Any = None
    area: Any = None
    village: Any = None
    taluk: Any = None
    district: Any = None
    classification: Any = None
    date: Any = None
    additional_fields: dict[str, Any] = Field(default_factory=dict)
    source_traceability: dict[str, dict[str, Any]] = Field(default_factory=dict)


class AIConfidenceView(BaseModel):
    overall_confidence: float | None = None
    field_confidences: dict[str, float] = Field(default_factory=dict)
    extraction_status: str = 'UNAVAILABLE'
    low_confidence_fields: list[str] = Field(default_factory=list)


class ValidationIssueView(BaseModel):
    type: str
    message: str
    severity: str = 'INFO'
    field: str | None = None


class ValidationView(BaseModel):
    status: str = 'UNAVAILABLE'
    score: float | None = None
    issue_count: int = 0
    issues: list[ValidationIssueView] = Field(default_factory=list)
    review_required: bool = False


class GISAreaComparisonView(BaseModel):
    document_area: dict[str, Any] | None = None
    gis_area: dict[str, Any] | None = None
    difference: float | None = None
    difference_percent: float | None = None
    tolerance_percent: float = 2.0
    classification: str = 'UNAVAILABLE'


class GISView(BaseModel):
    status: str = 'UNAVAILABLE'
    geometry_status: str = 'UNAVAILABLE'
    spatial_confidence: float | None = None
    review_required: bool = False
    area_comparison: GISAreaComparisonView = Field(default_factory=GISAreaComparisonView)
    overlap_findings: list[dict[str, Any]] = Field(default_factory=list)
    geometry_findings: list[dict[str, Any]] = Field(default_factory=list)
    boundary_findings: list[str] = Field(default_factory=list)
    crs: str | None = None


class ReviewAnomalyView(BaseModel):
    anomaly_id: str
    type: str
    severity: str
    status: str
    source: str
    title: str
    message: str
    review_required: bool
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnomalySummaryView(BaseModel):
    total: int = 0
    open: int = 0
    resolved: int = 0
    dismissed: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class OfficerView(BaseModel):
    corrections: list[dict[str, Any]] = Field(default_factory=list)
    notes: list[dict[str, Any]] = Field(default_factory=list)


class AuditEventView(BaseModel):
    event_type: str
    timestamp: str
    actor: str | None = None


class AuditView(BaseModel):
    event_count: int = 0
    recent_events: list[AuditEventView] = Field(default_factory=list)


class DecisionView(BaseModel):
    can_approve: bool = False
    can_reject: bool = False
    can_request_correction: bool = False
    can_hold: bool = False
    blocking_anomalies: int = 0
    reason: str


class OfficerReviewView(BaseModel):
    case: ReviewViewCase
    land_record: LandRecordView
    ai: AIConfidenceView
    validation: ValidationView
    gis: GISView
    anomalies: list[ReviewAnomalyView] = Field(default_factory=list)
    anomaly_summary: AnomalySummaryView = Field(default_factory=AnomalySummaryView)
    officer: OfficerView = Field(default_factory=OfficerView)
    audit: AuditView = Field(default_factory=AuditView)
    decision: DecisionView
    priority: str


class OfficerReviewViewResponse(BaseModel):
    success: bool = True
    data: OfficerReviewView
