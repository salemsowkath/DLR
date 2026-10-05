from __future__ import annotations

CONFIDENCE_THRESHOLDS = {
    'HIGH': 0.85,
    'MEDIUM': 0.60,
    'LOW': 0.0,
}


def get_confidence_level(confidence: float | None) -> str:
    if confidence is None:
        return 'LOW'
    if confidence >= CONFIDENCE_THRESHOLDS['HIGH']:
        return 'HIGH'
    if confidence >= CONFIDENCE_THRESHOLDS['MEDIUM']:
        return 'MEDIUM'
    return 'LOW'
