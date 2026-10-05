from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _record() -> dict:
    return {
        'owner_name': {'value': 'TEST_OWNER_NAME', 'confidence': 0.91, 'source_page': 1, 'source_bbox': [10, 20, 30, 40]},
        'survey_number': {'value': '125/3A', 'confidence': 0.52},
        'area': {'value': '2.50 Acres', 'confidence': 0.88},
        'village': {'value': 'Salem', 'confidence': 0.95},
        'taluk': {'value': 'Salem', 'confidence': 0.94},
        'district': {'value': 'Salem', 'confidence': 0.97},
        'classification': {'value': 'Agricultural', 'confidence': 0.87},
        'date': {'value': '2026-10-05', 'confidence': 0.86},
    }


def _validation_result(*, with_issue: bool = False) -> dict:
    checks = []
    if with_issue:
        checks.append({
            'rule': 'LOW_CONFIDENCE',
            'field': 'survey_number',
            'status': 'REVIEW_REQUIRED',
            'severity': 'WARNING',
            'message': 'Survey number confidence is low.',
            'confidence': 0.52,
        })
    return {
        'success': True,
        'validation': {
            'status': 'REVIEW_REQUIRED' if with_issue else 'PASS',
            'overall_score': 82 if with_issue else 96,
            'checks': checks,
            'issues': checks,
            'review_required': with_issue,
            'summary': {'total_checks': len(checks), 'passed': 0, 'warnings': len(checks), 'errors': 0},
        },
    }


def _gis_result(*, mismatch: bool = False, overlap: bool = False) -> dict:
    classification = 'SIGNIFICANT_MISMATCH' if mismatch else 'MATCH'
    comparison = {
        'document_area': {'value': 2.5, 'unit': 'acre'},
        'gis_area': {'value': 9000.0 if mismatch else 10117.0, 'unit': 'square_metre'},
        'difference': {'absolute': 1117.0 if mismatch else 0.0, 'percentage': 11.03 if mismatch else 0.0},
        'classification': classification,
        'review_required': mismatch,
        'status': classification,
    }
    return {
        'success': True,
        'crs': 'EPSG:32644',
        'gis_validation': {
            'geometry_type': 'Polygon',
            'geometry_valid': True,
            'area': {'value': comparison['gis_area']['value'], 'unit': 'square_metre', 'warning': None},
            'boundary': {'status': 'VALID', 'issues': []},
            'spatial_confidence': 0.86,
            'review_required': mismatch or overlap,
            'issues': [],
            'score': 86,
            'factors': [],
        },
        'comparison': comparison,
        'classification': classification,
        'review_required': mismatch or overlap,
        'spatial_confidence': 0.86,
        'geometry_valid': True,
        'spatial_relationships': [
            {
                'pair': {'parcel_a': '125/3A', 'parcel_b': '125/3B'},
                'relationship': 'OVERLAP',
                'intersection_area': {'value': 500.0, 'unit': 'square_metre'},
                'severity': 'WARNING',
                'review_required': True,
            }
        ] if overlap else [],
    }


