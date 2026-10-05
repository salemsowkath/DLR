from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from docx import Document
from docx.shared import Pt

from app.core.config import settings
from app.services.translation.language_config import FIELD_LABELS, LANGUAGE_NAMES, normalize_output_language
from app.services.translation.translation_service import deterministic_translation_service

WORD_FIELD_MAPPING = {
    'owner_name': 'Owner Name',
    'survey_number': 'Survey Number',
    'khasra_number': 'Khasra Number',
    'khata_number': 'Khata Number',
    'area': 'Land Area',
    'land_classification': 'Land Classification',
    'village': 'Village',
    'taluk': 'Taluk',
    'tehsil': 'Tehsil',
    'district': 'District',
    'state': 'State',
    'registration_number': 'Registration Number',
    'document_number': 'Document Number',
    'date': 'Document Date',
    'mutation_number': 'Mutation Number',
    'patta_number': 'Patta Number',
}


class DOCXGenerator:
    def __init__(self, output_root: str | Path | None = None) -> None:
        self.output_root = Path(output_root or settings.generated_root)
        self.output_root.mkdir(parents=True, exist_ok=True)

    def generate_document(self, document_id: str, filename: str, fields: dict[str, Any], language: str, ocr_text: str) -> dict[str, str]:
        document_dir = self.output_root / document_id
        document_dir.mkdir(parents=True, exist_ok=True)
        normalized_language = normalize_output_language(language)
        translated_fields = deterministic_translation_service.translate_land_record(fields, normalized_language)
        generated = self.generate_land_record_docx(translated_fields, output_language=normalized_language, document_dir=document_dir, filename=filename)

        doc_path = document_dir / 'land_record.docx'
        mapping_path = document_dir / 'land_record_mapping.json'
        text_path = document_dir / 'extracted_text.txt'

        if generated['docx_path'] != str(doc_path):
            shutil.copy2(Path(generated['docx_path']), doc_path)
        if generated['mapping_path'] != str(mapping_path):
            shutil.copy2(Path(generated['mapping_path']), mapping_path)
        text_path.write_text(ocr_text, encoding='utf-8')

        return {
            'docx': str(doc_path.name),
            'mapping_json': str(mapping_path.name),
            'ocr_text': str(text_path.name),
        }

    def generate_land_record_docx(
        self,
        structured_land_record: dict[str, Any],
        output_language: str = 'en',
        document_dir: str | Path | None = None,
        filename: str | None = None,
    ) -> dict[str, str]:
        normalized_language = normalize_output_language(output_language)
        base_dir = Path(document_dir) if document_dir is not None else self.output_root
        documents_dir = base_dir / 'documents'
        mappings_dir = base_dir / 'mappings'
        documents_dir.mkdir(parents=True, exist_ok=True)
        mappings_dir.mkdir(parents=True, exist_ok=True)

        doc_path = base_dir / f'land_record_{normalized_language}.docx'
        mapping_path = base_dir / f'mapping_{normalized_language}.json'
        doc_subpath = documents_dir / f'land_record_{normalized_language}.docx'
        mapping_subpath = mappings_dir / f'mapping_{normalized_language}.json'

        doc = Document()
        doc.styles['Normal'].font.name = 'Noto Sans'
        doc.styles['Normal'].font.size = Pt(11)
        doc.add_heading(f'DLR - {self._document_title(normalized_language)}', 0)
        doc.add_paragraph('AI-assisted land record extraction for review and verification.')
        if filename:
            doc.add_paragraph(f'Source document: {filename}')
        doc.add_paragraph(f'Source Language: {self._source_language_label(structured_land_record)}')
        doc.add_paragraph(f'Output Language: {LANGUAGE_NAMES.get(normalized_language, normalized_language)}')
        doc.add_paragraph('Status: PENDING GOVERNMENT OFFICER VERIFICATION')
        doc.add_paragraph('IMPORTANT: This is AI-generated assistance for review. Final legal verification must be performed by the authorized government officer.')

        field_sections = [
            ('LAND OWNER DETAILS', ['owner_name']),
            ('LAND IDENTIFICATION', ['survey_number', 'khasra_number', 'khata_number', 'area', 'land_classification', 'patta_number']),
            ('LOCATION', ['village', 'taluk', 'tehsil', 'district', 'state']),
            ('DOCUMENT INFORMATION', ['registration_number', 'document_number', 'date', 'mutation_number']),
        ]
        for section_title, field_names in field_sections:
            doc.add_heading(section_title, level=1)
            for field_name in field_names:
                field_value = structured_land_record.get(field_name, {})
                if not isinstance(field_value, dict):
                    continue
                output_value = field_value.get('output_value') or field_value.get('original_value')
                if output_value is None:
                    continue
                label = field_value.get('label') or FIELD_LABELS.get(field_name, {}).get(normalized_language, WORD_FIELD_MAPPING.get(field_name, field_name.replace('_', ' ').title()))
                doc.add_paragraph(f'{label}: {output_value}')

        doc.add_heading('AI EXTRACTION INFORMATION', level=1)
        doc.add_paragraph(f'OCR Confidence: {self._calculate_overall_confidence(structured_land_record):.2f}')
        doc.add_paragraph('Source Document: Original uploaded document')
        doc.add_paragraph('Verification Status: PENDING GOVERNMENT OFFICER VERIFICATION')
        doc.save(str(doc_path))
        shutil.copy2(doc_path, doc_subpath)

        mapping_payload = {
            'document': filename or 'land_record',
            'source_language': self._source_language_label(structured_land_record),
            'output_language': normalized_language,
            'fields': {field_name: field_info for field_name, field_info in structured_land_record.items()},
        }
        mapping_path.write_text(json.dumps(mapping_payload, ensure_ascii=False, indent=2), encoding='utf-8')
        shutil.copy2(mapping_path, mapping_subpath)

        return {
            'docx_path': str(doc_path),
            'mapping_path': str(mapping_path),
            'docx': f'land_record_{normalized_language}.docx',
            'mapping_json': f'mapping_{normalized_language}.json',
            'output_language': normalized_language,
        }

    @staticmethod
    def _document_title(language: str) -> str:
        if language == 'ta':
            return 'டிஜிட்டல் நில ஆவணம்'
        if language == 'hi':
            return 'डिजिटल भूमि अभिलेख'
        return 'DIGITAL LAND RECORD'

    @staticmethod
    def _source_language_label(structured_land_record: dict[str, Any]) -> str:
        for field in structured_land_record.values():
            if isinstance(field, dict):
                original_language = field.get('original_language')
                if original_language:
                    return original_language
        return 'unknown'

    @staticmethod
    def _calculate_overall_confidence(fields: dict[str, Any]) -> float:
        values = []
        for field_value in fields.values():
            if isinstance(field_value, dict):
                confidence = field_value.get('confidence', 0.0)
                if confidence:
                    values.append(float(confidence))
        if not values:
            return 0.0
        return sum(values) / len(values)


docx_generator = DOCXGenerator()
