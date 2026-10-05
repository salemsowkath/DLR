from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.services.translation.field_translator import DeterministicTranslationProvider
from app.services.translation.language_config import LEGAL_IDENTIFIER_FIELDS, normalize_output_language


@dataclass
class TranslationResult:
    field: str
    original_value: Any
    original_language: str
    output_language: str
    output_value: Any
    source_page: int | None = None
    source_bbox: dict[str, Any] | None = None
    confidence: float | None = None
    preserved: bool = True
    label: str | None = None


class DeterministicTranslationService:
    def __init__(self, provider: DeterministicTranslationProvider | None = None) -> None:
        self.provider = provider or DeterministicTranslationProvider()

    def translate_land_record(self, land_record: dict[str, Any], output_language: str, source_language: str = 'ta') -> dict[str, dict[str, Any]]:
        normalized_output_language = normalize_output_language(output_language)
        translated: dict[str, dict[str, Any]] = {}

        for field_name, field_data in land_record.items():
            if not isinstance(field_data, dict):
                source = {'value': field_data}
            else:
                source = field_data

            original_value = source.get('value')
            original_language = source.get('language') or source.get('original_language') or source_language or 'ta'
            source_page = source.get('source_page')
            source_bbox = source.get('source_bbox')
            confidence = source.get('confidence', 0.0)
            if original_value in (None, ''):
                translated[field_name] = {
                    'field': field_name,
                    'original_value': None,
                    'original_language': original_language,
                    'output_language': normalized_output_language,
                    'output_value': None,
                    'source_page': source_page,
                    'source_bbox': source_bbox,
                    'confidence': confidence,
                    'preserved': True,
                    'label': self.provider.translate_field_label(field_name, normalized_output_language),
                }
                continue

            if field_name in LEGAL_IDENTIFIER_FIELDS:
                translated_value = original_value
                preserved = True
            else:
                translated_value = self.provider.translate_text(
                    original_value,
                    field_name,
                    normalized_output_language,
                    source_language=original_language,
                )
                preserved = translated_value == original_value

            translated[field_name] = {
                'field': field_name,
                'original_value': original_value,
                'original_language': original_language,
                'output_language': normalized_output_language,
                'output_value': translated_value,
                'source_page': source_page,
                'source_bbox': source_bbox,
                'confidence': confidence,
                'preserved': preserved,
                'label': self.provider.translate_field_label(field_name, normalized_output_language),
            }
        return translated

    def translate_field_label(self, field_name: str, output_language: str) -> str:
        return self.provider.translate_field_label(field_name, output_language)



deterministic_translation_service = DeterministicTranslationService()
