from __future__ import annotations

from typing import Any

from shapely.geometry import shape

from app.core.config import settings
from app.services.gis.area import GIS_AREA_TOLERANCE_PERCENT, calculate_area_difference, classify_area_difference, convert_to_square_metre
from app.services.gis.confidence import calculate_spatial_confidence, calculate_spatial_score, should_review
from app.services.gis.geometry import extract_geometry_payload, validate_polygon_geometry
from app.services.gis.overlap import pairwise_overlap
from app.services.validation.rules import parse_area_value


class GISValidationService:
    def validate_geometry_payload(self, geometry: dict[str, Any], crs: str | None = None) -> dict[str, Any]:
        issues: list[dict[str, Any]] = []
        effective_crs = (crs if crs and str(crs).strip() else settings.gis_projected_crs)
        if effective_crs is None or not str(effective_crs).strip():
            issues.append({'type': 'CRS_MISSING', 'severity': 'ERROR', 'message': 'CRS is missing. Projected CRS recommended for planar area calculations.'})
        try:
            geometry_payload = extract_geometry_payload(geometry)
        except ValueError as exc:
            issues.append({'type': 'INVALID_GEOMETRY', 'severity': 'ERROR', 'message': str(exc)})
            return {
                'success': True,
                'crs': effective_crs,
                'gis_validation': {
                    'geometry_type': None,
                    'geometry_valid': False,
                    'area': {'value': None, 'unit': 'square_metre', 'warning': 'AREA_REQUIRES_PROJECTED_CRS'},
                    'boundary': {'status': 'INVALID', 'issues': ['Geometry payload is invalid.']},
                    'spatial_confidence': 0.0,
                    'review_required': True,
                    'issues': issues,
                    'score': 0,
                    'factors': [],
                },
            }

        valid, geometry_issues, geometry_type, shapely_geom = validate_polygon_geometry(geometry_payload)
        issues.extend(geometry_issues)

        boundary_status = {'status': 'VALID', 'issues': []}
        if geometry_issues:
            boundary_status = {'status': 'INVALID', 'issues': [issue['message'] for issue in geometry_issues]}

        area_info = {'value': None, 'unit': 'square_metre', 'warning': None}
        if geometry_type and shapely_geom is not None:
            if effective_crs and ('4326' in str(effective_crs) or 'EPSG:4326' in str(effective_crs) or 'WGS84' in str(effective_crs).upper()):
                area_info = {'value': None, 'unit': 'square_metre', 'warning': 'AREA_REQUIRES_PROJECTED_CRS'}
            elif effective_crs is None:
                area_info = {'value': None, 'unit': 'square_metre', 'warning': 'AREA_REQUIRES_PROJECTED_CRS'}
            else:
                area_info = {'value': round(float(shapely_geom.area), 4), 'unit': 'square_metre', 'warning': None}

        score, factors = calculate_spatial_score(valid, effective_crs, area_info['value'] is not None, False, valid, False)
        spatial_confidence = calculate_spatial_confidence(score)
        review_required = should_review(score, issues)

        return {
            'success': True,
            'crs': effective_crs,
            'gis_validation': {
                'geometry_type': geometry_type,
                'geometry_valid': valid,
                'area': area_info,
                'boundary': boundary_status,
                'spatial_confidence': spatial_confidence,
                'review_required': review_required,
                'issues': issues,
                'score': score,
                'factors': factors,
            },
        }

    def compare_area(self, geometry: dict[str, Any], crs: str | None, document_area: dict[str, Any] | None) -> dict[str, Any]:
        if document_area is None:
            return {
                'success': True,
                'comparison': {
                    'document_area': {'value': None, 'unit': 'acre'},
                    'gis_area': {'value': None, 'unit': 'square_metre'},
                    'difference': {'absolute': None, 'percentage': None},
                    'classification': 'UNAVAILABLE',
                    'review_required': True,
                    'status': 'UNAVAILABLE',
                },
            }

        validated = self.validate_geometry_payload(geometry, crs)
        validation = validated['gis_validation']
        gis_value = validation['area'].get('value')
        if gis_value is None:
            return {
                'success': True,
                'comparison': {
                    'document_area': {'value': document_area.get('value'), 'unit': document_area.get('unit') or 'acre'},
                    'gis_area': {'value': None, 'unit': 'square_metre'},
                    'difference': {'absolute': None, 'percentage': None},
                    'classification': 'UNAVAILABLE',
                    'review_required': True,
                    'status': 'UNAVAILABLE',
                },
            }

        doc_value = document_area.get('value')
        doc_unit = document_area.get('unit')
        difference = calculate_area_difference(doc_value, doc_unit, gis_value, 'square_metre')
        percent = difference.get('percentage')
        classification, review_required = classify_area_difference(percent, GIS_AREA_TOLERANCE_PERCENT)
        return {
            'success': True,
            'crs': (crs if crs and str(crs).strip() else settings.gis_projected_crs),
            'comparison': {
                'document_area': {'value': doc_value, 'unit': doc_unit or 'acre'},
                'gis_area': {'value': round(float(gis_value), 4), 'unit': 'square_metre'},
                'difference': difference,
                'classification': classification,
                'review_required': review_required,
                'status': classification,
            },
        }

    def overlap_analysis(self, feature_collection: dict[str, Any]) -> dict[str, Any]:
        features = feature_collection.get('features', []) if isinstance(feature_collection, dict) else []
        if not isinstance(features, list):
            raise ValueError('FeatureCollection must contain a list of features.')
        return {'success': True, 'results': pairwise_overlap(features)}

    def land_record_gis_validation(self, land_record: dict[str, Any], geometry: dict[str, Any], crs: str | None) -> dict[str, Any]:
        survey_number = land_record.get('survey_number', {}).get('value') if isinstance(land_record.get('survey_number'), dict) else land_record.get('survey_number')
        parsed_area = parse_area_value(str(land_record.get('area', {}).get('value')) if isinstance(land_record.get('area'), dict) else str(land_record.get('area', '')))
        document_area = {'value': parsed_area['value'], 'unit': parsed_area['unit']} if parsed_area else {'value': None, 'unit': 'acre'}

        effective_crs = (crs if crs and str(crs).strip() else settings.gis_projected_crs)
        validated = self.validate_geometry_payload(geometry, effective_crs)
        comparison = self.compare_area(geometry, effective_crs, document_area)
        issues = validated['gis_validation']['issues']

        result = {
            'success': True,
            'crs': effective_crs,
            'survey_number': survey_number,
            'document_area': {'value': document_area.get('value'), 'unit': document_area.get('unit')},
            'gis_area': comparison['comparison']['gis_area'],
            'area_difference': comparison['comparison']['difference'],
            'boundary_status': validated['gis_validation']['boundary'],
            'spatial_confidence': validated['gis_validation']['spatial_confidence'],
            'gis_issues': issues,
            'review_required': validated['gis_validation']['review_required'] or comparison['comparison']['review_required'],
            'classification': comparison['comparison']['classification'],
            'geometry_valid': validated['gis_validation']['geometry_valid'],
            'spatial_relationships': [],
            'gis_validation': {
                'geometry_type': validated['gis_validation']['geometry_type'],
                'geometry_valid': validated['gis_validation']['geometry_valid'],
                'area': validated['gis_validation']['area'],
                'boundary': validated['gis_validation']['boundary'],
                'spatial_confidence': validated['gis_validation']['spatial_confidence'],
                'review_required': validated['gis_validation']['review_required'] or comparison['comparison']['review_required'],
                'issues': issues,
                'score': validated['gis_validation']['score'],
                'factors': validated['gis_validation']['factors'],
            },
        }
        return result


gis_validation_service = GISValidationService()
