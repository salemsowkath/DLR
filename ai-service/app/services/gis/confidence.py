from __future__ import annotations

from typing import Any


def calculate_spatial_score(geometry_valid: bool, crs: str | None, area_available: bool, document_area_available: bool, area_match: bool | None, overlap_detected: bool = False) -> tuple[int, list[dict[str, Any]]]:
    factors: list[dict[str, Any]] = []
    score = 0

    if geometry_valid:
        score += 25
        factors.append({'rule': 'VALID_GEOMETRY', 'points': 25})
    if crs:
        score += 20
        factors.append({'rule': 'VALID_CRS', 'points': 20})
    if area_available:
        score += 20
        factors.append({'rule': 'GIS_AREA_AVAILABLE', 'points': 20})
    if document_area_available:
        score += 15
        factors.append({'rule': 'DOCUMENT_AREA_AVAILABLE', 'points': 15})
    if area_match is True:
        score += 20
        factors.append({'rule': 'AREA_MATCH', 'points': 20})
    if overlap_detected:
        score -= 15
        factors.append({'rule': 'OVERLAP_DETECTED', 'points': -15})

    score = max(0, min(100, score))
    return score, factors


def calculate_spatial_confidence(score: int) -> float:
    return round(score / 100.0, 4)


def should_review(score: int, issues: list[dict[str, Any]] | None = None) -> bool:
    if issues:
        return True
    return score < 80
