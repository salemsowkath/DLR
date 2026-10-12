from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ValidationCheck(BaseModel):
    rule: str
    field: str | None = None
    status: str = 'PASS'
    severity: str = 'INFO'
    message: str
    value: Any | None = None
    confidence: float | None = None
    source_page: int | None = None
    source_bbox: dict[str, Any] | list[Any] | None = None


class ValidationSummary(BaseModel):
    total_checks: int = 0
    passed: int = 0
    warnings: int = 0
    errors: int = 0


class ValidationPayload(BaseModel):
    status: str = 'PASS'
    overall_score: float = 100.0
    checks: list[ValidationCheck] = Field(default_factory=list)
    issues: list[ValidationCheck] = Field(default_factory=list)
    review_required: bool = False
    summary: ValidationSummary = Field(default_factory=ValidationSummary)


class ValidationResponse(BaseModel):
    success: bool = True
    validation: ValidationPayload


class ComparisonPayload(BaseModel):
    duplicate: bool = False
    conflict: bool = False
    status: str = 'PASS'
    checks: list[ValidationCheck] = Field(default_factory=list)


class ComparisonResponse(BaseModel):
    success: bool = True
    comparison: ComparisonPayload
