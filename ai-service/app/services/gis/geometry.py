from __future__ import annotations

from typing import Any

from shapely.geometry import shape
from shapely.validation import explain_validity


def extract_geometry_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError('Geometry payload must be a dictionary.')
    if payload.get('type') == 'FeatureCollection':
        features = payload.get('features') or []
        if not features:
            raise ValueError('FeatureCollection contains no features.')
        geometry = features[0].get('geometry') if isinstance(features[0], dict) else None
        if geometry is None:
            raise ValueError('FeatureCollection feature is missing geometry.')
        return geometry
    if payload.get('type') == 'Feature':
        geometry = payload.get('geometry')
        if geometry is None:
            raise ValueError('Feature is missing geometry.')
        return geometry
    if payload.get('type') in {'Polygon', 'MultiPolygon'}:
        return payload
    raise ValueError('Unsupported geometry type.')


def validate_polygon_geometry(geometry: dict[str, Any]) -> tuple[bool, list[dict[str, Any]], str | None, Any | None]:
    issues: list[dict[str, Any]] = []
    if not isinstance(geometry, dict):
        issues.append({'type': 'INVALID_GEOMETRY', 'severity': 'ERROR', 'message': 'Geometry is not a valid GeoJSON object.'})
        return False, issues, None, None

    geometry_type = geometry.get('type')
    if geometry_type not in {'Polygon', 'MultiPolygon'}:
        issues.append({'type': 'UNSUPPORTED_GEOMETRY', 'severity': 'ERROR', 'message': 'Only Polygon and MultiPolygon are supported in this phase.'})
        return False, issues, geometry_type, None

    if geometry_type == 'Polygon':
        coords = geometry.get('coordinates')
        if not isinstance(coords, list) or not coords or not coords[0]:
            issues.append({'type': 'INVALID_GEOMETRY', 'severity': 'ERROR', 'message': 'Polygon coordinates are missing or empty.'})
            return False, issues, geometry_type, None

        for ring in coords:
            if not isinstance(ring, list) or len(ring) < 4:
                issues.append({'type': 'INVALID_GEOMETRY', 'severity': 'ERROR', 'message': 'Polygon ring is incomplete.'})
                break
            if ring[0] != ring[-1]:
                issues.append({'type': 'INVALID_GEOMETRY', 'severity': 'ERROR', 'message': 'Polygon ring is not closed.'})
                break

    if geometry_type == 'MultiPolygon':
        coords = geometry.get('coordinates')
        if not isinstance(coords, list) or not coords:
            issues.append({'type': 'INVALID_GEOMETRY', 'severity': 'ERROR', 'message': 'MultiPolygon coordinates are missing or empty.'})
            return False, issues, geometry_type, None

    try:
        shapely_geom = shape(geometry)
    except Exception as exc:  # pragma: no cover - broad but safe
        issues.append({'type': 'INVALID_GEOMETRY', 'severity': 'ERROR', 'message': f'Geometry could not be parsed: {exc}'})
        return False, issues, geometry_type, None

    if shapely_geom.is_empty:
        issues.append({'type': 'EMPTY_GEOMETRY', 'severity': 'ERROR', 'message': 'Geometry is empty.'})
    if shapely_geom.geom_type not in {'Polygon', 'MultiPolygon'}:
        issues.append({'type': 'UNSUPPORTED_GEOMETRY', 'severity': 'ERROR', 'message': f'Unsupported geometry type: {shapely_geom.geom_type}'})
    if not shapely_geom.is_valid:
        issues.append({'type': 'INVALID_GEOMETRY', 'severity': 'ERROR', 'message': explain_validity(shapely_geom)})
    if shapely_geom.area == 0:
        issues.append({'type': 'BOUNDARY_ERROR', 'severity': 'ERROR', 'message': 'Geometry has zero area.'})

    valid = not issues
    return valid, issues, geometry_type, shapely_geom
