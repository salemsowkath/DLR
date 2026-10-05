from __future__ import annotations

import re
from typing import Any

from app.services.validation.confidence import get_confidence_level
from app.services.validation.consistency import check_field_consistency
from app.services.validation.duplicate_detection import detect_conflict, detect_duplicate
from app.services.validation.rules import (
    CRITICAL_FIELDS,
    OPTIONAL_FIELDS,
    REQUIRED_FIELDS,
    clean_text,
    get_field_value,
    is_valid_date,
    is_valid_survey_number,
    parse_area_value,
)
from app.services.validation.severity import severity_rank


def _make_check(
    rule: str,
    field: str | None,
    status: str,
    severity: str,
    message: str,
    value: Any | None = None,
    confidence: float | None = None,
    source_page: int | None = None,
    source_bbox: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        'rule': rule,
        'field': field,
        'status': status,
        'severity': severity,
        'message': message,
        'value': value,
        'confidence': confidence,
        'source_page': source_page,
        'source_bbox': source_bbox,
    }


class ValidationEngine:
    def validate_land_record(self, record: dict[str, Any]) -> dict[str, Any]:
        checks: list[dict[str, Any]] = []

        for field_name in REQUIRED_FIELDS:
            field_data = get_field_value(record, field_name)
            if not field_data or not clean_text(field_data.get('value')):
                checks.append(
                    _make_check(
                        'REQUIRED_FIELD',
                        field_name,
                        'FAIL',
                        'ERROR',
                        f'{field_name.replace("_", " ").title()} is required.',
                        value=None,
                        confidence=0.0,
                        source_page=field_data.get('source_page') if isinstance(field_data, dict) else None,
                        source_bbox=field_data.get('source_bbox') if isinstance(field_data, dict) else None,
                    )
                )
            else:
                checks.append(
                    _make_check(
                        'REQUIRED_FIELD',
                        field_name,
                        'PASS',
                        'INFO',
                        f'{field_name.replace("_", " ").title()} is present.',
                        value=field_data.get('value'),
                        confidence=float(field_data.get('confidence', 0.0) or 0.0),
                        source_page=field_data.get('source_page') if isinstance(field_data, dict) else None,
                        source_bbox=field_data.get('source_bbox') if isinstance(field_data, dict) else None,
                    )
                )

        survey_field = get_field_value(record, 'survey_number')
        if survey_field and clean_text(survey_field.get('value')):
            survey_value = clean_text(survey_field.get('value'))
            if not is_valid_survey_number(survey_value):
                checks.append(
                    _make_check(
                        'SURVEY_FORMAT',
                        'survey_number',
                        'FAIL',
                        'ERROR',
                        'Survey number is in an invalid format.',
                        value=survey_value,
                        confidence=float(survey_field.get('confidence', 0.0) or 0.0),
                        source_page=survey_field.get('source_page'),
                        source_bbox=survey_field.get('source_bbox'),
                    )
                )
            else:
                checks.append(
                    _make_check(
                        'SURVEY_FORMAT',
                        'survey_number',
                        'PASS',
                        'INFO',
                        'Survey number format is acceptable.',
                        value=survey_value,
                        confidence=float(survey_field.get('confidence', 0.0) or 0.0),
                        source_page=survey_field.get('source_page'),
                        source_bbox=survey_field.get('source_bbox'),
                    )
                )

        area_field = get_field_value(record, 'area')
        if area_field and clean_text(area_field.get('value')):
            area_value = area_field.get('value')
            area_parsed = parse_area_value(str(area_value))
            if area_parsed is None:
                checks.append(
                    _make_check(
                        'AREA_VALIDATION',
                        'area',
                        'FAIL',
                        'ERROR',
                        'Area value is invalid or unsupported.',
                        value=area_value,
                        confidence=float(area_field.get('confidence', 0.0) or 0.0),
                        source_page=area_field.get('source_page'),
                        source_bbox=area_field.get('source_bbox'),
                    )
                )
            else:
                numeric = float(area_parsed['value'])
                if numeric <= 0:
                    checks.append(
                        _make_check(
                            'AREA_VALIDATION',
                            'area',
                            'FAIL',
                            'ERROR',
                            'Area must be greater than zero.',
                            value=area_value,
                            confidence=float(area_field.get('confidence', 0.0) or 0.0),
                            source_page=area_field.get('source_page'),
                            source_bbox=area_field.get('source_bbox'),
                        )
                    )
                else:
                    checks.append(
                        _make_check(
                            'AREA_VALIDATION',
                            'area',
                            'PASS',
                            'INFO',
                            'Area value and unit are valid.',
                            value=area_value,
                            confidence=float(area_field.get('confidence', 0.0) or 0.0),
                            source_page=area_field.get('source_page'),
                            source_bbox=area_field.get('source_bbox'),
                        )
                    )

        for field_name in ['owner_name', 'survey_number', 'area', 'village', 'district']:
            field_data = get_field_value(record, field_name)
            if not field_data:
                continue
            confidence = float(field_data.get('confidence', 0.0) or 0.0)
            level = get_confidence_level(confidence)
            if level == 'LOW':
                checks.append(
                    _make_check(
                        'LOW_CONFIDENCE',
                        field_name,
                        'REVIEW_REQUIRED',
                        'WARNING',
                        f'{field_name.replace("_", " ").title()} extraction confidence is low.',
                        value=field_data.get('value'),
                        confidence=confidence,
                        source_page=field_data.get('source_page'),
                        source_bbox=field_data.get('source_bbox'),
                    )
                )

        date_field = get_field_value(record, 'date')
        if date_field and clean_text(date_field.get('value')):
            date_value = clean_text(date_field.get('value'))
            if not is_valid_date(date_value):
                checks.append(
                    _make_check(
                        'DATE_VALIDATION',
                        'date',
                        'FAIL',
                        'ERROR',
                        'Document date is malformed or unsupported.',
                        value=date_value,
                        confidence=float(date_field.get('confidence', 0.0) or 0.0),
                        source_page=date_field.get('source_page'),
                        source_bbox=date_field.get('source_bbox'),
                    )
                )
            else:
                checks.append(
                    _make_check(
                        'DATE_VALIDATION',
                        'date',
                        'PASS',
                        'INFO',
                        'Document date is valid.',
                        value=date_value,
                        confidence=float(date_field.get('confidence', 0.0) or 0.0),
                        source_page=date_field.get('source_page'),
                        source_bbox=date_field.get('source_bbox'),
                    )
                )

        for issue in check_field_consistency(record):
            checks.append(
                _make_check(
                    issue['rule'],
                    issue.get('field'),
                    'REVIEW_REQUIRED',
                    issue['severity'],
                    issue['message'],
                    value=record.get(issue.get('field'), {}).get('value') if isinstance(record.get(issue.get('field')), dict) else None,
                    confidence=float(record.get(issue.get('field'), {}).get('confidence', 0.0) or 0.0) if isinstance(record.get(issue.get('field')), dict) else None,
                )
            )

        validation_result = self._build_validation_response(checks)
        return validation_result

    def compare_records(self, record_a: dict[str, Any], record_b: dict[str, Any]) -> dict[str, Any]:
        duplicate, duplicate_fields = detect_duplicate(record_a, record_b)
        conflict, conflict_fields = detect_conflict(record_a, record_b)
        checks: list[dict[str, Any]] = []

        if duplicate:
            checks.append(
                _make_check(
                    'POSSIBLE_DUPLICATE',
                    ','.join(duplicate_fields),
                    'REVIEW_REQUIRED',
                    'WARNING',
                    'Potential duplicate land record detected.',
                )
            )
        else:
            checks.append(
                _make_check(
                    'POSSIBLE_DUPLICATE',
                    None,
                    'PASS',
                    'INFO',
                    'Records appear distinct.',
                )
            )

        if conflict:
            checks.append(
                _make_check(
                    'CONFLICT',
                    ','.join(conflict_fields),
                    'FAIL',
                    'ERROR',
                    'Potential conflicting land records detected.',
                )
            )
        else:
            checks.append(
                _make_check(
                    'CONFLICT',
                    None,
                    'PASS',
                    'INFO',
                    'No obvious survey conflict detected.',
                )
            )

        status = self._compute_status(checks)
        return {
            'success': True,
            'comparison': {
                'duplicate': duplicate,
                'conflict': conflict,
                'status': status,
                'checks': checks,
            },
        }

    @staticmethod
    def _compute_status(checks: list[dict[str, Any]]) -> str:
        if any(check.get('severity') in {'CRITICAL', 'ERROR'} and check.get('status') in {'FAIL', 'REVIEW_REQUIRED'} for check in checks):
            return 'FAIL'
        if any(check.get('severity') == 'WARNING' for check in checks):
            return 'WARNING'
        if any(check.get('status') == 'REVIEW_REQUIRED' for check in checks):
            return 'REVIEW_REQUIRED'
        return 'PASS'

    @staticmethod
    def _build_validation_response(checks: list[dict[str, Any]]) -> dict[str, Any]:
        issues = [check for check in checks if check['status'] != 'PASS']
        warning_count = sum(1 for check in checks if check.get('severity') == 'WARNING')
        error_count = sum(1 for check in checks if check.get('severity') == 'ERROR')
        passed = sum(1 for check in checks if check['status'] == 'PASS')

        score = 100.0
        for check in checks:
            if check.get('severity') == 'ERROR':
                score -= 20
            elif check.get('severity') == 'WARNING':
                score -= 10
            elif check.get('status') == 'REVIEW_REQUIRED':
                score -= 15
        if score < 0:
            score = 0.0

        status = ValidationEngine._compute_status(checks)
        return {
            'success': True,
            'validation': {
                'status': status,
                'overall_score': round(score, 2),
                'checks': checks,
                'issues': issues,
                'review_required': status in {'REVIEW_REQUIRED', 'FAIL'},
                'summary': {
                    'total_checks': len(checks),
                    'passed': passed,
                    'warnings': warning_count,
                    'errors': error_count,
                },
            },
        }


validation_engine = ValidationEngine()
