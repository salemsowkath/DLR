from __future__ import annotations

import json
from contextlib import contextmanager
from datetime import date
from typing import Any, Iterator

from app.core.database import connect_database
from app.services.validation.rules import parse_area_value


def _row_value(row: Any, name: str, index: int = 0) -> Any:
    if row is None:
        return None
    return row.get(name) if isinstance(row, dict) else row[index]


class PostgresRepository:
    def __init__(self, connection_factory: Any = connect_database) -> None:
        self.connection_factory = connection_factory

    @contextmanager
    def _cursor(self) -> Iterator[Any]:
        with self.connection_factory() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    yield cursor


class PostgresLandRecordRepository(PostgresRepository):
    def create(self, record_reference: str, fields: dict[str, Any], *, status: str = 'ACTIVE') -> str:
        record_date = self._date_value(fields.get('date'))
        values = {
            'owner_name': self._field_value(fields.get('owner_name')),
            'survey_number': self._field_value(fields.get('survey_number')),
            'area_value': self._area_value(fields.get('area')),
            'area_unit': self._area_unit(fields.get('area')),
            'village': self._field_value(fields.get('village')),
            'taluk': self._field_value(fields.get('taluk')),
            'district': self._field_value(fields.get('district')),
            'classification': self._field_value(fields.get('classification')),
        }
        with self.connection_factory() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute(
                        '''
                        INSERT INTO land_records (
                            record_reference, owner_name, survey_number, area_value, area_unit,
                            village, taluk, district, classification, record_date, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                        ''',
                        (
                            record_reference,
                            values['owner_name'],
                            values['survey_number'],
                            values['area_value'],
                            values['area_unit'],
                            values['village'],
                            values['taluk'],
                            values['district'],
                            values['classification'],
                            record_date,
                            status,
                        ),
                    )
                    record_id = _row_value(cursor.fetchone(), 'id')
                    if record_id is None:
                        raise RuntimeError('Database did not return a land record identifier.')
                    for field_name, field_data in fields.items():
                        field = field_data if isinstance(field_data, dict) else {'value': field_data}
                        cursor.execute(
                            '''
                            INSERT INTO land_record_fields (
                                land_record_id, field_name, field_value, confidence,
                                source, source_page, source_bbox
                            ) VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s::jsonb)
                            ''',
                            (
                                record_id,
                                field_name,
                                json.dumps(field),
                                field.get('confidence'),
                                field.get('source', field.get('method')),
                                field.get('source_page'),
                                json.dumps(field.get('source_bbox')) if field.get('source_bbox') is not None else None,
                            ),
                        )
        return str(record_id)

    def find_by_id(self, record_id: str) -> dict[str, Any] | None:
        with self._cursor() as cursor:
            cursor.execute('SELECT * FROM land_records WHERE id = %s', (record_id,))
            record = cursor.fetchone()
            if record is None:
                return None
            cursor.execute(
                'SELECT field_name, field_value FROM land_record_fields WHERE land_record_id = %s ORDER BY created_at',
                (record_id,),
            )
            fields = cursor.fetchall()
        return {'record': record, 'fields': fields}

    def _field_value(self, field: Any) -> Any:
        return field.get('value') if isinstance(field, dict) else field

    def _area_value(self, field: Any) -> float | None:
        value = self._field_value(field)
        if isinstance(value, (int, float)):
            return float(value)
        parsed = parse_area_value(str(value)) if value is not None else None
        if parsed:
            return float(parsed['value'])
        return None

    def _area_unit(self, field: Any) -> str | None:
        if isinstance(field, dict) and field.get('unit'):
            return str(field['unit'])
        value = self._field_value(field)
        parsed = parse_area_value(str(value)) if value is not None else None
        return str(parsed['unit']) if parsed else None

    def _date_value(self, field: Any) -> date | None:
        value = self._field_value(field)
        if not isinstance(value, str):
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None


