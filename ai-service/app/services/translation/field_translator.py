from __future__ import annotations

from abc import ABC, abstractmethod

from app.services.translation.language_config import (
    FIELD_LABELS,
    LAND_CLASSIFICATION_TRANSLATIONS,
    LEGAL_IDENTIFIER_FIELDS,
    PERSONAL_NAME_FIELDS,
    UNIT_TRANSLATIONS,
    normalize_output_language,
)
from app.services.translation.name_handler import transliterate_name


class TranslationProvider(ABC):
    @abstractmethod
    def translate_text(self, value: str | None, field_name: str, output_language: str, source_language: str = 'ta') -> str | None:
        raise NotImplementedError

    @abstractmethod
    def translate_field_label(self, field_name: str, output_language: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def transliterate_name(self, value: str | None, output_language: str) -> str | None:
        raise NotImplementedError

    @abstractmethod
    def translate_land_classification(self, value: str | None, output_language: str) -> str | None:
        raise NotImplementedError


class DeterministicTranslationProvider(TranslationProvider):
    def translate_text(self, value: str | None, field_name: str, output_language: str, source_language: str = 'ta') -> str | None:
        if value is None or value == '':
            return value
        text = str(value).strip()
        if not text:
            return text
        normalized_language = normalize_output_language(output_language)

        if field_name in LEGAL_IDENTIFIER_FIELDS:
            return text
        if field_name in PERSONAL_NAME_FIELDS:
            return self.transliterate_name(text, normalized_language) or text

        if field_name == 'area':
            return self._translate_area_value(text, normalized_language)
        if field_name in {'village', 'taluk', 'tehsil', 'district', 'state'}:
            if normalized_language == 'ta':
                return text
            return transliterate_name(text, normalized_language) or text
        if field_name == 'land_classification':
            return self.translate_land_classification(text, normalized_language) or text
        if source_language == normalized_language:
            return text
        return text

    def translate_field_label(self, field_name: str, output_language: str) -> str:
        normalized_language = normalize_output_language(output_language)
        label_map = FIELD_LABELS.get(field_name, {})
        return label_map.get(normalized_language, field_name.replace('_', ' ').title())

    def transliterate_name(self, value: str | None, output_language: str) -> str | None:
        return transliterate_name(value, output_language)

    def translate_land_classification(self, value: str | None, output_language: str) -> str | None:
        if value is None or value == '':
            return value
        text = str(value).strip().lower()
        mapping = LAND_CLASSIFICATION_TRANSLATIONS.get(text)
        if mapping:
            return mapping.get(output_language, value)
        return value

    @staticmethod
    def _translate_area_value(value: str, output_language: str) -> str:
        text = value.strip()
        for unit, translations in UNIT_TRANSLATIONS.items():
            if unit in text:
                translated_unit = translations.get(output_language, unit)
                if output_language == 'en':
                    return text.replace(unit, translated_unit)
                if output_language == 'hi':
                    return text.replace(unit, translated_unit)
        return text
