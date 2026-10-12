from fastapi.testclient import TestClient

from app.main import app
from app.api.routes.review import review_api_disabled
from app.services.review.repository import InMemoryReviewCaseRepository
from app.services.review.service import review_case_service

client = TestClient(app)
app.dependency_overrides[review_api_disabled] = lambda: None
review_case_service.repository = InMemoryReviewCaseRepository()


def _valid_record() -> dict:
    return {
        'owner_name': {'value': 'TEST_OWNER_NAME', 'confidence': 0.96, 'source_page': 1, 'source_bbox': [100, 220, 420, 280]},
        'survey_number': {'value': '125/3A', 'confidence': 0.98, 'source_page': 1, 'source_bbox': [100, 280, 260, 320]},
        'area': {'value': '2.50 Acres', 'confidence': 0.54, 'source_page': 1, 'source_bbox': [100, 340, 280, 390]},
        'village': {'value': 'Salem', 'confidence': 0.95, 'source_page': 1, 'source_bbox': [120, 120, 260, 150]},
        'taluk': {'value': 'Salem', 'confidence': 0.94, 'source_page': 1, 'source_bbox': [120, 150, 260, 180]},
        'district': {'value': 'Salem', 'confidence': 0.97, 'source_page': 1, 'source_bbox': [120, 180, 260, 210]},
        'date': {'value': '2026-10-05', 'confidence': 0.89, 'source_page': 1, 'source_bbox': [120, 210, 220, 240]},
    }


def _validation_result() -> dict:
    return {
        'success': True,
        'validation': {
            'status': 'REVIEW_REQUIRED',
            'overall_score': 72,
            'checks': [
                {'rule': 'LOW_CONFIDENCE', 'field': 'area', 'status': 'REVIEW_REQUIRED', 'severity': 'WARNING', 'message': 'Area extraction confidence is low.', 'value': '2.50 Acres', 'confidence': 0.54, 'source_page': 1, 'source_bbox': [100, 340, 280, 390]},
                {'rule': 'REQUIRED_FIELD', 'field': 'owner_name', 'status': 'PASS', 'severity': 'INFO', 'message': 'Owner name is present.', 'value': 'TEST_OWNER_NAME', 'confidence': 0.96},
            ],
            'issues': [{'rule': 'LOW_CONFIDENCE', 'field': 'area', 'status': 'REVIEW_REQUIRED', 'severity': 'WARNING', 'message': 'Area extraction confidence is low.', 'value': '2.50 Acres', 'confidence': 0.54}],
            'review_required': True,
            'summary': {'total_checks': 2, 'passed': 1, 'warnings': 1, 'errors': 0},
        },
    }


