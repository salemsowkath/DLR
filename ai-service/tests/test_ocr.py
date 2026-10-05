from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services.ocr.languages import LANGUAGE_ALIASES, get_supported_languages
from app.services.ocr.preprocessing import preprocess_image
from app.services.ocr.engine import OCRService, OCRConfigError

client = TestClient(app)


def test_ocr_route_exists() -> None:
    image = Image.new('RGB', (100, 50), color='white')
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr('app.api.routes.ocr.ocr_service.extract_document', lambda *args, **kwargs: {
            'success': True,
            'service': 'dlr-ai-service',
            'operation': 'ocr',
            'filename': 'land_record.png',
            'language': 'tam+eng',
            'document_type': 'image',
            'page_count': 1,
            'overall_confidence': 91.35,
            'pages': [{'page_number': 1, 'text': 'sample text', 'confidence': 91.35}],
        })
        response = client.post(
            '/api/v1/ocr/extract',
            files={'file': ('land_record.png', buffer.getvalue(), 'image/png')},
            data={'language': 'tam+eng'},
        )

    assert response.status_code == 200
    assert response.json()['success'] is True


def test_unsupported_file_type_rejected() -> None:
    payload = {'file': ('notes.txt', b'hello world', 'text/plain')}
    response = client.post('/api/v1/ocr/extract', files=payload)
    assert response.status_code == 415


def test_invalid_language_rejected() -> None:
    image = Image.new('RGB', (20, 20), color='white')
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)

    response = client.post(
        '/api/v1/ocr/extract',
        files={'file': ('invalid.png', buffer.getvalue(), 'image/png')},
        data={'language': 'fra'},
    )
    assert response.status_code == 400


def test_empty_upload_rejected() -> None:
    response = client.post(
        '/api/v1/ocr/extract',
        files={'file': ('empty.png', b'', 'image/png')},
    )
    assert response.status_code == 400


def test_file_size_validation() -> None:
    data = b'x' * (11 * 1024 * 1024)
    response = client.post(
        '/api/v1/ocr/extract',
        files={'file': ('large.png', data, 'image/png')},
    )
    assert response.status_code == 413


def test_language_mapping() -> None:
    assert get_supported_languages()['eng'] == 'eng'
    assert get_supported_languages()['tam'] == 'tam'
    assert get_supported_languages()['hin'] == 'hin'
    assert LANGUAGE_ALIASES['tam+eng'] == 'tam+eng'
    assert LANGUAGE_ALIASES['hin+eng'] == 'hin+eng'


def test_preprocessing_service() -> None:
    image = Image.new('RGB', (40, 30), color='white')
    processed = preprocess_image(image)
    assert processed.size == image.size
    assert processed.mode in {'L', 'RGB'}


def test_ocr_service_configuration() -> None:
    with pytest.MonkeyPatch.context() as mp:
        mp.delenv('TESSERACT_CMD', raising=False)
        mp.setattr('app.services.ocr.engine.os.path.exists', lambda path: False)
        with pytest.raises(OCRConfigError):
            OCRService.resolve_tesseract_cmd()
