from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

from app.core.config import settings
from app.services.document.docx_generator import DOCXGenerator
from app.services.extraction.extractor import LandRecordExtractor
from app.services.translation.language_config import normalize_output_language
from app.services.translation.translation_service import deterministic_translation_service


class DocumentService:
    def __init__(self, output_root: str | Path | None = None) -> None:
        self.output_root = Path(output_root or settings.generated_root)
        self.output_root.mkdir(parents=True, exist_ok=True)
        self.docx_generator = DOCXGenerator(self.output_root)
        self.extractor = LandRecordExtractor()

    def build_outputs(self, document_id: str, filename: str, ocr_result: dict[str, Any], language: str) -> dict[str, Any]:
        document_dir = self.output_root / document_id
        document_dir.mkdir(parents=True, exist_ok=True)

        text_parts = []
        for page in ocr_result.get('pages', []):
            text_parts.append(page.get('text', ''))
        ocr_text = '\n'.join(part for part in text_parts if part).strip()

        extracted = self.extractor.extract_with_source_map(ocr_result, ocr_text, language)
        mapped_fields = {}
        for field_name, result in extracted.items():
            mapped_fields[field_name] = {
                'value': result.value,
                'confidence': result.confidence,
                'source_page': getattr(result, 'source_page', None),
                'source_text': getattr(result, 'source_text', None),
                'source_bbox': getattr(result, 'source_bbox', None),
                'method': result.method,
                'language': language,
            }

        structured_dir = document_dir / 'structured'
        structured_dir.mkdir(parents=True, exist_ok=True)
        structured_path = structured_dir / 'land_record.json'
        structured_path.write_text(json.dumps(mapped_fields, ensure_ascii=False, indent=2), encoding='utf-8')

        preview_dir = document_dir / 'previews'
        preview_dir.mkdir(parents=True, exist_ok=True)
        for page in ocr_result.get('pages', []):
            page_number = page.get('page_number', 1)
            words = page.get('words', [])
            if not words:
                continue
            preview_path = preview_dir / f'page_{page_number}_ocr.png'
            self._render_preview(page, preview_path)

        generated = self.docx_generator.generate_document(document_id, filename, mapped_fields, language, ocr_text)
        return {
            'document_id': document_id,
            'fields': mapped_fields,
            'ocr_text': ocr_text,
            'outputs': generated,
            'document_directory': str(document_dir),
        }

    def generate_language_document(self, document_id: str, structured_record: dict[str, Any], output_language: str) -> dict[str, str]:
        normalized_language = normalize_output_language(output_language)
        document_dir = self.output_root / document_id
        document_dir.mkdir(parents=True, exist_ok=True)
        translated_record = deterministic_translation_service.translate_land_record(structured_record, normalized_language)
        generated = self.docx_generator.generate_land_record_docx(translated_record, normalized_language, document_dir=document_dir)
        return {
            'document_id': document_id,
            'output_language': normalized_language,
            'docx': f'/api/v1/documents/{document_id}/land_record_{normalized_language}.docx',
            'mapping_json': f'/api/v1/documents/{document_id}/mapping_{normalized_language}.json',
            'docx_path': generated['docx_path'],
            'mapping_path': generated['mapping_path'],
        }

    @staticmethod
    def _render_preview(page: dict[str, Any], preview_path: Path) -> None:
        width = max(int(page.get('width', 1000)), 500)
        height = max(int(page.get('height', 1400)), 500)
        image = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(image)
        for word in page.get('words', []):
            bbox = word.get('bbox', {})
            left = int(bbox.get('left', 0))
            top = int(bbox.get('top', 0))
            w = int(bbox.get('width', 0))
            h = int(bbox.get('height', 0))
            draw.rectangle((left, top, left + max(w, 10), top + max(h, 10)), outline='red', width=2)
        image.save(preview_path)


document_service = DocumentService()
