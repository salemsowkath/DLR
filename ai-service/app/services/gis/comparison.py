from __future__ import annotations

from typing import Any

from app.services.gis.area import GIS_AREA_TOLERANCE_PERCENT, calculate_area_difference, classify_area_difference, convert_to_square_metre
from app.services.gis.geometry import extract_geometry_payload
from app.services.gis.validation import GISValidationService


class GISComparisonService:
    def __init__(self) -> None:
        self.validation_service = GISValidationService()

    def compare_document_area(self, geometry: dict[str, Any], crs: str | None, document_area: dict[str, Any] | None) -> dict[str, Any]:
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

        parsed = self.validation_service.validate_geometry_payload(geometry, crs)
        gis_area_value = parsed['gis_area']['value']
        gis_area_unit = parsed['gis_area']['unit']
        document_value = document_area.get('value')
        document_unit = document_area.get('unit')

        if gis_area_value is None:
            return {
                'success': True,
                'comparison': {
                    'document_area': {'value': document_value, 'unit': document_unit},
                    'gis_area': {'value': None, 'unit': 'square_metre'},
                    'difference': {'absolute': None, 'percentage': None},
                    'classification': 'UNAVAILABLE',
                    'review_required': True,
                    'status': 'UNAVAILABLE',
                },
            }

        diff = calculate_area_difference(document_value, document_unit, gis_area_value, gis_area_unit)
        percentage = diff.get('percentage')
        classification, review_required = classify_area_difference(percentage, GIS_AREA_TOLERANCE_PERCENT)
        return {
            'success': True,
            'comparison': {
                'document_area': {'value': document_value, 'unit': document_unit or 'acre'},
                'gis_area': {'value': round(float(gis_area_value), 4), 'unit': gis_area_unit},
                'difference': diff,
                'classification': classification,
                'review_required': review_required,
                'status': classification,
            },
        }


gis_comparison_service = GISComparisonService()
