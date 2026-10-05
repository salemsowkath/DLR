from __future__ import annotations

from typing import Any


def normalize_record_key(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, dict):
        value = value.get('value')
    text = str(value).strip().lower()
    return text or None


def detect_duplicate(record_a: dict[str, Any], record_b: dict[str, Any]) -> tuple[bool, list[str]]:
    keys = ['survey_number', 'village', 'taluk', 'district', 'owner_name']
    comparable = []
    for key in keys:
        left = normalize_record_key(record_a.get(key))
        right = normalize_record_key(record_b.get(key))
        if left and right and left == right:
            comparable.append(key)
    if len(comparable) >= 2:
        return True, comparable
    return False, comparable


def detect_conflict(record_a: dict[str, Any], record_b: dict[str, Any]) -> tuple[bool, list[str]]:
    fields: list[str] = []
    left_survey = normalize_record_key(record_a.get('survey_number'))
    right_survey = normalize_record_key(record_b.get('survey_number'))
    if left_survey and right_survey and left_survey == right_survey:
        if normalize_record_key(record_a.get('owner_name')) and normalize_record_key(record_b.get('owner_name')):
            if normalize_record_key(record_a.get('owner_name')) != normalize_record_key(record_b.get('owner_name')):
                fields.append('owner_name')
        if normalize_record_key(record_a.get('area')) and normalize_record_key(record_b.get('area')):
            if normalize_record_key(record_a.get('area')) != normalize_record_key(record_b.get('area')):
                fields.append('area')
        if normalize_record_key(record_a.get('village')) and normalize_record_key(record_b.get('village')):
            if normalize_record_key(record_a.get('village')) != normalize_record_key(record_b.get('village')):
                fields.append('village')
    return bool(fields), fields
