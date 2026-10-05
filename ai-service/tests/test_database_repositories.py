from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pytest

from app.core.config import Settings
from app.core.database import DatabaseConfigurationError, connect_database
from app.models.review import Anomaly, AuditEvent, FieldCorrection, OfficerNote, ReviewCase
from app.services.review.postgres_repository import PostgresReviewRepository
from app.services.review.service import ReviewCaseService
from app.services.database.repositories import (
    GISParcelRepository,
    PostgresDocumentRepository,
    PostgresGISValidationRepository,
    PostgresLandRecordRepository,
)


class FakeCursor:
    def __init__(self, database: 'FakeDatabase') -> None:
        self.database = database
        self.result: Any = None
        self.results: list[Any] = []

    def __enter__(self) -> 'FakeCursor':
        return self

    def __exit__(self, *_: Any) -> None:
        return None

    def execute(self, query: str, params: tuple[Any, ...] = ()) -> None:
        normalized = ' '.join(query.lower().split())
        self.database.queries.append((normalized, params))
        if self.database.fail_on and self.database.fail_on in normalized:
            raise RuntimeError('simulated database failure')
        self.result = None
        self.results = []
        if 'nextval' in normalized:
            self.result = {'case_number': self.database.next_case_number}
            self.database.next_case_number += 1
        elif 'insert into documents' in normalized:
            self.result = {'document_id': params[0]}
        elif 'insert into land_records' in normalized:
            self.result = {'id': 'record-demo'}
        elif 'insert into gis_validation_results' in normalized:
            self.result = {'id': 'gis-validation-demo'}
        elif 'insert into review_cases' in normalized or 'update review_cases' in normalized:
            case_id = params[0] if 'insert into review_cases' in normalized else params[-1]
            raw = params[-2] if 'update review_cases' in normalized else params[-1]
            import json
            self.database.cases[case_id] = json.loads(raw) if isinstance(raw, str) else raw
        elif 'select case_data from review_cases' in normalized:
            payload = self.database.cases.get(params[0])
            self.result = {'case_data': payload} if payload is not None else None
        elif 'select case_id, case_data from review_cases' in normalized:
            self.results = [(key, value) for key, value in self.database.cases.items()]
        elif 'insert into gis_parcels' in normalized:
            self.result = {'id': 'parcel-demo', 'geometry_valid': True}

    def fetchone(self) -> Any:
        return self.result

    def fetchall(self) -> list[Any]:
        return self.results


class FakeDatabase:
    def __init__(self) -> None:
        self.queries: list[tuple[str, tuple[Any, ...]]] = []
        self.cases: dict[str, dict[str, Any]] = {}
        self.next_case_number = 1
        self.fail_on: str | None = None
        self.rollbacks = 0
        self.commits = 0

    @contextmanager
    def connect(self):
        yield self

    @contextmanager
    def transaction(self):
        previous_cases = dict(self.cases)
        try:
            yield
        except Exception:
            self.cases = previous_cases
            self.rollbacks += 1
            raise
        else:
            self.commits += 1

    def cursor(self) -> FakeCursor:
        return FakeCursor(self)


def _case() -> ReviewCase:
    return ReviewCase(
        case_id='CASE-000001',
        document_id='DOC-DB-001',
        land_record={'survey_number': {'value': '125/3A', 'confidence': 0.95}},
        original_land_record={'survey_number': {'value': '125/3A', 'confidence': 0.95}},
        validation_result={'validation': {'status': 'PASS', 'overall_score': 95}},
        anomalies=[Anomaly(anomaly_type='GIS_REVIEW_REQUIRED', severity='HIGH', source='GIS', review_required=True, message='Check geometry.')],
        notes=[OfficerNote(case_id='CASE-000001', officer_id='OFFICER-DEMO', text='Synthetic test note.')],
        field_corrections=[FieldCorrection(field='area', original_value='2.5', corrected_value='2.6', reason='test', officer_id='OFFICER-DEMO')],
        audit_events=[AuditEvent(case_id='CASE-000001', actor_id='SYSTEM', actor_role='SYSTEM', action='CASE_CREATED', metadata={'document_id': 'DOC-DB-001'})],
    )


def _unconfigured_postgres_settings() -> Settings:
    return Settings(
        _env_file=None,
        persistence_backend='postgres',
        database_url=None,
        postgres_host=None,
        postgres_port=5432,
        postgres_db=None,
        postgres_user=None,
        postgres_password=None,
    )


def test_memory_backend_is_the_safe_default_and_db_connect_requires_explicit_config() -> None:
    settings = Settings(_env_file=None)
    assert settings.persistence_backend == 'memory'
    with pytest.raises(DatabaseConfigurationError, match='DATABASE_URL'):
        connect_database(_unconfigured_postgres_settings())


def test_database_connection_uses_configured_url_without_exposing_credentials() -> None:
    captured: dict[str, Any] = {}

    def fake_connector(**kwargs: Any) -> str:
        captured.update(kwargs)
        return 'connected-test-double'

    config = Settings(
        _env_file=None,
        persistence_backend='postgres',
        database_url='postgresql://demo:secret@localhost/dlr_database',
    )
    assert connect_database(config, connector=fake_connector) == 'connected-test-double'
    assert captured == {'conninfo': 'postgresql://demo:secret@localhost/dlr_database'}


def test_postgres_connect_requires_explicit_connection_settings() -> None:
    with pytest.raises(DatabaseConfigurationError, match='DATABASE_URL'):
        connect_database(_unconfigured_postgres_settings())


