from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class GISIssue(BaseModel):
    type: str
    severity: str = 'ERROR'
    message: str


class BoundaryStatus(BaseModel):
    status: str = 'VALID'
    issues: list[str] = Field(default_factory=list)


class GeometryArea(BaseModel):
    value: float | None = None
    unit: str = 'square_metre'
    warning: str | None = None


class GISValidationPayload(BaseModel):
    geometry_type: str | None = None
    geometry_valid: bool = False
    area: GeometryArea = Field(default_factory=GeometryArea)
    boundary: BoundaryStatus = Field(default_factory=BoundaryStatus)
    spatial_confidence: float = 0.0
    review_required: bool = False
    issues: list[GISIssue] = Field(default_factory=list)
    score: int = 0
    factors: list[dict[str, Any]] = Field(default_factory=list)


class GISComparisonPayload(BaseModel):
    document_area: dict[str, Any] = Field(default_factory=dict)
    gis_area: dict[str, Any] = Field(default_factory=dict)
    difference: dict[str, Any] = Field(default_factory=dict)
    classification: str = 'UNAVAILABLE'
    review_required: bool = False
    status: str = 'UNAVAILABLE'


class ParcelRelationship(BaseModel):
    pair: dict[str, str] = Field(default_factory=dict)
    relationship: str = 'DISJOINT'
    intersection_area: dict[str, Any] = Field(default_factory=dict)
    severity: str = 'INFO'
    review_required: bool = False