class PostgresDocumentRepository(PostgresRepository):
    def create(self, document: dict[str, Any]) -> dict[str, Any]:
        required_fields = (
            'document_id',
            'file_type',
            'original_filename',
            'stored_filename',
            'mime_type',
            'file_size',
            'storage_path',
        )
        missing_fields = [field for field in required_fields if document.get(field) is None]
        if missing_fields:
            raise ValueError(f'Missing document metadata fields: {", ".join(missing_fields)}')

        with self.connection_factory() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute(
                        '''
                        INSERT INTO documents (
                            document_id, land_record_id, document_type, original_filename,
                            stored_filename, mime_type, file_size, storage_reference, checksum,
                            processing_status, language, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING document_id
                        ''',
                        (
                            document['document_id'],
                            document.get('land_record_id'),
                            document['file_type'],
                            document['original_filename'],
                            document['stored_filename'],
                            document['mime_type'],
                            document['file_size'],
                            document['storage_path'],
                            document.get('checksum'),
                            document.get('processing_status', 'UPLOADED'),
                            document.get('language'),
                            document.get('uploaded_at'),
                            document.get('updated_at'),
                        ),
                    )
                    persisted_id = _row_value(cursor.fetchone(), 'document_id')
        if persisted_id is None:
            raise RuntimeError('Database did not return a document identifier.')
        return {**document, 'document_id': str(persisted_id)}

    def find_by_id(self, document_id: str) -> dict[str, Any] | None:
        with self._cursor() as cursor:
            cursor.execute(
                '''
                SELECT document_id, land_record_id, document_type AS file_type,
                    original_filename, stored_filename, mime_type, file_size,
                    storage_reference AS storage_path, checksum, processing_status,
                    language, created_at AS uploaded_at, updated_at
                FROM documents WHERE document_id = %s
                ''',
                (document_id,),
            )
            row = cursor.fetchone()
        if row is None:
            return None
        if isinstance(row, dict):
            return row
        columns = (
            'document_id', 'land_record_id', 'file_type', 'original_filename',
            'stored_filename', 'mime_type', 'file_size', 'storage_path', 'checksum',
            'processing_status', 'language', 'uploaded_at', 'updated_at',
        )
        return dict(zip(columns, row))


class PostgresDocumentExtractionRepository(PostgresRepository):
    def save(
        self,
        document_id: str,
        *,
        language: str | None,
        ocr_status: str,
        extraction_status: str,
        raw_text_reference: str | None,
        structured_result: dict[str, Any],
    ) -> str:
        with self._cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO document_extractions (
                    document_id, language, ocr_status, extraction_status,
                    raw_text_reference, structured_result
                ) VALUES (%s, %s, %s, %s, %s, %s::jsonb) RETURNING id
                ''',
                (document_id, language, ocr_status, extraction_status, raw_text_reference, json.dumps(structured_result)),
            )
            row = cursor.fetchone()
        identifier = _row_value(row, 'id')
        if identifier is None:
            raise RuntimeError('Database did not return an extraction identifier.')
        return str(identifier)


class PostgresValidationResultRepository(PostgresRepository):
    def save(self, land_record_id: str, result: dict[str, Any]) -> str:
        validation = result.get('validation', {}) if isinstance(result, dict) else {}
        with self._cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO validation_results (land_record_id, status, score, review_required, result_json)
                VALUES (%s, %s, %s, %s, %s::jsonb) RETURNING id
                ''',
                (
                    land_record_id,
                    validation.get('status', 'UNAVAILABLE'),
                    validation.get('overall_score'),
                    bool(validation.get('review_required')),
                    json.dumps(result),
                ),
            )
            row = cursor.fetchone()
        identifier = _row_value(row, 'id')
        if identifier is None:
            raise RuntimeError('Database did not return a validation identifier.')
        return str(identifier)