def _create_case(*, validation: dict | None = None, gis: dict | None = None, document_id: str = 'DOC-VIEW') -> dict:
    response = client.post(
        '/api/v1/review/cases',
        json={
            'document_id': document_id,
            'land_record': _record(),
            'validation_result': validation if validation is not None else _validation_result(),
            'gis_result': gis,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()['case']


def _view(case_id: str) -> dict:
    response = client.get(f'/api/v1/review/cases/{case_id}/view')
    assert response.status_code == 200, response.text
    return response.json()['data']


def test_view_complete_case_without_anomalies() -> None:
    case = _create_case(validation=_validation_result(), document_id='DOC-VIEW-CLEAN')
    data = _view(case['case_id'])
    assert data['case']['case_id'] == case['case_id']
    assert data['land_record']['owner_name'] == 'TEST_OWNER_NAME'
    assert data['anomaly_summary']['total'] == 0


def test_view_exposes_validation_anomalies() -> None:
    case = _create_case(validation=_validation_result(with_issue=True), document_id='DOC-VIEW-VALIDATION')
    data = _view(case['case_id'])
    assert data['validation']['status'] == 'REVIEW_REQUIRED'
    assert data['validation']['issue_count'] == 1
    assert data['anomalies'][0]['source'] == 'SYSTEM'


def test_view_exposes_gis_anomalies() -> None:
    case = _create_case(gis=_gis_result(mismatch=True), document_id='DOC-VIEW-GIS')
    data = _view(case['case_id'])
    assert data['gis']['status'] == 'REVIEW_REQUIRED'
    assert any(item['source'] == 'GIS' for item in data['anomalies'])


def test_view_combines_validation_and_gis_anomalies() -> None:
    case = _create_case(validation=_validation_result(with_issue=True), gis=_gis_result(mismatch=True), document_id='DOC-VIEW-MIXED')
    data = _view(case['case_id'])
    assert any(item['source'] == 'SYSTEM' for item in data['anomalies'])
    assert any(item['source'] == 'GIS' for item in data['anomalies'])


def test_ai_confidence_summary_reuses_field_values() -> None:
    case = _create_case(validation=_validation_result(with_issue=True), document_id='DOC-VIEW-AI')
    ai = _view(case['case_id'])['ai']
    assert ai['field_confidences']['owner_name'] == 0.91
    assert ai['field_confidences']['survey_number'] == 0.52
    assert ai['overall_confidence'] is None
    assert 'survey_number' in ai['low_confidence_fields']


def test_gis_area_comparison_summary_preserves_units_and_difference() -> None:
    case = _create_case(gis=_gis_result(mismatch=True), document_id='DOC-VIEW-AREA')
    area = _view(case['case_id'])['gis']['area_comparison']
    assert area['document_area'] == {'value': 2.5, 'unit': 'acre'}
    assert area['gis_area'] == {'value': 9000.0, 'unit': 'square_metre'}
    assert area['difference_percent'] == 11.03
    assert area['classification'] == 'SIGNIFICANT_MISMATCH'


def test_gis_overlap_summary_is_available() -> None:
    case = _create_case(gis=_gis_result(overlap=True), document_id='DOC-VIEW-OVERLAP')
    relationships = _view(case['case_id'])['gis']['overlap_findings']
    assert len(relationships) == 1
    assert relationships[0]['relationship'] == 'OVERLAP'


def test_anomaly_counts_are_derived_from_case_anomalies() -> None:
    case = _create_case(gis=_gis_result(mismatch=True, overlap=True), document_id='DOC-VIEW-COUNTS')
    data = _view(case['case_id'])
    assert data['anomaly_summary']['total'] == len(data['anomalies'])
    assert data['anomaly_summary']['open'] == data['anomaly_summary']['total']
    assert data['anomaly_summary']['high'] + data['anomaly_summary']['critical'] >= 1


def test_officer_corrections_are_exposed() -> None:
    case = _create_case(document_id='DOC-VIEW-CORRECTION')
    response = client.post(
        f"/api/v1/review/cases/{case['case_id']}/corrections",
        json={'officer_id': 'OFFICER-VIEW', 'field': 'area', 'new_value': '2.60 Acres', 'reason': 'Verified from register.'},
    )
    assert response.status_code == 200
    corrections = _view(case['case_id'])['officer']['corrections']
    assert corrections[-1]['field'] == 'area'
    assert corrections[-1]['corrected_value'] == '2.60 Acres'
    assert corrections[-1]['officer_id'] == 'OFFICER-VIEW'


def test_officer_notes_are_exposed() -> None:
    case = _create_case(document_id='DOC-VIEW-NOTE')
    response = client.post(f"/api/v1/review/cases/{case['case_id']}/notes", json={'officer_id': 'OFFICER-VIEW', 'text': 'Checked source register.'})
    assert response.status_code == 200
    notes = _view(case['case_id'])['officer']['notes']
    assert notes[-1]['text'] == 'Checked source register.'


def test_audit_summary_contains_safe_recent_events() -> None:
    case = _create_case(gis=_gis_result(mismatch=True), document_id='DOC-VIEW-AUDIT')
    audit = _view(case['case_id'])['audit']
    assert audit['event_count'] >= 2
    assert any(event['event_type'] == 'GIS_FINDINGS_ATTACHED' for event in audit['recent_events'])
    assert all('old_value' not in event and 'new_value' not in event for event in audit['recent_events'])


def test_priority_uses_deterministic_anomaly_severity() -> None:
    case = _create_case(gis=_gis_result(mismatch=True, overlap=True), document_id='DOC-VIEW-PRIORITY')
    assert _view(case['case_id'])['priority'] == 'CRITICAL'


def test_decision_summary_is_a_workflow_hint() -> None:
    case = _create_case(gis=_gis_result(mismatch=True), document_id='DOC-VIEW-DECISION')
    started = client.post(f"/api/v1/review/cases/{case['case_id']}/start", json={'officer_id': 'OFFICER-VIEW'})
    assert started.status_code == 200
    decision = _view(case['case_id'])['decision']
    assert decision['can_approve'] is False
    assert decision['can_request_correction'] is True
    assert decision['can_hold'] is True
    assert decision['blocking_anomalies'] >= 1


def test_missing_gis_data_is_explicit() -> None:
    case = _create_case(document_id='DOC-VIEW-NO-GIS')
    assert _view(case['case_id'])['gis']['status'] == 'UNAVAILABLE'


def test_missing_validation_data_is_explicit() -> None:
    case = _create_case(validation={}, document_id='DOC-VIEW-NO-VALIDATION')
    validation = _view(case['case_id'])['validation']
    assert validation['status'] == 'UNAVAILABLE'
    assert validation['score'] is None


def test_case_view_returns_case_not_found() -> None:
    response = client.get('/api/v1/review/cases/CASE-999999/view')
    assert response.status_code == 404
    assert response.json()['detail']['error'] == 'CASE_NOT_FOUND'


def test_case_list_summary_returns_lightweight_dashboard_rows() -> None:
    case = _create_case(gis=_gis_result(mismatch=True), document_id='DOC-VIEW-LIST')
    response = client.get('/api/v1/review/cases/summary')
    assert response.status_code == 200, response.text
    rows = response.json()['cases']
    item = next(row for row in rows if row['case_id'] == case['case_id'])
    assert item['survey_number'] == '125/3A'
    assert item['gis_review_required'] is True
    assert 'land_record' not in item


def test_non_gis_review_case_view_remains_supported() -> None:
    case = _create_case(document_id='DOC-VIEW-LEGACY')
    data = _view(case['case_id'])
    assert data['gis']['status'] == 'UNAVAILABLE'
    assert data['case']['status'] == 'PENDING_REVIEW'


def test_existing_review_endpoints_remain_functional() -> None:
    case = _create_case(document_id='DOC-VIEW-ENDPOINTS')
    started = client.post(f"/api/v1/review/cases/{case['case_id']}/start", json={'officer_id': 'OFFICER-VIEW'})
    assert started.status_code == 200
    fetched = client.get(f"/api/v1/review/cases/{case['case_id']}")
    assert fetched.status_code == 200
    audit = client.get(f"/api/v1/review/cases/{case['case_id']}/audit")
    assert audit.status_code == 200


def test_sensitive_audit_values_are_not_exposed_in_view_summary() -> None:
    case = _create_case(document_id='DOC-VIEW-PRIVACY')
    correction = client.post(
        f"/api/v1/review/cases/{case['case_id']}/corrections",
        json={'officer_id': 'OFFICER-VIEW', 'field': 'survey_number', 'new_value': '987654321012', 'reason': 'Verified.'},
    )
    assert correction.status_code == 200
    data = _view(case['case_id'])
    audit_text = str(data['audit'])
    assert '987654321012' not in audit_text
    assert all('old_value' not in event and 'new_value' not in event for event in data['audit']['recent_events'])


def test_geographic_crs_area_is_not_reported_as_square_metres() -> None:
    gis = _gis_result(mismatch=True)
    gis['crs'] = 'EPSG:4326'
    gis['gis_validation']['area'] = {'value': None, 'unit': 'square_metre', 'warning': 'AREA_REQUIRES_PROJECTED_CRS'}
    gis['comparison']['gis_area'] = {'value': None, 'unit': 'square_metre'}
    case = _create_case(gis=gis, document_id='DOC-VIEW-GEOGRAPHIC-CRS')
    area = _view(case['case_id'])['gis']['area_comparison']['gis_area']
    assert area['value'] is None
    assert area['warning'] == 'AREA_REQUIRES_PROJECTED_CRS'


def test_invalid_case_identifier_returns_structured_error() -> None:
    response = client.get('/api/v1/review/cases/not-a-case-id/view')
    assert response.status_code == 400
    assert response.json()['detail']['error'] == 'INVALID_CASE_ID'


def test_gis_anomalies_survive_field_correction_without_gis_recalculation() -> None:
    case = _create_case(gis=_gis_result(mismatch=True), document_id='DOC-VIEW-GIS-CORRECTION')
    correction = client.post(
        f"/api/v1/review/cases/{case['case_id']}/corrections",
        json={'officer_id': 'OFFICER-VIEW', 'field': 'area', 'new_value': '2.60 Acres', 'reason': 'Verified against source.'},
    )
    assert correction.status_code == 200
    data = _view(case['case_id'])
    assert any(anomaly['source'] == 'GIS' for anomaly in data['anomalies'])
    assert data['gis']['area_comparison']['gis_area']['value'] == 9000.0
