from __future__ import annotations

import json
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Iterator

from app.core.database import connect_database
from app.models.review import ReviewCase
from app.services.review.repository import ReviewCaseRepository
from app.services.validation.rules import parse_area_value


class PostgresReviewRepository(ReviewCaseRepository):
    """Persist complete review aggregates and normalized child rows atomically."""

    def __init__(self, connection_factory: Any = connect_database) -> None:
        self.connection_factory = connection_factory
        self._active_connection: ContextVar[Any | None] = ContextVar(
            f'postgres_review_connection_{id(self)}', default=None
        )

    @contextmanager
    def transaction(self) -> Iterator[None]:
        active_connection = self._active_connection.get()
        if active_connection is not None:
            yield
            return

        with self.connection_factory() as connection:
            with connection.transaction():
                token = self._active_connection.set(connection)
                try:
                    yield
                finally:
                    self._active_connection.reset(token)

    def create(self, case: ReviewCase) -> ReviewCase:
        with self.transaction():
            if case.land_record_id is None:
                case.land_record_id = self._persist_land_record(case)
            with self._cursor() as cursor:
                cursor.execute(
                    '''
                    INSERT INTO review_cases (
                        case_id, document_id, land_record_id, status, priority, validation_score,
                        review_required, created_at, updated_at, case_data
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                    ''',
                    self._case_values(case),
                )
            self._persist_validation_result(case)
            self._persist_gis_result(case)
            self._replace_children(case)
        return case

    def get_by_id(self, case_id: str) -> ReviewCase | None:
        with self._connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute('SELECT case_data FROM review_cases WHERE case_id = %s', (case_id,))
                row = cursor.fetchone()
        if row is None:
            return None
        payload = row.get('case_data') if isinstance(row, dict) else row[0]
        if isinstance(payload, str):
            payload = json.loads(payload)
        return ReviewCase.model_validate(payload)

    def list(
        self,
        *,
        status: str | None = None,
        priority: str | None = None,
        assigned_officer: str | None = None,
        anomaly_type: str | None = None,
    ) -> list[ReviewCase]:
        conditions: list[str] = []
        parameters: list[Any] = []
        if status:
            conditions.append('status = %s')
            parameters.append(status)
        if priority:
            conditions.append('priority = %s')
            parameters.append(priority)
        if assigned_officer:
            conditions.append("case_data->>'assigned_officer' = %s")
            parameters.append(assigned_officer)
        if anomaly_type:
            conditions.append('EXISTS (SELECT 1 FROM review_anomalies a WHERE a.case_id = review_cases.case_id AND a.type = %s)')
            parameters.append(anomaly_type)
        where_clause = f" WHERE {' AND '.join(conditions)}" if conditions else ''

        with self._connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f'SELECT case_id, case_data FROM review_cases{where_clause} ORDER BY created_at DESC',
                    tuple(parameters),
                )
                rows = cursor.fetchall()
        cases = []
        for row in rows:
            payload = row.get('case_data') if isinstance(row, dict) else row[1]
            if isinstance(payload, str):
                payload = json.loads(payload)
            cases.append(ReviewCase.model_validate(payload))
        return cases

    def update(self, case: ReviewCase) -> ReviewCase:
        with self.transaction():
            if case.land_record_id is not None:
                self._update_land_record(case)
            values = self._case_values(case)
            with self._cursor() as cursor:
                cursor.execute(
                    '''
                    UPDATE review_cases
                    SET document_id = %s, land_record_id = %s, status = %s, priority = %s, validation_score = %s,
                        review_required = %s, created_at = %s, updated_at = %s, case_data = %s::jsonb
                    WHERE case_id = %s
                    ''',
                    (
                        case.document_id,
                        case.land_record_id,
                        case.status,
                        case.priority,
                        case.validation_score,
                        self._review_required(case),
                        case.created_at,
                        case.updated_at,
                        values[-1],
                        case.case_id,
                    ),
                )
                if getattr(cursor, 'rowcount', 1) == 0:
                    raise ValueError(f'Case {case.case_id} not found.')
            self._persist_validation_result(case)
            self._persist_gis_result(case)
            self._replace_children(case)
        return case

    def next_case_id(self) -> str:
        with self._connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT nextval('review_case_number_seq') AS case_number")
                row = cursor.fetchone()
        number = row.get('case_number') if isinstance(row, dict) else row[0]
        return f'CASE-{int(number):06d}'

    @contextmanager
    def _connection(self) -> Iterator[Any]:
        active_connection = self._active_connection.get()
        if active_connection is not None:
            yield active_connection
            return
        with self.connection_factory() as connection:
            with connection.transaction():
                yield connection

    @contextmanager
    def _cursor(self) -> Iterator[Any]:
        active_connection = self._active_connection.get()
        if active_connection is not None:
            with active_connection.cursor() as cursor:
                yield cursor
            return
        with self._connection() as connection:
            with connection.cursor() as cursor:
                yield cursor

    def _case_values(self, case: ReviewCase) -> tuple[Any, ...]:
        return (
            case.case_id,
            case.document_id,
            case.land_record_id,
            case.status,
            case.priority,
            case.validation_score,
            self._review_required(case),
            case.created_at,
            case.updated_at,
            json.dumps(case.model_dump(mode='json')),
        )

    def _review_required(self, case: ReviewCase) -> bool:
        validation = case.validation_result.get('validation', {}) if isinstance(case.validation_result, dict) else {}
        gis_result = case.gis_result if isinstance(case.gis_result, dict) else {}
        gis_validation = gis_result.get('gis_validation', {}) if isinstance(gis_result.get('gis_validation'), dict) else {}
        return bool(
            validation.get('review_required')
            or gis_result.get('review_required')
            or gis_validation.get('review_required')
            or any(anomaly.status == 'OPEN' and anomaly.review_required for anomaly in case.anomalies)
        )

    def _replace_children(self, case: ReviewCase) -> None:
        with self._cursor() as cursor:
            for table in ('officer_corrections', 'officer_notes', 'audit_events', 'review_anomalies'):
                cursor.execute(f'DELETE FROM {table} WHERE case_id = %s', (case.case_id,))

            for anomaly in case.anomalies:
                resolved_event = next(
                    (
                        event for event in reversed(case.audit_events)
                        if event.action in {'ANOMALY_RESOLVED', 'ANOMALY_DISMISSED'}
                        and event.metadata.get('anomaly_id') == anomaly.anomaly_id
                    ),
                    None,
                )
                cursor.execute(
                    '''
                    INSERT INTO review_anomalies (
                        anomaly_id, case_id, type, field, severity, status, source,
                        message, review_required, metadata, created_at, resolved_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
                    ''',
                    (
                        anomaly.anomaly_id,
                        case.case_id,
                        anomaly.anomaly_type,
                        anomaly.field,
                        self._database_severity(anomaly.severity),
                        anomaly.status,
                        anomaly.source,
                        anomaly.message,
                        anomaly.review_required,
                        json.dumps(anomaly.metadata),
                        anomaly.created_at,
                        resolved_event.timestamp if resolved_event else None,
                    ),
                )

            for correction in case.field_corrections:
                cursor.execute(
                    '''
                    INSERT INTO officer_corrections (
                        case_id, field, original_value, corrected_value, reason, officer_id, created_at
                    ) VALUES (%s, %s, %s::jsonb, %s::jsonb, %s, %s, %s)
                    ''',
                    (
                        case.case_id,
                        correction.field,
                        json.dumps(correction.original_value),
                        json.dumps(correction.corrected_value),
                        correction.reason,
                        correction.officer_id,
                        correction.timestamp,
                    ),
                )

            for note in case.notes:
                cursor.execute(
                    'INSERT INTO officer_notes (id, case_id, officer_id, note, created_at) VALUES (%s, %s, %s, %s, %s)',
                    (note.note_id, case.case_id, note.officer_id, note.text, note.created_at),
                )

            for event in case.audit_events:
                cursor.execute(
                    '''
                    INSERT INTO audit_events (id, case_id, event_type, actor_type, actor_reference, metadata, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                    ''',
                    (
                        event.event_id,
                        case.case_id,
                        event.action,
                        event.actor_role,
                        event.actor_id,
                        json.dumps(event.metadata),
                        event.timestamp,
                    ),
                )

    def _persist_land_record(self, case: ReviewCase) -> str:
        record = case.land_record
        area_value = record.get('area')
        area_unit = None
        if isinstance(area_value, dict):
            area_unit = area_value.get('unit')
            area_value = area_value.get('value')
        parsed_area = parse_area_value(str(area_value)) if area_value is not None else None
        if parsed_area:
            area_value = parsed_area.get('value')
            area_unit = area_unit or parsed_area.get('unit')
        else:
            area_value = float(area_value) if isinstance(area_value, (int, float)) else None

        with self._cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO land_records (
                    record_reference, owner_name, survey_number, area_value, area_unit,
                    village, taluk, district, classification, record_date, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                ''',
                (
                    f'REVIEW-{case.case_id}',
                    self._field_value(record.get('owner_name')),
                    self._field_value(record.get('survey_number')),
                    area_value,
                    area_unit,
                    self._field_value(record.get('village')),
                    self._field_value(record.get('taluk')),
                    self._field_value(record.get('district')),
                    self._field_value(record.get('classification')),
                    self._date_value(record.get('date')),
                    'UNDER_REVIEW',
                ),
            )
            row = cursor.fetchone()
            land_record_id = row.get('id') if isinstance(row, dict) else row[0]
            if land_record_id is None:
                raise RuntimeError('Database did not return a land record identifier.')
            self._replace_land_record_fields(cursor, str(land_record_id), record)
        return str(land_record_id)

    def _update_land_record(self, case: ReviewCase) -> None:
        record = case.land_record
        area = record.get('area')
        area_value = area.get('value') if isinstance(area, dict) else area
        area_unit = area.get('unit') if isinstance(area, dict) else None
        parsed_area = parse_area_value(str(area_value)) if area_value is not None else None
        if parsed_area:
            area_value = parsed_area.get('value')
            area_unit = area_unit or parsed_area.get('unit')
        elif not isinstance(area_value, (int, float)):
            area_value = None

        with self._cursor() as cursor:
            cursor.execute(
                '''
                UPDATE land_records SET owner_name = %s, survey_number = %s, area_value = %s,
                    area_unit = %s, village = %s, taluk = %s, district = %s,
                    classification = %s, record_date = %s, updated_at = now()
                WHERE id = %s
                ''',
                (
                    self._field_value(record.get('owner_name')),
                    self._field_value(record.get('survey_number')),
                    area_value,
                    area_unit,
                    self._field_value(record.get('village')),
                    self._field_value(record.get('taluk')),
                    self._field_value(record.get('district')),
                    self._field_value(record.get('classification')),
                    self._date_value(record.get('date')),
                    case.land_record_id,
                ),
            )
            self._replace_land_record_fields(cursor, case.land_record_id, record)

    def _replace_land_record_fields(self, cursor: Any, land_record_id: str, record: dict[str, Any]) -> None:
        cursor.execute('DELETE FROM land_record_fields WHERE land_record_id = %s', (land_record_id,))
        for field_name, field_data in record.items():
            field = field_data if isinstance(field_data, dict) else {'value': field_data}
            cursor.execute(
                '''
                INSERT INTO land_record_fields (
                    land_record_id, field_name, field_value, confidence, source, source_page, source_bbox
                ) VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s::jsonb)
                ''',
                (
                    land_record_id,
                    field_name,
                    json.dumps(field),
                    field.get('confidence'),
                    field.get('source', field.get('method')),
                    field.get('source_page'),
                    json.dumps(field.get('source_bbox')) if field.get('source_bbox') is not None else None,
                ),
            )

    def _persist_validation_result(self, case: ReviewCase) -> None:
        if case.land_record_id is None or not case.validation_result:
            return
        validation = case.validation_result.get('validation', {})
        with self._cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO validation_results (land_record_id, status, score, review_required, result_json)
                SELECT %s, %s, %s, %s, %s::jsonb
                WHERE NOT EXISTS (
                    SELECT 1 FROM validation_results
                    WHERE land_record_id = %s AND result_json = %s::jsonb
                )
                ''',
                (
                    case.land_record_id,
                    validation.get('status', 'UNAVAILABLE'),
                    validation.get('overall_score'),
                    bool(validation.get('review_required')),
                    json.dumps(case.validation_result),
                    case.land_record_id,
                    json.dumps(case.validation_result),
                ),
            )

    def _persist_gis_result(self, case: ReviewCase) -> None:
        if case.land_record_id is None or not case.gis_result:
            return
        result = case.gis_result
        validation = result.get('gis_validation', {}) if isinstance(result.get('gis_validation'), dict) else {}
        comparison = result.get('comparison', {}) if isinstance(result.get('comparison'), dict) else {}
        boundary = validation.get('boundary', {}) if isinstance(validation.get('boundary'), dict) else {}
        relationships = result.get('spatial_relationships', result.get('results', []))
        with self._cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO gis_validation_results (
                    land_record_id, geometry_status, spatial_confidence, review_required,
                    area_comparison, overlap_findings, boundary_findings, crs, result_json
                ) SELECT %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s::jsonb
                WHERE NOT EXISTS (
                    SELECT 1 FROM gis_validation_results
                    WHERE land_record_id = %s AND result_json = %s::jsonb AND crs IS NOT DISTINCT FROM %s
                )
                ''',
                (
                    case.land_record_id,
                    'VALID' if validation.get('geometry_valid', result.get('geometry_valid')) else 'INVALID',
                    validation.get('spatial_confidence', result.get('spatial_confidence')),
                    bool(result.get('review_required') or validation.get('review_required')),
                    json.dumps(comparison),
                    json.dumps(relationships),
                    json.dumps(boundary.get('issues', [])),
                    result.get('crs'),
                    json.dumps(result),
                    case.land_record_id,
                    json.dumps(result),
                    result.get('crs'),
                ),
            )

    def _field_value(self, field: Any) -> Any:
        return field.get('value') if isinstance(field, dict) else field

    def _date_value(self, field: Any) -> str | None:
        value = self._field_value(field)
        if not isinstance(value, str):
            return None
        try:
            from datetime import date

            return date.fromisoformat(value).isoformat()
        except ValueError:
            return None

    def _database_severity(self, severity: str) -> str:
        normalized = severity.upper()
        return normalized if normalized in {'INFO', 'LOW', 'MEDIUM', 'WARNING', 'HIGH', 'ERROR', 'CRITICAL'} else 'WARNING'
