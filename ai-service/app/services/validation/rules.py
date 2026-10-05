from __future__ import annotations

import re
from typing import Any

REQUIRED_FIELDS = ['owner_name', 'survey_number', 'area', 'village', 'taluk', 'district']
OPTIONAL_FIELDS = ['date', 'registration_number', 'patta_number', 'khata_number', 'land_classification', 'mutation_number', 'document_number']
CRITICAL_FIELDS = ['owner_name', 'survey_number', 'area', 'village', 'district']

AREA_UNIT_ALIASES = {
    'sq.ft': 'sq.ft',
    'sqft': 'sq.ft',
    'square feet': 'sq.ft',
    'sq.m': 'sq.m',
    'sqm': 'sq.m',
    'square metre': 'sq.m',
    'square meter': 'sq.m',
    'acre': 'acre',
    'acres': 'acre',
    'hectare': 'hectare',
    'hectares': 'hectare',
    'cent': 'cent',
    'cents': 'cent',
    'ஏக்கர்': 'acre',
    'ஏக்கரில்': 'acre',
    'एकड़': 'acre',
    'एकड़ें': 'acre',
}


def get_field_value(record: dict[str, Any], field_name: str) -> dict[str, Any] | None:
    if not isinstance(record, dict):
        return None
    value = record.get(field_name)
    if isinstance(value, dict):
        return value
    if value is None:
        return None
    return {'value': value, 'confidence': 0.0}


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def is_valid_survey_number(value: str | None) -> bool:
    if not value:
        return False
    cleaned = str(value).strip()
    if not cleaned:
        return False
    pattern = r'^(?:\d+|\d+\/\d+|\d+\/\d+[A-Za-z]|\d+\/\d+[A-Za-z]-\d+|\d+\/\d+[A-Za-z]\/\d+)$'
    return bool(re.fullmatch(pattern, cleaned))


def parse_area_value(value: str | None) -> dict[str, Any] | None:
    if not value:
        return None
    text = str(value).strip()
    match = re.search(r'([-+]?\d+(?:\.\d+)?)\s*([A-Za-z.]+|\S+)', text)
    if not match:
        return None
    number = float(match.group(1))
    unit_text = match.group(2).strip().lower()
    unit = AREA_UNIT_ALIASES.get(unit_text, unit_text)
    if not unit:
        return None
    normalized = {
        'value': number,
        'unit': unit,
    }
    if unit == 'sq.ft':
        normalized['sqft'] = number
    elif unit == 'sq.m':
        normalized['sq_m'] = number
    elif unit == 'acre':
        normalized['acre'] = number
    elif unit == 'hectare':
        normalized['hectare'] = number
    elif unit == 'cent':
        normalized['cent'] = number
    return normalized


def is_valid_date(value: str | None) -> bool:
    if not value:
        return False
    text = str(value).strip()
    if not text:
        return False
    for pattern in [r'^\d{4}-\d{2}-\d{2}$', r'^\d{2}/\d{2}/\d{4}$', r'^\d{2}-\d{2}-\d{4}$']:
        if re.fullmatch(pattern, text):
            return True
    return False
