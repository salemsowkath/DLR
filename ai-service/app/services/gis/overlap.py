from __future__ import annotations

from typing import Any

from shapely.geometry import shape


def pairwise_overlap(features: list[dict[str, Any]]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for index, feature_a in enumerate(features):
        for feature_b in features[index + 1:]:
            if not isinstance(feature_a, dict) or not isinstance(feature_b, dict):
                continue
            geom_a = feature_a.get('geometry')
            geom_b = feature_b.get('geometry')
            if geom_a is None or geom_b is None:
                continue
            try:
                a = shape(geom_a)
                b = shape(geom_b)
            except Exception:
                continue

            if a.is_empty or b.is_empty:
                relationship = 'INVALID'
                review_required = True
                area_value = {'value': 0.0, 'unit': 'square_metre'}
                severity = 'ERROR'
            elif a.disjoint(b):
                relationship = 'DISJOINT'
                review_required = False
                area_value = {'value': 0.0, 'unit': 'square_metre'}
                severity = 'INFO'
            elif a.equals(b):
                relationship = 'EQUAL'
                review_required = True
                area_value = {'value': round(a.intersection(b).area, 4), 'unit': 'square_metre'}
                severity = 'WARNING'
            elif a.contains(b):
                relationship = 'CONTAINS'
                review_required = True
                area_value = {'value': round(a.intersection(b).area, 4), 'unit': 'square_metre'}
                severity = 'WARNING'
            elif a.within(b):
                relationship = 'WITHIN'
                review_required = True
                area_value = {'value': round(a.intersection(b).area, 4), 'unit': 'square_metre'}
                severity = 'WARNING'
            elif a.touches(b):
                relationship = 'TOUCHING'
                review_required = True
                area_value = {'value': round(a.intersection(b).area, 4), 'unit': 'square_metre'}
                severity = 'WARNING'
            elif a.overlaps(b):
                relationship = 'OVERLAP'
                review_required = True
                area_value = {'value': round(a.intersection(b).area, 4), 'unit': 'square_metre'}
                severity = 'WARNING'
            else:
                relationship = 'DISJOINT'
                review_required = False
                area_value = {'value': 0.0, 'unit': 'square_metre'}
                severity = 'INFO'

            pair_a = feature_a.get('properties', {}).get('survey_number', f'parcel_{index}')
            pair_b = feature_b.get('properties', {}).get('survey_number', 'parcel')
            results.append(
                {
                    'pair': {'parcel_a': pair_a, 'parcel_b': pair_b},
                    'relationship': relationship,
                    'intersection_area': area_value,
                    'severity': severity,
                    'review_required': review_required,
                }
            )
    return results