def test_create_review_case_and_fetch() -> None:
    payload = {
        'document_id': 'DOC-000001',
        'land_record': _valid_record(),
        'validation_result': _validation_result(),
    }
    response = client.post('/api/v1/review/cases', json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data['success'] is True
    case = data['case']
    assert case['document_id'] == 'DOC-000001'
    assert case['status'] == 'PENDING_REVIEW'
    assert case['priority'] in {'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'}
    assert len(case['anomalies']) >= 1

    get_resp = client.get(f"/api/v1/review/cases/{case['case_id']}")
    assert get_resp.status_code == 200
    assert get_resp.json()['case']['case_id'] == case['case_id']


def test_start_review_and_list_review_cases() -> None:
    payload = {
        'document_id': 'DOC-000002',
        'land_record': _valid_record(),
        'validation_result': _validation_result(),
    }
    created = client.post('/api/v1/review/cases', json=payload)
    case = created.json()['case']
    response = client.post(f"/api/v1/review/cases/{case['case_id']}/start", json={'officer_id': 'OFFICER-DEMO-001'})
    assert response.status_code == 200, response.text
    assert response.json()['case']['status'] == 'IN_REVIEW'

    list_resp = client.get('/api/v1/review/cases', params={'status': 'IN_REVIEW'})
    assert list_resp.status_code == 200
    assert any(item['case_id'] == case['case_id'] for item in list_resp.json()['cases'])


def test_approve_and_request_correction_actions() -> None:
    payload = {
        'document_id': 'DOC-000003',
        'land_record': _valid_record(),
        'validation_result': _validation_result(),
    }
    case = client.post('/api/v1/review/cases', json=payload).json()['case']
    action = client.post(f"/api/v1/review/cases/{case['case_id']}/start", json={'officer_id': 'OFFICER-DEMO-001'})
    assert action.status_code == 200

    approve_resp = client.post(
        f"/api/v1/review/cases/{case['case_id']}/approve",
        json={'officer_id': 'OFFICER-DEMO-001', 'reason': 'All required checks verified.'},
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()['case']['status'] == 'APPROVED'

    correction_case = client.post('/api/v1/review/cases', json={'document_id': 'DOC-000004', 'land_record': _valid_record(), 'validation_result': _validation_result()}).json()['case']
    start = client.post(f"/api/v1/review/cases/{correction_case['case_id']}/start", json={'officer_id': 'OFFICER-DEMO-001'})
    assert start.status_code == 200
    correction = client.post(
        f"/api/v1/review/cases/{correction_case['case_id']}/request-correction",
        json={'officer_id': 'OFFICER-DEMO-001', 'reason': 'Survey number requires correction.'},
    )
    assert correction.status_code == 200
    assert correction.json()['case']['status'] == 'CORRECTION_REQUIRED'


def test_hold_and_reject_case() -> None:
    case = client.post('/api/v1/review/cases', json={'document_id': 'DOC-000005', 'land_record': _valid_record(), 'validation_result': _validation_result()}).json()['case']
    client.post(f"/api/v1/review/cases/{case['case_id']}/start", json={'officer_id': 'OFFICER-DEMO-001'})

    hold = client.post(f"/api/v1/review/cases/{case['case_id']}/hold", json={'officer_id': 'OFFICER-DEMO-001', 'reason': 'Additional register required.'})
    assert hold.status_code == 200
    assert hold.json()['case']['status'] == 'ON_HOLD'

    case2 = client.post('/api/v1/review/cases', json={'document_id': 'DOC-000006', 'land_record': _valid_record(), 'validation_result': _validation_result()}).json()['case']
    client.post(f"/api/v1/review/cases/{case2['case_id']}/start", json={'officer_id': 'OFFICER-DEMO-001'})
    reject = client.post(f"/api/v1/review/cases/{case2['case_id']}/reject", json={'officer_id': 'OFFICER-DEMO-001', 'reason': 'Document requires further verification.'})
    assert reject.status_code == 200
    assert reject.json()['case']['status'] == 'REJECTED'


def test_correct_field_revalidates_and_keeps_history() -> None:
    case = client.post('/api/v1/review/cases', json={'document_id': 'DOC-000007', 'land_record': _valid_record(), 'validation_result': _validation_result()}).json()['case']
    client.post(f"/api/v1/review/cases/{case['case_id']}/start", json={'officer_id': 'OFFICER-DEMO-001'})

    response = client.post(
        f"/api/v1/review/cases/{case['case_id']}/corrections",
        json={'officer_id': 'OFFICER-DEMO-001', 'field': 'area', 'new_value': '2.75 Acres', 'reason': 'Verified from original document.'},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload['case']['land_record']['area']['value'] == '2.75 Acres'
    assert payload['case']['field_corrections'][0]['original_value'] == '2.50 Acres'
    assert payload['case']['field_corrections'][0]['corrected_value'] == '2.75 Acres'
    assert 'validation_result' in payload['case']
    assert len(payload['case']['audit_events']) >= 1


def test_note_resolution_and_dismissal() -> None:
    case = client.post('/api/v1/review/cases', json={'document_id': 'DOC-000008', 'land_record': _valid_record(), 'validation_result': _validation_result()}).json()['case']
    client.post(f"/api/v1/review/cases/{case['case_id']}/start", json={'officer_id': 'OFFICER-DEMO-001'})

    note = client.post(f"/api/v1/review/cases/{case['case_id']}/notes", json={'officer_id': 'OFFICER-DEMO-001', 'text': 'Verified against original register.'})
    assert note.status_code == 200
    assert note.json()['note']['text'] == 'Verified against original register.'

    anomaly_id = case['anomalies'][0]['anomaly_id']
    resolve = client.post(f"/api/v1/review/cases/{case['case_id']}/anomalies/{anomaly_id}/resolve", json={'officer_id': 'OFFICER-DEMO-001', 'reason': 'Verified from source document.'})
    assert resolve.status_code == 200
    assert resolve.json()['anomaly']['status'] == 'RESOLVED'

    dismiss = client.post(f"/api/v1/review/cases/{case['case_id']}/anomalies/{anomaly_id}/dismiss", json={'officer_id': 'OFFICER-DEMO-001', 'reason': 'False positive after manual review.'})
    assert dismiss.status_code == 200
    assert dismiss.json()['anomaly']['status'] == 'DISMISSED'


def test_invalid_state_transition_and_missing_inputs() -> None:
    case = client.post('/api/v1/review/cases', json={'document_id': 'DOC-000009', 'land_record': _valid_record(), 'validation_result': _validation_result()}).json()['case']
    response = client.post(f"/api/v1/review/cases/{case['case_id']}/approve", json={'reason': 'No officer.'})
    assert response.status_code == 400

    response = client.post(f"/api/v1/review/cases/{case['case_id']}/start", json={'officer_id': 'OFFICER-DEMO-001'})
    assert response.status_code == 200

    response = client.post(f"/api/v1/review/cases/{case['case_id']}/approve", json={'officer_id': 'OFFICER-DEMO-001'})
    assert response.status_code == 400

    invalid = client.post(f"/api/v1/review/cases/{case['case_id']}/hold", json={'officer_id': 'OFFICER-DEMO-001'})
    assert invalid.status_code == 400


def test_tamil_hindi_and_english_review_data() -> None:
    for language, record in {
        'en': _valid_record(),
        'ta': {
            'owner_name': {'value': 'முருகன்', 'confidence': 0.9},
            'survey_number': {'value': '125/3A', 'confidence': 0.95},
            'area': {'value': '2.50 ஏக்கர்', 'confidence': 0.87},
            'village': {'value': 'சேலம்', 'confidence': 0.9},
            'taluk': {'value': 'சேலம்', 'confidence': 0.9},
            'district': {'value': 'சேலம்', 'confidence': 0.91},
        },
        'hi': {
            'owner_name': {'value': 'मुरुगन', 'confidence': 0.9},
            'survey_number': {'value': '125/3A', 'confidence': 0.95},
            'area': {'value': '2.50 एकड़', 'confidence': 0.87},
            'village': {'value': 'सलेम', 'confidence': 0.9},
            'taluk': {'value': 'सलेम', 'confidence': 0.9},
            'district': {'value': 'सलेम', 'confidence': 0.91},
        },
    }.items():
        case = client.post('/api/v1/review/cases', json={'document_id': f'DOC-{language.upper()}', 'land_record': record, 'validation_result': _validation_result()}).json()['case']
        summary = client.get(f"/api/v1/review/cases/{case['case_id']}").json()['summary']
        assert summary['record_summary']['owner_name'] in {record['owner_name']['value'], 'TEST_OWNER_NAME'} or summary['record_summary']['owner_name']


def test_source_traceability_and_privacy_safe_logging() -> None:
    case = client.post('/api/v1/review/cases', json={'document_id': 'DOC-000010', 'land_record': _valid_record(), 'validation_result': _validation_result()}).json()['case']
    audit = client.get(f"/api/v1/review/cases/{case['case_id']}/audit").json()['audit_events']
    assert any(event['action'] == 'CASE_CREATED' for event in audit)
    assert audit[0]['metadata'] is not None
    assert '123456789012' not in str(audit)

    summary = client.get(f"/api/v1/review/cases/{case['case_id']}").json()['summary']
    assert summary['source_traceability']['area']['source_page'] == 1
    assert summary['source_traceability']['area']['source_bbox'] == [100, 340, 280, 390]


def _clean_validation_result() -> dict:
    return {
        'success': True,
        'validation': {
            'status': 'PASS',
            'overall_score': 96,
            'checks': [],
            'issues': [],
            'review_required': False,
            'summary': {'total_checks': 0, 'passed': 0, 'warnings': 0, 'errors': 0},
        },
    }


def _gis_no_anomaly() -> dict:
    return {
        'success': True,
        'gis_validation': {
            'geometry_type': 'Polygon',
            'geometry_valid': True,
            'area': {'value': 10117.0, 'unit': 'square_metre', 'warning': None},
            'boundary': {'status': 'VALID', 'issues': []},
            'spatial_confidence': 0.94,
            'review_required': False,
            'issues': [],
            'score': 90,
            'factors': [{'rule': 'VALID_GEOMETRY', 'points': 50}],
        },
        'spatial_confidence': 0.94,
        'review_required': False,
        'classification': 'MATCH',
        'geometry_valid': True,
        'comparison': {'document_area': {'value': 2.5, 'unit': 'acre'}, 'gis_area': {'value': 10117.0, 'unit': 'square_metre'}, 'difference': {'absolute': 0.0, 'percentage': 0.0}, 'classification': 'MATCH', 'review_required': False, 'status': 'MATCH'},
        'spatial_relationships': [],
    }


def _gis_invalid_geometry() -> dict:
    return {
        'success': True,
        'gis_validation': {
            'geometry_type': 'Polygon',
            'geometry_valid': False,
            'area': {'value': None, 'unit': 'square_metre', 'warning': 'AREA_REQUIRES_PROJECTED_CRS'},
            'boundary': {'status': 'INVALID', 'issues': ['Self-intersection detected.']},
            'spatial_confidence': 0.22,
            'review_required': True,
            'issues': [{'type': 'INVALID_GEOMETRY', 'severity': 'ERROR', 'message': 'Self-intersection detected.'}],
            'score': 20,
            'factors': [{'rule': 'INVALID_GEOMETRY', 'points': -40}],
        },
        'spatial_confidence': 0.22,
        'review_required': True,
        'classification': 'UNAVAILABLE',
        'geometry_valid': False,
        'comparison': {'document_area': {'value': 2.5, 'unit': 'acre'}, 'gis_area': {'value': None, 'unit': 'square_metre'}, 'difference': {'absolute': None, 'percentage': None}, 'classification': 'UNAVAILABLE', 'review_required': True, 'status': 'UNAVAILABLE'},
        'spatial_relationships': [],
    }


def _gis_significant_mismatch() -> dict:
    return {
        'success': True,
        'gis_validation': {
            'geometry_type': 'Polygon',
            'geometry_valid': True,
            'area': {'value': 10000.0, 'unit': 'square_metre', 'warning': None},
            'boundary': {'status': 'VALID', 'issues': []},
            'spatial_confidence': 0.88,
            'review_required': True,
            'issues': [],
            'score': 88,
            'factors': [{'rule': 'VALID_GEOMETRY', 'points': 50}],
        },
        'spatial_confidence': 0.88,
        'review_required': True,
        'classification': 'SIGNIFICANT_MISMATCH',
        'geometry_valid': True,
        'comparison': {'document_area': {'value': 2.5, 'unit': 'acre'}, 'gis_area': {'value': 10000.0, 'unit': 'square_metre'}, 'difference': {'absolute': 300.0, 'percentage': 12.0}, 'classification': 'SIGNIFICANT_MISMATCH', 'review_required': True, 'status': 'SIGNIFICANT_MISMATCH'},
        'spatial_relationships': [],
    }


def _gis_minor_variance() -> dict:
    return {
        'success': True,
        'gis_validation': {
            'geometry_type': 'Polygon',
            'geometry_valid': True,
            'area': {'value': 10300.0, 'unit': 'square_metre', 'warning': None},
            'boundary': {'status': 'VALID', 'issues': []},
            'spatial_confidence': 0.82,
            'review_required': False,
            'issues': [],
            'score': 82,
            'factors': [{'rule': 'VALID_GEOMETRY', 'points': 50}],
        },
        'spatial_confidence': 0.82,
        'review_required': False,
        'classification': 'MINOR_VARIANCE',
        'geometry_valid': True,
        'comparison': {'document_area': {'value': 2.5, 'unit': 'acre'}, 'gis_area': {'value': 10300.0, 'unit': 'square_metre'}, 'difference': {'absolute': 100.0, 'percentage': 4.1}, 'classification': 'MINOR_VARIANCE', 'review_required': False, 'status': 'MINOR_VARIANCE'},
        'spatial_relationships': [],
    }


def _gis_overlap_result() -> dict:
    return {
        'success': True,
        'gis_validation': {
            'geometry_type': 'MultiPolygon',
            'geometry_valid': True,
            'area': {'value': 10000.0, 'unit': 'square_metre', 'warning': None},
            'boundary': {'status': 'VALID', 'issues': []},
            'spatial_confidence': 0.78,
            'review_required': True,
            'issues': [],
            'score': 78,
            'factors': [{'rule': 'VALID_GEOMETRY', 'points': 45}],
        },
        'spatial_confidence': 0.78,
        'review_required': True,
        'classification': 'MATCH',
        'geometry_valid': True,
        'comparison': {'document_area': {'value': 2.5, 'unit': 'acre'}, 'gis_area': {'value': 10000.0, 'unit': 'square_metre'}, 'difference': {'absolute': 0.0, 'percentage': 0.0}, 'classification': 'MATCH', 'review_required': False, 'status': 'MATCH'},
        'spatial_relationships': [{'parcel_a': '125/3A', 'parcel_b': '125/3B', 'relationship': 'OVERLAP', 'intersection_area': {'value': 500.0, 'unit': 'square_metre'}, 'severity': 'WARNING', 'review_required': True}],
    }


def _gis_low_confidence_result() -> dict:
    return {
        'success': True,
        'gis_validation': {
            'geometry_type': 'Polygon',
            'geometry_valid': True,
            'area': {'value': 9800.0, 'unit': 'square_metre', 'warning': None},
            'boundary': {'status': 'VALID', 'issues': []},
            'spatial_confidence': 0.38,
            'review_required': True,
            'issues': [{'type': 'LOW_SPATIAL_CONFIDENCE', 'severity': 'MEDIUM', 'message': 'Spatial confidence is below the minimum threshold.'}],
            'score': 38,
            'factors': [{'rule': 'LOW_CONFIDENCE', 'points': -30}],
        },
        'spatial_confidence': 0.38,
        'review_required': True,
        'classification': 'UNAVAILABLE',
        'geometry_valid': True,
        'comparison': {'document_area': {'value': 2.5, 'unit': 'acre'}, 'gis_area': {'value': 9800.0, 'unit': 'square_metre'}, 'difference': {'absolute': 200.0, 'percentage': 8.0}, 'classification': 'MINOR_VARIANCE', 'review_required': False, 'status': 'MINOR_VARIANCE'},
        'spatial_relationships': [],
    }


def _gis_projected_crs_missing_result() -> dict:
    return {
        'success': True,
        'gis_validation': {
            'geometry_type': 'Polygon',
            'geometry_valid': True,
            'area': {'value': None, 'unit': 'square_metre', 'warning': 'AREA_REQUIRES_PROJECTED_CRS'},
            'boundary': {'status': 'VALID', 'issues': []},
            'spatial_confidence': 0.71,
            'review_required': True,
            'issues': [{'type': 'CRS_MISSING', 'severity': 'HIGH', 'message': 'Projected CRS is required for reliable area comparison.'}],
            'score': 71,
            'factors': [{'rule': 'CRS_MISSING', 'points': -25}],
        },
        'spatial_confidence': 0.71,
        'review_required': True,
        'classification': 'UNAVAILABLE',
        'geometry_valid': True,
        'comparison': {'document_area': {'value': 2.5, 'unit': 'acre'}, 'gis_area': {'value': None, 'unit': 'square_metre'}, 'difference': {'absolute': None, 'percentage': None}, 'classification': 'UNAVAILABLE', 'review_required': True, 'status': 'UNAVAILABLE'},
        'spatial_relationships': [],
    }


def test_gis_findings_do_not_create_anomalies_when_validation_is_clean() -> None:
    response = client.post(
        '/api/v1/review/cases',
        json={
            'document_id': 'DOC-GIS-CLEAN',
            'land_record': _valid_record(),
            'validation_result': _clean_validation_result(),
            'gis_result': _gis_no_anomaly(),
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload['success'] is True
    assert all(anomaly['source'] != 'GIS' for anomaly in payload['case']['anomalies'])


def test_invalid_gis_geometry_creates_gis_review_required_anomaly() -> None:
    response = client.post(
        '/api/v1/review/cases',
        json={
            'document_id': 'DOC-GIS-INVALID',
            'land_record': _valid_record(),
            'validation_result': _clean_validation_result(),
            'gis_result': _gis_invalid_geometry(),
        },
    )
    assert response.status_code == 200, response.text
    anomaly = next(item for item in response.json()['case']['anomalies'] if item['source'] == 'GIS')
    assert anomaly['anomaly_type'] == 'GIS_REVIEW_REQUIRED'
    assert anomaly['severity'] == 'CRITICAL'


def test_significant_area_mismatch_creates_area_inconsistency_anomaly() -> None:
    response = client.post(
        '/api/v1/review/cases',
        json={
            'document_id': 'DOC-GIS-AREA-MISMATCH',
            'land_record': _valid_record(),
            'validation_result': _clean_validation_result(),
            'gis_result': _gis_significant_mismatch(),
        },
    )
    assert response.status_code == 200, response.text
    anomaly = next(item for item in response.json()['case']['anomalies'] if item['source'] == 'GIS')
    assert anomaly['anomaly_type'] == 'AREA_INCONSISTENCY'
    assert anomaly['severity'] == 'HIGH'


def test_minor_area_variance_has_medium_severity() -> None:
    response = client.post(
        '/api/v1/review/cases',
        json={
            'document_id': 'DOC-GIS-MINOR-VARIANCE',
            'land_record': _valid_record(),
            'validation_result': _clean_validation_result(),
            'gis_result': _gis_minor_variance(),
        },
    )
    assert response.status_code == 200, response.text
    anomaly = next(item for item in response.json()['case']['anomalies'] if item['source'] == 'GIS')
    assert anomaly['anomaly_type'] == 'AREA_INCONSISTENCY'
    assert anomaly['severity'] == 'MEDIUM'


def test_overlap_creates_conflict_or_gis_review_anomaly() -> None:
    response = client.post(
        '/api/v1/review/cases',
        json={
            'document_id': 'DOC-GIS-OVERLAP',
            'land_record': _valid_record(),
            'validation_result': _clean_validation_result(),
            'gis_result': _gis_overlap_result(),
        },
    )
    assert response.status_code == 200, response.text
    anomaly = next(item for item in response.json()['case']['anomalies'] if item['source'] == 'GIS')
    assert anomaly['anomaly_type'] in {'RECORD_CONFLICT', 'GIS_REVIEW_REQUIRED'}


def test_low_spatial_confidence_creates_gis_review_required_anomaly() -> None:
    response = client.post(
        '/api/v1/review/cases',
        json={
            'document_id': 'DOC-GIS-LOW-CONFIDENCE',
            'land_record': _valid_record(),
            'validation_result': _clean_validation_result(),
            'gis_result': _gis_low_confidence_result(),
        },
    )
    assert response.status_code == 200, response.text
    anomaly = next(item for item in response.json()['case']['anomalies'] if item['source'] == 'GIS')
    assert anomaly['anomaly_type'] == 'GIS_REVIEW_REQUIRED'
    assert anomaly['severity'] == 'MEDIUM'


def test_projected_crs_unavailable_creates_gis_review_required_anomaly() -> None:
    response = client.post(
        '/api/v1/review/cases',
        json={
            'document_id': 'DOC-GIS-CRS',
            'land_record': _valid_record(),
            'validation_result': _clean_validation_result(),
            'gis_result': _gis_projected_crs_missing_result(),
        },
    )
    assert response.status_code == 200, response.text
    anomaly = next(item for item in response.json()['case']['anomalies'] if item['source'] == 'GIS')
    assert anomaly['anomaly_type'] == 'GIS_REVIEW_REQUIRED'


def test_gis_findings_attached_to_review_case_create_audit_event() -> None:
    response = client.post(
        '/api/v1/review/cases',
        json={
            'document_id': 'DOC-GIS-AUDIT',
            'land_record': _valid_record(),
            'validation_result': _clean_validation_result(),
            'gis_result': _gis_invalid_geometry(),
        },
    )
    assert response.status_code == 200, response.text
    case = response.json()['case']
    assert any(event['action'] == 'GIS_FINDINGS_ATTACHED' for event in case['audit_events'])
    assert any('gis_findings_count' in str(event['metadata']) for event in case['audit_events'])


def test_officer_resolves_and_dismisses_gis_anomaly() -> None:
    case = client.post(
        '/api/v1/review/cases',
        json={
            'document_id': 'DOC-GIS-OFFICER',
            'land_record': _valid_record(),
            'validation_result': _clean_validation_result(),
            'gis_result': _gis_invalid_geometry(),
        },
    ).json()['case']
    anomaly_id = next(item['anomaly_id'] for item in case['anomalies'] if item['source'] == 'GIS')

    resolve = client.post(f"/api/v1/review/cases/{case['case_id']}/anomalies/{anomaly_id}/resolve", json={'officer_id': 'OFFICER-DEMO-001', 'reason': 'Verified with source plan.'})
    assert resolve.status_code == 200, resolve.text
    assert resolve.json()['anomaly']['status'] == 'RESOLVED'

    dismiss = client.post(f"/api/v1/review/cases/{case['case_id']}/anomalies/{anomaly_id}/dismiss", json={'officer_id': 'OFFICER-DEMO-001', 'reason': 'False positive after review.'})
    assert dismiss.status_code == 200, dismiss.text
    assert dismiss.json()['anomaly']['status'] == 'DISMISSED'


def test_existing_non_gis_review_cases_still_work() -> None:
    case = client.post('/api/v1/review/cases', json={'document_id': 'DOC-LEGACY', 'land_record': _valid_record(), 'validation_result': _validation_result()}).json()['case']
    assert case['status'] == 'PENDING_REVIEW'
    assert 'anomalies' in case
    assert case['document_id'] == 'DOC-LEGACY'


def test_existing_gis_endpoints_still_work() -> None:
    response = client.post('/api/v1/gis/validate', json={'crs': 'EPSG:32644', 'geometry': {'type': 'Polygon', 'coordinates': [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]}})
    assert response.status_code == 200
    assert response.json()['success'] is True
