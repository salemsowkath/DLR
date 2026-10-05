from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.validation.engine import validation_engine

router = APIRouter(prefix='/api/v1/validation', tags=['validation'])


class ValidationRequest(BaseModel):
    model_config = {'extra': 'allow'}
    owner_name: dict[str, Any] | None = None
    survey_number: dict[str, Any] | None = None
    area: dict[str, Any] | None = None
    village: dict[str, Any] | None = None
    taluk: dict[str, Any] | None = None
    district: dict[str, Any] | None = None
    date: dict[str, Any] | None = None


@router.post('/land-record')
async def validate_land_record(payload: dict[str, Any]) -> dict[str, Any]:
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': 'INVALID_RECORD', 'message': 'Validation input is empty.'},
        )
    return validation_engine.validate_land_record(payload)


@router.post('/compare')
async def compare_land_records(payload: dict[str, Any]) -> dict[str, Any]:
    record_a = payload.get('record_a', {}) if isinstance(payload, dict) else {}
    record_b = payload.get('record_b', {}) if isinstance(payload, dict) else {}
    if not isinstance(record_a, dict) or not isinstance(record_b, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': 'INVALID_RECORD', 'message': 'Both record_a and record_b must be structured objects.'},
        )
    return validation_engine.compare_records(record_a, record_b)