def test_land_record_repository_persists_field_traceability() -> None:
    database = FakeDatabase()
    repository = PostgresLandRecordRepository(connection_factory=database.connect)

    record_id = repository.create(
        'DEMO-RECORD-125-3A',
        {
            'survey_number': {'value': '125/3A', 'confidence': 0.98, 'source_page': 1},
            'area': {'value': '2.50 Acres', 'confidence': 0.91, 'source': 'OCR'},
        },
    )

    assert record_id == 'record-demo'
    area_insert = next(params for query, params in database.queries if 'insert into land_records' in query)
    assert area_insert[3] == 2.5
    assert area_insert[4] == 'acre'
    assert sum('insert into land_record_fields' in query for query, _ in database.queries) == 2


def test_document_repository_persists_document_metadata() -> None:
    database = FakeDatabase()
    repository = PostgresDocumentRepository(connection_factory=database.connect)
    document = {
        'document_id': 'DOC-POSTGRES-UNIT',
        'file_type': 'pdf',
        'original_filename': 'synthetic-land-record.pdf',
        'stored_filename': 'synthetic-land-record.pdf',
        'mime_type': 'application/pdf',
        'file_size': 1,
        'storage_path': 'integration-tests/synthetic-land-record.pdf',
    }

    persisted = repository.create(document)

    assert persisted['document_id'] == document['document_id']
    query, params = next((query, params) for query, params in database.queries if 'insert into documents' in query)
    assert 'returning document_id' in query
    assert params[0] == document['document_id']
    assert params[3] == document['original_filename']


def test_gis_validation_repository_persists_results_and_explicit_crs() -> None:
    database = FakeDatabase()
    repository = PostgresGISValidationRepository(connection_factory=database.connect)
    result_id = repository.save(
        'record-demo',
        None,
        {'gis_validation': {'geometry_valid': True, 'spatial_confidence': 0.9, 'review_required': False}},
        crs='EPSG:32644',
    )

    assert result_id == 'gis-validation-demo'
    params = next(params for query, params in database.queries if 'insert into gis_validation_results' in query)
    assert params[8] == 'EPSG:32644'


def test_database_schema_has_required_tables_and_spatial_index() -> None:
    schema = (Path(__file__).parents[2] / 'database' / 'schema.sql').read_text(encoding='utf-8').lower()
    for table in (
        'users', 'roles', 'user_roles', 'land_records', 'land_record_fields', 'documents',
        'document_extractions', 'validation_results', 'gis_parcels', 'gis_validation_results',
        'review_cases', 'review_anomalies', 'officer_corrections', 'officer_notes', 'audit_events',
    ):
        assert f'create table if not exists {table}' in schema
    assert 'using gist (geometry)' in schema
    assert 'create extension if not exists postgis' in schema
    assert 'geometry geometry not null' in schema
    assert 'owner_name text unique' not in schema
    assert 'aadhaar' not in schema


def test_postgres_review_repository_persists_and_restores_case_aggregate() -> None:
    database = FakeDatabase()
    repository = PostgresReviewRepository(connection_factory=database.connect)
    case = _case()

    repository.create(case)
    assert case.case_id in database.cases
    restored = repository.get_by_id(case.case_id)

    assert restored is not None
    assert restored.case_id == case.case_id
    assert restored.anomalies[0].source == 'GIS'
    assert restored.notes[0].text == 'Synthetic test note.'
    assert restored.field_corrections[0].corrected_value == '2.6'
    assert restored.audit_events[0].action == 'CASE_CREATED'
    statements = [query for query, _ in database.queries]
    for table in ('land_records', 'land_record_fields', 'validation_results', 'review_cases', 'review_anomalies', 'officer_corrections', 'officer_notes', 'audit_events'):
        assert any(f'insert into {table}' in query for query in statements)


def test_postgres_review_repository_rolls_back_child_write_failure() -> None:
    database = FakeDatabase()
    database.fail_on = 'insert into officer_notes'
    repository = PostgresReviewRepository(connection_factory=database.connect)

    with pytest.raises(RuntimeError, match='simulated database failure'):
        repository.create(_case())

    assert database.cases == {}
    assert database.rollbacks == 1


def test_postgres_review_repository_generates_ids_from_database_sequence() -> None:
    database = FakeDatabase()
    repository = PostgresReviewRepository(connection_factory=database.connect)
    assert repository.next_case_id() == 'CASE-000001'
    assert repository.next_case_id() == 'CASE-000002'


def test_review_service_works_through_postgres_repository_interface() -> None:
    database = FakeDatabase()
    service = ReviewCaseService(repository=PostgresReviewRepository(connection_factory=database.connect))

    result = service.create_case(
        'DOC-DB-SERVICE',
        {'survey_number': {'value': '125/3A', 'confidence': 0.98}},
        {'success': True, 'validation': {'status': 'PASS', 'overall_score': 95, 'checks': [], 'issues': [], 'review_required': False}},
    )

    case_id = result['case_id']
    assert service.get_case(case_id)['case']['case_id'] == case_id
    assert database.cases[case_id]['land_record_id'] == 'record-demo'
    assert len(database.cases[case_id]['audit_events']) == 1


def test_gis_parcel_repository_requires_explicit_srid_and_uses_postgis_validation() -> None:
    database = FakeDatabase()
    repository = GISParcelRepository(connection_factory=database.connect)
    polygon = {'type': 'Polygon', 'coordinates': [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}

    with pytest.raises(ValueError, match='SRID'):
        repository.save_parcel(land_record_id='record-1', parcel_reference='125/3A', geometry=polygon, srid=None)

    result = repository.save_parcel(land_record_id='record-1', parcel_reference='125/3A', geometry=polygon, srid=32644)
    assert result['geometry_valid'] is True
    statement = next(query for query, _ in database.queries if 'insert into gis_parcels' in query)
    assert 'st_geomfromgeojson' in statement
    assert 'st_setsrid' in statement
    assert 'st_isvalid' in statement
