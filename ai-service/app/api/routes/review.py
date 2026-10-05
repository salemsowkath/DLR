from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from app.models.review_view import OfficerReviewViewResponse
from app.services.review.service import review_case_service

router = APIRouter(prefix='/api/v1/review', tags=['review'])


class CaseCreateRequest(BaseModel):
    document_id: str
    land_record_id: str | None = None
    land_record: dict[str, Any]
    validation_result: dict[str, Any]
    gis_result: dict[str, Any] | None = None


class LandRecordReviewCaseRequest(BaseModel):
    document_id: str
    land_record_id: str | None = None
    land_record: dict[str, Any]
    validation_result: dict[str, Any]
    gis_result: dict[str, Any] | None = None


class OfficerActionRequest(BaseModel):
    officer_id: str | None = None
    reason: str | None = None
    field: str | None = None
    new_value: Any = None
    text: str | None = None


@router.post('/cases', summary='Create review case', description='Create an officer review case from a structured land record and validation outcome. The AI remains advisory and final verification stays with the authorized officer.')
async def create_review_case(payload: CaseCreateRequest) -> dict[str, Any]:
    try:
        case = review_case_service.create_case(payload.document_id, payload.land_record, payload.validation_result, payload.gis_result, payload.land_record_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_CASE_INPUT', 'message': str(exc)}) from exc
    return {'success': True, 'case': case}


@router.post('/cases/from-land-record', summary='Create review case with optional GIS findings', description='Create a review case using the structured land record, validation result, and optional GIS findings. GIS findings remain advisory and are reviewed by the officer before any decision is made.')
async def create_review_case_from_land_record(payload: LandRecordReviewCaseRequest) -> dict[str, Any]:
    try:
        case = review_case_service.create_case(payload.document_id, payload.land_record, payload.validation_result, payload.gis_result, payload.land_record_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_CASE_INPUT', 'message': str(exc)}) from exc
    return {'success': True, 'case': case}


@router.get('/cases/summary', summary='List lightweight review case summaries', description='Return a dashboard-friendly list of review cases without full OCR, extraction, GIS geometry, or audit payloads.')
async def list_review_case_summaries() -> dict[str, Any]:
    return review_case_service.list_case_summaries()


@router.get('/cases/{case_id}/view', response_model=OfficerReviewViewResponse, summary='Get Officer Review dashboard payload', description='Return a frontend-friendly summary of structured extraction, validation, optional GIS findings, anomalies, officer actions, audit history, and workflow hints. AI and GIS remain advisory.')
async def get_review_case_view(case_id: str) -> dict[str, Any]:
    if re.fullmatch(r'CASE-\d{6}', case_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_CASE_ID', 'message': 'case_id must use the CASE-000001 format.'})
    try:
        return review_case_service.get_review_view(case_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={'error': 'CASE_NOT_FOUND', 'message': str(exc)}) from exc


@router.get('/cases/{case_id}', summary='Get review case', description='Fetch the full current officer review case with summary, anomalies, and source traceability.')
async def get_review_case(case_id: str) -> dict[str, Any]:
    try:
        return review_case_service.get_case(case_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={'error': 'CASE_NOT_FOUND', 'message': str(exc)}) from exc


@router.get('/cases', summary='List review cases', description='List review cases with optional filtering by status, priority, assigned officer, or anomaly type.')
async def list_review_cases(
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    assigned_officer: str | None = Query(default=None),
    anomaly_type: str | None = Query(default=None),
) -> dict[str, Any]:
    return review_case_service.list_cases(
        status=status,
        priority=priority,
        assigned_officer=assigned_officer,
        anomaly_type=anomaly_type,
    )


@router.post('/cases/{case_id}/start', summary='Start review', description='Mark a review case as actively under review by an authorized officer.')
async def start_review(case_id: str, payload: OfficerActionRequest) -> dict[str, Any]:
    try:
        return {'success': True, 'case': review_case_service.start_review(case_id, payload.officer_id or '').get('case')}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_ACTION', 'message': str(exc)}) from exc


@router.post('/cases/{case_id}/approve', summary='Approve case', description='Approve the workflow case after the officer confirms the review outcome. This does not legally approve ownership.')
async def approve_case(case_id: str, payload: OfficerActionRequest) -> dict[str, Any]:
    try:
        return {'success': True, 'case': review_case_service.approve_case(case_id, payload.officer_id or '', payload.reason or '').get('case')}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_ACTION', 'message': str(exc)}) from exc


@router.post('/cases/{case_id}/request-correction', summary='Request correction', description='Request a correction workflow when additional manual checking is required.')
async def request_correction(case_id: str, payload: OfficerActionRequest) -> dict[str, Any]:
    try:
        return {'success': True, 'case': review_case_service.request_correction(case_id, payload.officer_id or '', payload.reason or '').get('case')}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_ACTION', 'message': str(exc)}) from exc


@router.post('/cases/{case_id}/hold', summary='Put case on hold', description='Place a case on hold pending additional government records or information.')
async def hold_case(case_id: str, payload: OfficerActionRequest) -> dict[str, Any]:
    try:
        return {'success': True, 'case': review_case_service.hold_case(case_id, payload.officer_id or '', payload.reason or '').get('case')}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_ACTION', 'message': str(exc)}) from exc


@router.post('/cases/{case_id}/reject', summary='Reject workflow case', description='Reject the current workflow case after review; this is an operational workflow decision, not a legal ownership determination.')
async def reject_case(case_id: str, payload: OfficerActionRequest) -> dict[str, Any]:
    try:
        return {'success': True, 'case': review_case_service.reject_case(case_id, payload.officer_id or '', payload.reason or '').get('case')}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_ACTION', 'message': str(exc)}) from exc


@router.post('/cases/{case_id}/corrections', summary='Correct extracted field', description='Correct an extracted field while preserving the original AI value and creating an audit event.')
async def correct_field(case_id: str, payload: OfficerActionRequest) -> dict[str, Any]:
    try:
        return review_case_service.add_field_correction(case_id, payload.officer_id or '', payload.field or '', payload.new_value, payload.reason or '')
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_ACTION', 'message': str(exc)}) from exc


@router.post('/cases/{case_id}/notes', summary='Add officer note', description='Add a review note for the case while keeping sensitive personal data out of audit logs.')
async def add_note(case_id: str, payload: OfficerActionRequest) -> dict[str, Any]:
    try:
        return review_case_service.add_note(case_id, payload.officer_id or '', payload.text or '')
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_ACTION', 'message': str(exc)}) from exc


@router.post('/cases/{case_id}/anomalies/{anomaly_id}/resolve', summary='Resolve anomaly', description='Resolve an anomaly after manual review and source verification.')
async def resolve_anomaly(case_id: str, anomaly_id: str, payload: OfficerActionRequest) -> dict[str, Any]:
    try:
        return review_case_service.resolve_anomaly(case_id, anomaly_id, payload.officer_id or '', payload.reason or '')
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_ACTION', 'message': str(exc)}) from exc


@router.post('/cases/{case_id}/anomalies/{anomaly_id}/dismiss', summary='Dismiss anomaly', description='Dismiss an anomaly when the officer determines it is a false positive or not actionable.')
async def dismiss_anomaly(case_id: str, anomaly_id: str, payload: OfficerActionRequest) -> dict[str, Any]:
    try:
        return review_case_service.dismiss_anomaly(case_id, anomaly_id, payload.officer_id or '', payload.reason or '')
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_ACTION', 'message': str(exc)}) from exc


@router.get('/cases/{case_id}/audit', summary='Audit history', description='Return the chronological audit trail for the case, including corrections, notes, and workflow decisions.')
async def get_case_audit(case_id: str) -> dict[str, Any]:
    try:
        return review_case_service.get_audit_history(case_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={'error': 'CASE_NOT_FOUND', 'message': str(exc)}) from exc
