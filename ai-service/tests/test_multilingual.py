import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from io import BytesIO

from app.main import app
from app.services.translation.translation_service import deterministic_translation_service
from app.services.document.docx_generator import DOCXGenerator

client = TestClient(app)


@pytest.fixture
def sample_land_record():
    return {
        'owner_name': {'value': 'முருகன்', 'confidence': 0.96, 'source_page': 1, 'source_bbox': {'left': 100, 'top': 50, 'width': 120, 'height': 30}, 'source_text': 'முருகன்', 'method': 'rule'},
        'survey_number': {'value': '125/3A', 'confidence': 0.98, 'source_page': 1, 'source_bbox': {'left': 200, 'top': 80, 'width': 120, 'height': 30}, 'source_text': '125/3A', 'method': 'rule'},
        'area': {'value': '2.50 ஏக்கர்', 'confidence': 0.94, 'source_page': 1, 'source_bbox': {'left': 200, 'top': 120, 'width': 150, 'height': 30}, 'source_text': '2.50 ஏக்கர்', 'method': 'rule'},
        'village': {'value': 'சேலம்', 'confidence': 0.95, 'source_page': 1, 'source_bbox': {'left': 200, 'top': 150, 'width': 100, 'height': 30}, 'source_text': 'சேலம்', 'method': 'rule'},
        'taluk': {'value': 'சேலம்', 'confidence': 0.94, 'source_page': 1, 'source_bbox': {'left': 200, 'top': 180, 'width': 100, 'height': 30}, 'source_text': 'சேலம்', 'method': 'rule'},
        'district': {'value': 'சேலம்', 'confidence': 0.93, 'source_page': 1, 'source_bbox': {'left': 200, 'top': 210, 'width': 100, 'height': 30}, 'source_text': 'சேலம்', 'method': 'rule'},
        'date': {'value': '2025-01-15', 'confidence': 0.9, 'source_page': 1, 'source_bbox': {'left': 200, 'top': 240, 'width': 140, 'height': 30}, 'source_text': '2025-01-15', 'method': 'rule'},
    }


def test_multilingual_translation_returns_structured_values(sample_land_record):
    translated = deterministic_translation_service.translate_land_record(sample_land_record, output_language='en')
    assert translated['owner_name']['original_value'] == 'முருகன்'
    assert translated['owner_name']['output_value'] == 'Murugan'
    assert translated['survey_number']['output_value'] == '125/3A'
    assert translated['area']['output_value'] == '2.50 Acres'
    assert translated['village']['output_value'] == 'Salem'
    assert translated['village']['original_language'] == 'ta'


def test_multilingual_docx_generation_creates_valid_files(sample_land_record, tmp_path):
    generator = DOCXGenerator(tmp_path)
    translated = deterministic_translation_service.translate_land_record(sample_land_record, output_language='hi')
    result = generator.generate_land_record_docx(translated, output_language='hi')
    assert Path(tmp_path / 'land_record_hi.docx').exists()
    assert Path(tmp_path / 'mapping_hi.json').exists()
    assert result['output_language'] == 'hi'
    payload = json.loads(Path(tmp_path / 'mapping_hi.json').read_text(encoding='utf-8'))
    assert payload['fields']['owner_name']['original_value'] == 'முருகன்'


def test_generate_docx_endpoint_reuses_document_record(sample_land_record):
    image = Image.new('RGB', (300, 200), color='white')
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr('app.api.routes.documents.ocr_service.extract_document_with_coordinates', lambda *args, **kwargs: {
            'success': True,
            'service': 'dlr-ai-service',
            'operation': 'ocr',
            'filename': 'land_record.png',
            'language': 'tam',
            'document_type': 'image',
            'page_count': 1,
            'overall_confidence': 0.96,
            'pages': [{
                'page_number': 1,
                'text': 'உரிமையாளர் பெயர்: முருகன்\nசர்வே எண்: 125/3A\nபரப்பு: 2.50 ஏக்கர்\nகிராமம்: சேலம்',
                'confidence': 0.96,
                'width': 300,
                'height': 200,
                'words': [
                    {'text': 'உரிமையாளர்', 'confidence': 90.0, 'bbox': {'left': 20, 'top': 30, 'width': 80, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 1, 'word_num': 1},
                    {'text': 'பெயர்:', 'confidence': 90.0, 'bbox': {'left': 100, 'top': 30, 'width': 60, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 1, 'word_num': 2},
                    {'text': 'முருகன்', 'confidence': 90.0, 'bbox': {'left': 170, 'top': 30, 'width': 80, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 1, 'word_num': 3},
                    {'text': 'சர்வே', 'confidence': 90.0, 'bbox': {'left': 20, 'top': 60, 'width': 60, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 2, 'word_num': 1},
                    {'text': 'எண்:', 'confidence': 90.0, 'bbox': {'left': 90, 'top': 60, 'width': 40, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 2, 'word_num': 2},
                    {'text': '125/3A', 'confidence': 90.0, 'bbox': {'left': 140, 'top': 60, 'width': 70, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 2, 'word_num': 3},
                    {'text': 'பரப்பு:', 'confidence': 90.0, 'bbox': {'left': 20, 'top': 90, 'width': 70, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 3, 'word_num': 1},
                    {'text': '2.50', 'confidence': 90.0, 'bbox': {'left': 100, 'top': 90, 'width': 40, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 3, 'word_num': 2},
                    {'text': 'ஏக்கர்', 'confidence': 90.0, 'bbox': {'left': 150, 'top': 90, 'width': 50, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 3, 'word_num': 3},
                    {'text': 'கிராமம்:', 'confidence': 90.0, 'bbox': {'left': 20, 'top': 120, 'width': 70, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 4, 'word_num': 1},
                    {'text': 'சேலம்', 'confidence': 90.0, 'bbox': {'left': 100, 'top': 120, 'width': 60, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 4, 'word_num': 2},
                ],
            }],
        })
        response = client.post(
            '/api/v1/documents/process',
            files={'file': ('land_record.png', buffer.getvalue(), 'image/png')},
            data={'language': 'tam'},
        )

    assert response.status_code == 200
    document_id = response.json()['document']['document_id']
    generate_response = client.post(
        f'/api/v1/documents/{document_id}/generate-docx',
        json={'language': 'en'},
    )
    assert generate_response.status_code == 200
    payload = generate_response.json()
    assert payload['output_language'] == 'en'
    assert payload['docx'].endswith('land_record_en.docx')
    assert payload['mapping_json'].endswith('mapping_en.json')


def test_unsupported_language_is_rejected():
    with pytest.raises(ValueError):
        deterministic_translation_service.translate_land_record({'owner_name': {'value': 'முருகன்'}}, output_language='fr')
