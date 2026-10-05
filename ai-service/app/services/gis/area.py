from __future__ import annotations

from typing import Any

GIS_AREA_TOLERANCE_PERCENT = 2.0

AREA_CONVERSIONS_TO_SQUARE_METRE = {
    'square_metre': 1.0,
    'square_meter': 1.0,
    'sq_m': 1.0,
    'm2': 1.0,
    'square_feet': 0.092903,
    'sq.ft': 0.092903,
    'sqft': 0.092903,
    'ft2': 0.092903,
    'acre': 4046.8564224,
    'acres': 4046.8564224,
    'hectare': 10000.0,
    'hectares': 10000.0,
    'cent': 40.468564224,
    'cents': 40.468564224,
}

AREA_CONVERSIONS_FROM_SQUARE_METRE = {
    'square_metre': lambda v: v,
    'square_meter': lambda v: v,
    'sq_m': lambda v: v,
    'm2': lambda v: v,
    'square_feet': lambda v: v / 0.092903,
    'sq.ft': lambda v: v / 0.092903,
    'sqft': lambda v: v / 0.092903,
    'acre': lambda v: v / 4046.8564224,
    'acres': lambda v: v / 4046.8564224,
    'hectare': lambda v: v / 10000.0,
    'hectares': lambda v: v / 10000.0,
    'cent': lambda v: v / 40.468564224,
    'cents': lambda v: v / 40.468564224,
}


def normalize_area_unit(unit: str | None) -> str:
    if unit is None:
        return 'square_metre'
    text = str(unit).strip().lower()
    aliases = {
        'sqm': 'square_metre',
        'sq.m': 'square_metre',
        'm^2': 'square_metre',
        'm2': 'square_metre',
        'sqft': 'square_feet',
        'sq.ft': 'square_feet',
        'feet2': 'square_feet',
        'acre': 'acre',
        'acres': 'acre',
        'hectare': 'hectare',
        'hectares': 'hectare',
        'cent': 'cent',
        'cents': 'cent',
        'square_meter': 'square_metre',
        'square_metre': 'square_metre',
        'square feet': 'square_feet',
        'square metre': 'square_metre',
        'sq meter': 'square_metre',
        'sq metre': 'square_metre',
        'sq. ft': 'square_feet',
    }
    return aliases.get(text, text)


def convert_to_square_metre(value: float, unit: str | None) -> float:
    normalized = normalize_area_unit(unit)
    factor = AREA_CONVERSIONS_TO_SQUARE_METRE.get(normalized)
    if factor is None:
        raise ValueError(f'Unsupported area unit: {unit}')
    return float(value) * float(factor)


def convert_from_square_metre(value: float, unit: str | None) -> float:
    normalized = normalize_area_unit(unit)
    converter = AREA_CONVERSIONS_FROM_SQUARE_METRE.get(normalized)
    if converter is None:
        raise ValueError(f'Unsupported area unit: {unit}')
    return float(converter(value))


def area_to_output(value: float | None, unit: str | None) -> dict[str, Any]:
    if value is None:
        return {'value': None, 'unit': normalize_area_unit(unit) or 'square_metre'}
    target_unit = normalize_area_unit(unit)
    return {'value': round(float(value), 4), 'unit': target_unit}


def calculate_area_difference(document_value: float | None, document_unit: str | None, gis_value: float | None, gis_unit: str | None) -> dict[str, Any]:
    if document_value is None or gis_value is None:
        return {'absolute': None, 'percentage': None}
    document_sq = convert_to_square_metre(document_value, document_unit)
    gis_sq = convert_to_square_metre(gis_value, gis_unit)
    absolute = abs(gis_sq - document_sq)
    percent = (absolute / document_sq * 100.0) if document_sq else 0.0
    return {'absolute': round(absolute, 4), 'percentage': round(percent, 4)}


def classify_area_difference(percentage: float | None, tolerance: float = GIS_AREA_TOLERANCE_PERCENT) -> tuple[str, bool]:
    if percentage is None:
        return 'UNAVAILABLE', True
    if percentage <= 0:
        return 'MATCH', False
    if percentage <= 2.0:
        return 'MINOR_VARIANCE', False
    if percentage <= tolerance:
        return 'SIGNIFICANT_MISMATCH', True
    return 'SIGNIFICANT_MISMATCH', True
