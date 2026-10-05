from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _valid_record() -> dict:
    return {
        'owner_name': {'value': 'TEST_OWNER_NAME', 'confidence': 0.96},
        'survey_number': {'value': '125/3A', 'confidence': 0.98},
        'area': {'value': '2.50 Acres', 'confidence': 0.91},
        'village': {'value': 'Salem', 'confidence': 0.95},
        'taluk': {'value': 'Salem', 'confidence': 0.94},
        'district': {'value': 'Salem', 'confidence': 0.97},
        'date': {'value': '2026-10-05', 'confidence': 0.89},
    }


def test_valid_record_passes_validation() -> None:
    response = client.post('/api/v1/validation/land-record', json=_valid_record())
    assert response.status_code == 200
    payload = response.json()
    assert payload['success'] is True
    assert payload['validation']['status'] in {'PASS', 'WARNING'}


def test_missing_required_field_generates_error() -> None:
    record = _valid_record()
    record.pop('survey_number')
    response = client.post('/api/v1/validation/land-record', json=record)
    assert response.status_code == 200
    payload = response.json()
    assert any(check['rule'] == 'REQUIRED_FIELD' for check in payload['validation']['checks'])


def test_invalid_area_and_zero_area() -> None:
    record = _valid_record()
    record['area'] = {'value': '0 Acres', 'confidence': 0.8}
    response = client.post('/api/v1/validation/land-record', json=record)
    assert response.status_code == 200
    payload = response.json()
    assert any(check['rule'] == 'AREA_VALIDATION' for check in payload['validation']['checks'])

    record['area'] = {'value': '-5 Acres', 'confidence': 0.8}
    response = client.post('/api/v1/validation/land-record', json=record)
    payload = response.json()
    assert any(check['rule'] == 'AREA_VALIDATION' for check in payload['validation']['checks'])


def test_duplicate_and_conflict_detection() -> None:
    record_a = _valid_record()
    record_b = dict(record_a)
    record_b['owner_name'] = {'value': 'TEST_OWNER_NAME', 'confidence': 0.96}
    cmp = client.post('/api/v1/validation/compare', json={'record_a': record_a, 'record_b': record_b})
    payload = cmp.json()
    assert cmp.status_code == 200
    assert payload['comparison']['duplicate'] is True

    record_c = _valid_record()
    record_c['area'] = {'value': '4.0 Acres', 'confidence': 0.9}
    record_c['owner_name'] = {'value': 'OTHER_OWNER', 'confidence': 0.96}
    cmp = client.post('/api/v1/validation/compare', json={'record_a': record_a, 'record_b': record_c})
    payload = cmp.json()
    assert payload['comparison']['conflict'] is True


def test_tamil_and_hindi_records_are_validated() -> None:
    tamil = {
        'owner_name': {'value': 'முருகன்', 'confidence': 0.9},
        'survey_number': {'value': '125/3A', 'confidence': 0.95},
        'area': {'value': '2.50 ஏக்கர்', 'confidence': 0.87},
        'village': {'value': 'சேலம்', 'confidence': 0.9},
        'taluk': {'value': 'சேலம்', 'confidence': 0.9},
        'district': {'value': 'சேலம்', 'confidence': 0.91},
    }
    hi = {
        'owner_name': {'value': 'मुरुगन', 'confidence': 0.9},
        'survey_number': {'value': '125/3A', 'confidence': 0.95},
        'area': {'value': '2.50 एकड़', 'confidence': 0.87},
        'village': {'value': 'सलेम', 'confidence': 0.9},
        'taluk': {'value': 'सलेम', 'confidence': 0.9},
        'district': {'value': 'सलेम', 'confidence': 0.91},
    }

    response_ta = client.post('/api/v1/validation/land-record', json=tamil)
    response_hi = client.post('/api/v1/validation/land-record', json=hi)
    assert response_ta.status_code == 200
    assert response_hi.status_code == 200
    assert response_ta.json()['validation']['status'] in {'PASS', 'WARNING'}
    assert response_hi.json()['validation']['status'] in {'PASS', 'WARNING'}
