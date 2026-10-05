from __future__ import annotations

import os
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.core import database
from app.core.config import Settings
from app.services.database.repositories import GISParcelRepository, PostgresDocumentRepository, PostgresLandRecordRepository
from app.services.review.postgres_repository import PostgresReviewRepository
from app.services.review.service import ReviewCaseService


RUN_POSTGRES_INTEGRATION = os.getenv('DLR_RUN_POSTGRES_INTEGRATION') == '1'
DATABASE_URL = os.getenv('DATABASE_URL')
POSTGRES_SETTINGS = {
    'postgres_host': os.getenv('POSTGRES_HOST'),
    'postgres_port': int(os.getenv('POSTGRES_PORT', '5432')),
    'postgres_db': os.getenv('POSTGRES_DB'),
    'postgres_user': os.getenv('POSTGRES_USER'),
    'postgres_password': os.getenv('POSTGRES_PASSWORD'),
}
HAS_POSTGRES_SETTINGS = all(
    POSTGRES_SETTINGS[key]
    for key in ('postgres_host', 'postgres_db', 'postgres_user', 'postgres_password')
)


@pytest.mark.postgres_integration
@pytest.mark.skipif(
    not (RUN_POSTGRES_INTEGRATION and (DATABASE_URL or HAS_POSTGRES_SETTINGS)),
    reason='Set DLR_RUN_POSTGRES_INTEGRATION=1 and DATABASE_URL or all POSTGRES_* settings to run the live PostgreSQL integration test.',
)
def test_review_case_persists_and_restores_through_real_postgres() -> None:
    database_settings = Settings(
        _env_file=None,
        persistence_backend='postgres',
        database_url=DATABASE_URL,
        **POSTGRES_SETTINGS,
    )
    connect = lambda: database.connect_database(database_settings)
    document_repository = PostgresDocumentRepository(connection_factory=connect)
    repository = PostgresReviewRepository(connection_factory=connect)
    parcel_repository = GISParcelRepository(connection_factory=connect)
    service = ReviewCaseService(repository=repository)
    unique_id = uuid4().hex.upper()
    document_id = f'DOC-POSTGRES-{unique_id}'
    record_reference = f'REVIEW-POSTGRES-{unique_id}'
    parcel_reference = f'PARCEL-POSTGRES-{unique_id}'
    case_id: str | None = None
    land_record_id: str | None = None

    try:
        land_record = {
            'owner_name': {'value': 'TEST_OWNER_NAME', 'confidence': 0.98, 'source': 'SYNTHETIC_TEST'},
            'survey_number': {'value': '125/3A', 'confidence': 0.97, 'source_page': 1, 'source_bbox': [10, 20, 30, 40]},
            'area': {'value': 2.5, 'unit': 'acre', 'confidence': 0.96},
            'village': {'value': 'Test Village', 'confidence': 0.95},
            'taluk': {'value': 'Test Taluk', 'confidence': 0.95},
            'district': {'value': 'Test District', 'confidence': 0.95},
        }
        land_record_id = PostgresLandRecordRepository(connection_factory=connect).create(
            record_reference,
            land_record,
            status='UNDER_REVIEW',
        )

        now = datetime.now(timezone.utc)
        document = document_repository.create(
            {
                'document_id': document_id,
                'land_record_id': land_record_id,
                'file_type': 'pdf',
                'original_filename': f'{document_id}.pdf',
                'stored_filename': f'{document_id}.pdf',
                'mime_type': 'application/pdf',
                'file_size': 1,
                'storage_path': f'integration-tests/{document_id}.pdf',
                'processing_status': 'UPLOADED',
                'language': 'eng',
                'uploaded_at': now,
                'updated_at': now,
            },
        )
        assert document['document_id'] == document_id
        assert document_repository.find_by_id(document_id)['document_id'] == document_id

        validation_result = {
            'success': True,
            'validation': {
                'status': 'PASS',
                'overall_score': 95,
                'checks': [],
                'issues': [],
                'review_required': False,
            },
        }
        gis_result = {
            'success': True,
            'crs': 'EPSG:32644',
            'gis_validation': {
                'geometry_type': 'Polygon',
                'geometry_valid': True,
                'area': {'value': 10000.0, 'unit': 'square_metre'},
                'spatial_confidence': 0.94,
                'review_required': False,
                'issues': [],
                'score': 94,
            },
            'spatial_confidence': 0.94,
            'review_required': False,
            'classification': 'MATCH',
            'geometry_valid': True,
            'comparison': {
                'document_area': {'value': 2.5, 'unit': 'acre'},
                'gis_area': {'value': 10000.0, 'unit': 'square_metre'},
                'difference': {'absolute': 0.0, 'percentage': 0.0},
                'classification': 'MATCH',
                'review_required': False,
                'status': 'MATCH',
            },
            'spatial_relationships': [],
        }

        result = service.create_case(
            document_id,
            land_record,
            validation_result,
            gis_result=gis_result,
            land_record_id=land_record_id,
        )
        case_id = result['case_id']
        assert result['document_id'] == document_id

        restored = service.get_case(case_id)
        assert restored['case']['case_id'] == case_id
        assert restored['case']['document_id'] == document_id
        assert restored['case']['land_record']['owner_name']['value'] == 'TEST_OWNER_NAME'
        assert restored['case']['land_record']['survey_number']['value'] == '125/3A'
        assert restored['case']['validation_result']['validation']['status'] == 'PASS'
        assert any(event['action'] == 'CASE_CREATED' for event in restored['case']['audit_events'])

        persisted = repository.get_by_id(case_id)
        assert persisted is not None
        assert persisted.document_id == document_id
        assert str(persisted.land_record_id) == land_record_id
        assert persisted.gis_result == gis_result

        geometry = {
            'type': 'Polygon',
            'coordinates': [[[500000, 1300000], [500010, 1300000], [500010, 1300010], [500000, 1300010], [500000, 1300000]]],
        }
        parcel = parcel_repository.save_parcel(
            land_record_id=land_record_id,
            parcel_reference=parcel_reference,
            geometry=geometry,
            srid=32644,
        )
        assert parcel['geometry_valid'] is True
        assert parcel['stored_srid'] == 32644

        with connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    '''
                    SELECT count(*) FROM land_record_fields
                    WHERE land_record_id = %s AND field_name = 'survey_number'
                        AND field_value->>'value' = '125/3A' AND source_page = 1
                    ''',
                    (land_record_id,),
                )
                traceable_field_count = cursor.fetchone()[0]
                cursor.execute('SELECT count(*) FROM validation_results WHERE land_record_id = %s AND result_json = %s::jsonb', (land_record_id, __import__('json').dumps(validation_result)))
                validation_count = cursor.fetchone()[0]
                cursor.execute("SELECT count(*) FROM gis_validation_results WHERE land_record_id = %s AND result_json->>'spatial_confidence' = '0.94'", (land_record_id,))
                gis_result_count = cursor.fetchone()[0]
                cursor.execute('SELECT count(*) FROM review_cases WHERE case_id = %s AND document_id = %s', (case_id, document_id))
                review_case_count = cursor.fetchone()[0]
                cursor.execute("SELECT count(*) FROM audit_events WHERE case_id = %s AND event_type = 'CASE_CREATED'", (case_id,))
                audit_event_count = cursor.fetchone()[0]
                cursor.execute('SELECT ST_IsValid(geometry), ST_SRID(geometry) FROM gis_parcels WHERE parcel_reference = %s', (parcel_reference,))
                stored_geometry_valid, stored_srid = cursor.fetchone()

        assert traceable_field_count == 1
        assert validation_count == 1
        assert gis_result_count == 1
        assert review_case_count == 1
        assert audit_event_count == 1
        assert stored_geometry_valid is True
        assert stored_srid == 32644
    finally:
        with connect() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    if case_id:
                        cursor.execute('DELETE FROM review_cases WHERE case_id = %s', (case_id,))
                    cursor.execute('DELETE FROM gis_parcels WHERE parcel_reference = %s', (parcel_reference,))
                    cursor.execute('DELETE FROM documents WHERE document_id = %s', (document_id,))
                    cursor.execute('DELETE FROM land_records WHERE record_reference = %s', (record_reference,))
