from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _read_fixture() -> str:
    fixture = Path(__file__).parent / 'fixtures' / 'anonymized_land_record.txt'
    return fixture.read_text(encoding='utf-8')


def test_land_record_extraction_from_text() -> None:
    payload = {
        'text': _read_fixture(),
        'language': 'tam+eng',
    }
    response = client.post('/api/v1/extraction/land-record', json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body['success'] is True
    assert body['extracted_fields']['owner_name']['value'] == 'TEST_OWNER_NAME'
    assert body['extracted_fields']['survey_number']['value'] == '125/3A'
    assert body['extracted_fields']['area']['value'] == '2.5 Acres'
    assert body['extracted_fields']['village']['value'] == 'TEST_VILLAGE'
    assert body['extracted_fields']['district']['value'] == 'TEST_DISTRICT'


def test_missing_field_returns_null() -> None:
    payload = {'text': 'No matching land record data here', 'language': 'eng'}
    response = client.post('/api/v1/extraction/land-record', json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body['extracted_fields']['owner_name']['value'] is None
    assert body['extracted_fields']['survey_number']['value'] is None


def test_invalid_ocr_text_rejected() -> None:
    payload = {'text': '', 'language': 'eng'}
    response = client.post('/api/v1/extraction/land-record', json=payload)

    assert response.status_code == 400
    assert response.json()['detail']['error'] == 'INVALID_OCR_TEXT'


def test_confidence_is_deterministic() -> None:
    payload = {'text': 'Owner: TEST_OWNER_NAME\nSurvey No: 125/3A', 'language': 'eng'}
    response = client.post('/api/v1/extraction/land-record', json=payload)

    assert response.status_code == 200
    owner_confidence = response.json()['extracted_fields']['owner_name']['confidence']
    survey_confidence = response.json()['extracted_fields']['survey_number']['confidence']
    assert 0 <= owner_confidence <= 1
    assert 0 <= survey_confidence <= 1