class GISParcelRepository(PostgresRepository):
    def save_parcel(
        self,
        *,
        land_record_id: str,
        parcel_reference: str,
        geometry: dict[str, Any],
        srid: int | None,
        area_value: float | None = None,
        area_unit: str | None = None,
    ) -> dict[str, Any]:
        if not isinstance(srid, int) or srid <= 0:
            raise ValueError('An explicit positive source SRID is required for GIS geometry storage.')
        if not isinstance(geometry, dict) or not geometry.get('type') or 'coordinates' not in geometry:
            raise ValueError('A GeoJSON geometry object is required.')
        if area_value is not None and area_unit is None:
            raise ValueError('An explicit area unit is required when storing a calculated area.')

        with self._cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO gis_parcels (
                    land_record_id, parcel_reference, geometry, geometry_type, srid, area_value, area_unit
                ) VALUES (
                    %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), %s), %s, %s, %s, %s
                )
                RETURNING id, ST_IsValid(geometry) AS geometry_valid, ST_SRID(geometry) AS stored_srid
                ''',
                (
                    land_record_id,
                    parcel_reference,
                    json.dumps(geometry),
                    srid,
                    geometry['type'],
                    srid,
                    area_value,
                    area_unit,
                ),
            )
            row = cursor.fetchone()
        if row is None:
            raise RuntimeError('Database did not return a GIS parcel result.')
        if isinstance(row, dict):
            return row
        return {'id': row[0], 'geometry_valid': row[1], 'stored_srid': row[2]}


class PostgresGISValidationRepository(PostgresRepository):
    def save(self, land_record_id: str, parcel_id: str | None, result: dict[str, Any], *, crs: str | None) -> str:
        validation = result.get('gis_validation', {}) if isinstance(result, dict) else {}
        comparison = result.get('comparison', {}) if isinstance(result, dict) else {}
        boundary = validation.get('boundary', {}) if isinstance(validation, dict) else {}
        relationships = result.get('spatial_relationships', result.get('results', []))
        with self._cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO gis_validation_results (
                    land_record_id, parcel_id, geometry_status, spatial_confidence,
                    review_required, area_comparison, overlap_findings, boundary_findings,
                    crs, result_json
                ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s::jsonb)
                RETURNING id
                ''',
                (
                    land_record_id,
                    parcel_id,
                    'VALID' if validation.get('geometry_valid') else 'INVALID',
                    validation.get('spatial_confidence'),
                    bool(result.get('review_required') or validation.get('review_required')),
                    json.dumps(comparison),
                    json.dumps(relationships),
                    json.dumps(boundary.get('issues', [])),
                    crs,
                    json.dumps(result),
                ),
            )
            row = cursor.fetchone()
        identifier = _row_value(row, 'id')
        if identifier is None:
            raise RuntimeError('Database did not return a GIS validation identifier.')
        return str(identifier)


class PostgresAnomalyRepository(PostgresRepository):
    def add(self, case_id: str, anomaly: Any) -> None:
        data = anomaly.model_dump(mode='json') if hasattr(anomaly, 'model_dump') else anomaly
        with self._cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO review_anomalies (
                    anomaly_id, case_id, type, field, severity, status, source,
                    message, review_required, metadata, created_at, resolved_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
                ''',
                (
                    data['anomaly_id'], case_id, data['anomaly_type'], data.get('field'),
                    data.get('severity', 'WARNING'), data.get('status', 'OPEN'),
                    data.get('source', 'SYSTEM'), data['message'], data.get('review_required', False),
                    json.dumps(data.get('metadata', {})), data['created_at'], None,
                ),
            )


class PostgresAuditRepository(PostgresRepository):
    def add_event(self, case_id: str, event: Any) -> None:
        data = event.model_dump(mode='json') if hasattr(event, 'model_dump') else event
        safe_metadata = data.get('metadata', {})
        with self._cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO audit_events (id, case_id, event_type, actor_type, actor_reference, metadata, created_at)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                ''',
                (
                    data['event_id'], case_id, data['action'], data['actor_role'],
                    data['actor_id'], json.dumps(safe_metadata), data['timestamp'],
                ),
            )
