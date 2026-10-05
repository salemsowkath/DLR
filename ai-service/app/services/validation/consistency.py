from __future__ import annotations

from typing import Any


def check_field_consistency(record: dict[str, Any]) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    village = record.get('village', {}).get('value') if isinstance(record.get('village'), dict) else record.get('village')
    taluk = record.get('taluk', {}).get('value') if isinstance(record.get('taluk'), dict) else record.get('taluk')
    district = record.get('district', {}).get('value') if isinstance(record.get('district'), dict) else record.get('district')
    if village and taluk and district:
        if village == district and taluk == district:
            return issues
    if village and district and village != district and village != taluk:
        issues.append({
            'rule': 'FIELD_CONSISTENCY',
            'field': 'village',
            'severity': 'WARNING',
            'message': 'Village differs from district; review required if this is an inconsistent record.',
        })
    return issues
