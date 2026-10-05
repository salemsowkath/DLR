from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.services.gis.validation import gis_validation_service

router = APIRouter(prefix='/api/v1/gis', tags=['gis'])


@router.post('/validate', summary='Validate GeoJSON geometry', description='Validate GeoJSON input, check polygon integrity, and return spatial confidence and boundary status.')
async def validate_geometry(payload: dict[str, Any]) -> dict[str, Any]:
    geometry = payload.get('geometry') if isinstance(payload, dict) else None
    crs = payload.get('crs') if isinstance(payload, dict) else None
    if geometry is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'MISSING_GEOMETRY', 'message': 'A GeoJSON geometry is required.'})
    try:
        return gis_validation_service.validate_geometry_payload(geometry, crs)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_GEOMETRY', 'message': str(exc)}) from exc


@router.post('/compare-area', summary='Compare GIS area with document area', description='Normalize document and GIS area values to a common unit and classify the difference.')
async def compare_area(payload: dict[str, Any]) -> dict[str, Any]:
    geometry = payload.get('geometry') if isinstance(payload, dict) else None
    crs = payload.get('crs') if isinstance(payload, dict) else None
    document_area = payload.get('document_area') if isinstance(payload, dict) else None
    if geometry is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'MISSING_GEOMETRY', 'message': 'A GeoJSON geometry is required.'})
    try:
        return gis_validation_service.compare_area(geometry, crs, document_area)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_GEOMETRY', 'message': str(exc)}) from exc


@router.post('/overlap', summary='Detect parcel overlaps and adjacency', description='Compare a GeoJSON FeatureCollection and return pairwise spatial relationships.')
async def overlap(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_GEOJSON', 'message': 'FeatureCollection payload is required.'})
    try:
        return gis_validation_service.overlap_analysis(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_GEOJSON', 'message': str(exc)}) from exc


@router.post('/land-record', summary='Spatial validation for a land record', description='Validate a land record geometry against the document area and GIS-derived metrics.')
async def land_record_validation(payload: dict[str, Any]) -> dict[str, Any]:
    land_record = payload.get('land_record') if isinstance(payload, dict) else None
    geometry = payload.get('geometry') if isinstance(payload, dict) else None
    crs = payload.get('crs') if isinstance(payload, dict) else None
    if land_record is None or geometry is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_INPUT', 'message': 'Both land_record and geometry are required.'})
    try:
        return gis_validation_service.land_record_gis_validation(land_record, geometry, crs)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={'error': 'INVALID_GEOMETRY', 'message': str(exc)}) from exc
