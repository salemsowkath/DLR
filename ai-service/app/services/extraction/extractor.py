from __future__ import annotations

import re
from typing import Callable

from app.services.extraction.base import FieldExtractionResult


class LandRecordExtractor:
    """Deterministic land-record extraction from OCR text."""

    FIELD_LABELS = {
        'owner_name': [
            'owner', 'owner name', 'owner_name', 'proprietor', 'land owner', 'உரிமையாளர்', 'உரிமையாளர் பெயர்',
            'मालिक', 'मालिक का नाम', 'मालिक का',
        ],
        'survey_number': [
            'survey', 'survey no', 'survey number', 'survey no.', 'சர்வே', 'சர்வே எண்', 'सर्वे', 'सर्वे नंबर', 'सर्वे क्रमांक',
        ],
        'area': ['area', 'area in', 'பரப்பு', 'क्षेत्रफल', 'क्षेत्र'],
        'village': ['village', 'village name', 'கிராமம்', 'गाँव', 'गांव'],
        'taluk': ['taluk', 'tehsil', 'தாலுகா', 'तहसील'],
        'district': ['district', 'மாவட்டம்', 'जिला'],
        'date': ['date', 'date of registration', 'தேதி', 'दिनांक', 'तारीख'],
    }

    def extract(self, text: str, language: str = 'eng') -> dict[str, FieldExtractionResult]:
        normalized = self._normalize_text(text)
        return {
            'owner_name': self._extract_field(normalized, 'owner_name', self._owner_validator),
            'survey_number': self._extract_field(normalized, 'survey_number', self._survey_validator),
            'area': self._extract_field(normalized, 'area', self._area_validator),
            'village': self._extract_field(normalized, 'village', self._text_validator),
            'taluk': self._extract_field(normalized, 'taluk', self._text_validator),
            'district': self._extract_field(normalized, 'district', self._text_validator),
            'date': self._extract_field(normalized, 'date', self._date_validator),
        }

    def extract_with_source_map(self, ocr_document: dict, text: str, language: str = 'eng') -> dict[str, FieldExtractionResult]:
        extracted = self.extract(text, language)
        for field_name, field_value in extracted.items():
            if field_value.method == 'not_found':
                continue
            source = self._find_source_for_field(ocr_document, field_name, field_value)
            field_value.source_page = source.get('page')
            field_value.source_bbox = source.get('bbox')
            field_value.source_text = source.get('text') or field_value.source_text
        return extracted

    @staticmethod
    def _normalize_text(text: str) -> str:
        value = text.replace('\r', '\n').replace('\t', ' ')
        value = re.sub(r' {2,}', ' ', value)
        value = re.sub(r'\n +', '\n', value)
        return value.strip()

    def _extract_field(
        self,
        text: str,
        field_name: str,
        validator: Callable[[str], bool],
    ) -> FieldExtractionResult:
        labels = sorted(self.FIELD_LABELS.get(field_name, []), key=len, reverse=True)
        if not labels:
            return FieldExtractionResult.not_found()

        fallback = None
        english_match = None

        for line in text.split('\n'):
            for label in labels:
                match = re.search(rf'{re.escape(label)}\s*[:\-]?\s*(.*)', line, flags=re.IGNORECASE | re.UNICODE)
                if not match:
                    continue

                value = self._clean_value(match.group(1))
                if not value:
                    continue

                value = self._strip_label_suffix(value, label)
                if not value or not validator(value):
                    continue

                source_text = line.strip()
                confidence = self._score_confidence(value, source_text)
                result = FieldExtractionResult(value=value, confidence=confidence, source_text=source_text, method='rule')
                if re.search(r'[A-Za-z]', line):
                    english_match = result
                    break
                if fallback is None:
                    fallback = result
            if english_match is not None:
                break

        if english_match is not None:
            return english_match
        if fallback is not None:
            return fallback
        return FieldExtractionResult.not_found()

    @staticmethod
    def _clean_value(value: str) -> str:
        cleaned = value.strip().strip('.,;:|/\\')
        return cleaned or None

    @staticmethod
    def _merge_bboxes(words: list[dict]) -> dict[str, int] | None:
        if not words:
            return None
        lefts = [int(word.get('bbox', {}).get('left', 0)) for word in words]
        tops = [int(word.get('bbox', {}).get('top', 0)) for word in words]
        rights = [int(word.get('bbox', {}).get('left', 0)) + int(word.get('bbox', {}).get('width', 0)) for word in words]
        bottoms = [int(word.get('bbox', {}).get('top', 0)) + int(word.get('bbox', {}).get('height', 0)) for word in words]
        return {
            'left': min(lefts),
            'top': min(tops),
            'width': max(rights) - min(lefts),
            'height': max(bottoms) - min(tops),
        }

    def _find_source_for_field(self, ocr_document: dict, field_name: str, field_value: FieldExtractionResult) -> dict:
        source_text = (field_value.source_text or '').strip()
        page_positions: list[dict] = []
        for page in ocr_document.get('pages', []):
            for word in page.get('words', []):
                text = str(word.get('text', '')).strip()
                if not text:
                    continue
                if source_text and text in source_text:
                    page_positions.append({
                        'page': page.get('page_number', 1),
                        'bbox': word.get('bbox', {}),
                        'text': text,
                    })
        if page_positions:
            bbox = self._merge_bboxes(page_positions)
            return {
                'page': page_positions[0]['page'],
                'bbox': bbox or page_positions[0]['bbox'],
                'text': source_text,
            }

        for page in ocr_document.get('pages', []):
            for word in page.get('words', []):
                if word.get('text') and field_name.replace('_', ' ') in str(word.get('text', '')).lower():
                    return {
                        'page': page.get('page_number', 1),
                        'bbox': word.get('bbox', {}),
                        'text': word.get('text', ''),
                    }
        return {'page': 1, 'bbox': {'left': 0, 'top': 0, 'width': 0, 'height': 0}, 'text': source_text}

    @staticmethod
    def _strip_label_suffix(value: str, label: str) -> str:
        suffixes = [
            r'^(?:no|number|num|எண்|नंबर|नम्बर|क्रमांक)\s*[:\-]?\s*',
            r'^(?:village|taluk|district|owner|survey|area|date)\s*[:\-]?\s*',
        ]
        cleaned = value.strip()
        for suffix in suffixes:
            cleaned = re.sub(suffix, '', cleaned, flags=re.IGNORECASE)
        return cleaned.strip(' .,:;') or None

    @staticmethod
    def _owner_validator(value: str) -> bool:
        return bool(value) and not re.fullmatch(r'\d+[\./\-]?\d*', value)

    @staticmethod
    def _survey_validator(value: str) -> bool:
        return bool(re.search(r'\d', value)) and bool(re.search(r'[/\-A-Za-z0-9]', value))

    @staticmethod
    def _area_validator(value: str) -> bool:
        return bool(re.search(r'\d', value)) and bool(re.search(r'(acre|acres|hectare|hectares|sq|sqm|m²|கி|ஏக்கர்|ক্ষेत्रफल|பரப்பு)', value, flags=re.IGNORECASE))

    @staticmethod
    def _text_validator(value: str) -> bool:
        return bool(value) and not re.fullmatch(r'\d+', value)

    @staticmethod
    def _date_validator(value: str) -> bool:
        return bool(re.search(r'\d{2,4}[-/.]\d{1,2}[-/.]\d{2,4}', value))

    @staticmethod
    def _score_confidence(value: str, source_text: str) -> float:
        score = 0.45
        if value and source_text and re.search(r'[:\-]', source_text):
            score += 0.3
        if re.search(r'\d', value):
            score += 0.15
        if len(value.strip()) >= 2:
            score += 0.1
        return round(min(score, 0.99), 2)
