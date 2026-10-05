from io import BytesIO
from zipfile import ZipFile

from docx import Document
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services.document.docx_generator import DOCXGenerator
from app.services.extraction.extractor import LandRecordExtractor

client = TestClient(app)


def test_docx_generator_creates_valid_document(tmp_path) -> None:
    generator = DOCXGenerator(tmp_path)
    output = generator.generate_document(
        'doc-123',
        'land_record.pdf',
        {
            'owner_name': {'value': 'TEST_OWNER_NAME', 'confidence': 0.95, 'source_page': 1, 'source_bbox': {'left': 10, 'top': 20, 'width': 100, 'height': 30}, 'method': 'rule'},
            'survey_number': {'value': '125/3A', 'confidence': 0.94, 'source_page': 1, 'source_bbox': {'left': 12, 'top': 40, 'width': 80, 'height': 30}, 'method': 'rule'},
        },
        'eng',
        'Owner: TEST_OWNER_NAME\nSurvey No: 125/3A',
    )

    docx_path = tmp_path / 'doc-123' / 'land_record.docx'
    mapping_path = tmp_path / 'doc-123' / 'land_record_mapping.json'
    assert docx_path.exists()
    assert mapping_path.exists()
    with ZipFile(docx_path) as archive:
        assert 'word/document.xml' in archive.namelist()

    loaded = Document(docx_path)
    paragraphs = [paragraph.text for paragraph in loaded.paragraphs]
    assert any('Owner Name' in text for text in paragraphs)
    assert any('125/3A' in text for text in paragraphs)
    assert output['docx'] == 'land_record.docx'


def test_bounding_box_merging() -> None:
    extractor = LandRecordExtractor()
    merged = extractor._merge_bboxes([
        {'bbox': {'left': 10, 'top': 20, 'width': 30, 'height': 15}},
        {'bbox': {'left': 40, 'top': 30, 'width': 20, 'height': 10}},
    ])
    assert merged == {'left': 10, 'top': 20, 'width': 50, 'height': 20}


def test_document_processing_endpoint() -> None:
    image = Image.new('RGB', (300, 200), color='white')
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)

    synthetic_result = {
        'success': True,
        'service': 'dlr-ai-service',
        'operation': 'ocr',
        'filename': 'land_record.png',
        'language': 'eng',
        'document_type': 'image',
        'page_count': 1,
        'overall_confidence': 91.35,
        'pages': [{
            'page_number': 1,
            'text': 'Owner: TEST_OWNER_NAME\nSurvey No: 125/3A\nArea: 2.5 Acres',
            'confidence': 91.35,
            'width': 300,
            'height': 200,
            'words': [
                {'text': 'Owner', 'confidence': 90.0, 'bbox': {'left': 20, 'top': 30, 'width': 50, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 1, 'word_num': 1},
                {'text': 'TEST_OWNER_NAME', 'confidence': 90.0, 'bbox': {'left': 80, 'top': 30, 'width': 120, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 1, 'word_num': 2},
                {'text': 'Survey', 'confidence': 90.0, 'bbox': {'left': 20, 'top': 60, 'width': 60, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 2, 'word_num': 1},
                {'text': 'No:', 'confidence': 90.0, 'bbox': {'left': 90, 'top': 60, 'width': 20, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 2, 'word_num': 2},
                {'text': '125/3A', 'confidence': 90.0, 'bbox': {'left': 120, 'top': 60, 'width': 70, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 2, 'word_num': 3},
                {'text': 'Area:', 'confidence': 90.0, 'bbox': {'left': 20, 'top': 90, 'width': 50, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 3, 'word_num': 1},
                {'text': '2.5', 'confidence': 90.0, 'bbox': {'left': 80, 'top': 90, 'width': 30, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 3, 'word_num': 2},
                {'text': 'Acres', 'confidence': 90.0, 'bbox': {'left': 115, 'top': 90, 'width': 60, 'height': 20}, 'block_num': 1, 'par_num': 1, 'line_num': 3, 'word_num': 3},
            ],
        }],
    }

    with client:
        with __import__('pytest').MonkeyPatch.context() as mp:
            mp.setattr('app.api.routes.documents.ocr_service.extract_document_with_coordinates', lambda *args, **kwargs: synthetic_result)
            response = client.post(
                '/api/v1/documents/process',
                files={'file': ('land_record.png', buffer.getvalue(), 'image/png')},
                data={'language': 'eng'},
            )

    assert response.status_code == 200
    payload = response.json()
    assert payload['success'] is True
    assert payload['fields']['owner_name']['value'] == 'TEST_OWNER_NAME'
    assert payload['fields']['survey_number']['value'] == '125/3A'
    assert payload['fields']['area']['value'] == '2.5 Acres'
    assert payload['ocr']['confidence'] == 91.35
    assert payload['outputs']['docx'] == '/api/v1/documents/' + payload['document']['document_id'] + '/word'
