from __future__ import annotations

from dataclasses import dataclass


@dataclass
class FieldExtractionResult:
    value: str | None
    confidence: float
    source_text: str | None
    method: str = 'rule'
    source_page: int | None = None
    source_bbox: dict[str, int] | None = None

    @classmethod
    def not_found(cls) -> 'FieldExtractionResult':
        return cls(value=None, confidence=0.0, source_text=None, method='not_found', source_page=None, source_bbox=None)
