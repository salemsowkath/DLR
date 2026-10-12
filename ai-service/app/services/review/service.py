from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.models.review import Anomaly, AuditEvent, FieldCorrection, OfficerIdentity, OfficerNote, ReviewCase
from app.models.review_view import (
    AIConfidenceView,
    AnomalySummaryView,
    AuditEventView,
    AuditView,
    DecisionView,
    GISAreaComparisonView,
    GISView,
    LandRecordView,
    OfficerReviewView,
    OfficerView,
    ReviewAnomalyView,
    ReviewViewCase,
    ValidationIssueView,
    ValidationView,
)
from app.services.review.gis_adapter import gis_review_adapter
from app.services.review.repository import InMemoryAnomalyRepository, InMemoryAuditRepository, ReviewCaseRepository
from app.services.gis.area import GIS_AREA_TOLERANCE_PERCENT
from app.services.validation.confidence import get_confidence_level
from app.services.validation.engine import validation_engine

VALID_TRANSITIONS = {
    'PENDING_REVIEW': {'IN_REVIEW', 'CLOSED'},
    'IN_REVIEW': {'APPROVED', 'CORRECTION_REQUIRED', 'ON_HOLD', 'REJECTED', 'CLOSED'},
    'CORRECTION_REQUIRED': {'IN_REVIEW', 'CLOSED'},
    'ON_HOLD': {'IN_REVIEW', 'CLOSED'},
    'REJECTED': {'CLOSED'},
    'APPROVED': {'CLOSED'},
    'CLOSED': set(),
}

SEVERITY_RANK = {'INFO': 0, 'WARNING': 1, 'ERROR': 2, 'CRITICAL': 3}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def mask_sensitive_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        if len(text) >= 4 and all(ch.isdigit() for ch in text):
            return f'***{text[-2:]}'
        return text
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, dict):
        return {key: mask_sensitive_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [mask_sensitive_value(item) for item in value]
    return value


class ReviewCaseService:
    def __init__(
        self,
        repository: ReviewCaseRepository | None = None,
        anomaly_repository: InMemoryAnomalyRepository | None = None,
        audit_repository: InMemoryAuditRepository | None = None,
    ) -> None:
        self.repository = repository or InMemoryReviewCaseRepository()
        self.anomaly_repository = anomaly_repository or InMemoryAnomalyRepository()
        self.audit_repository = audit_repository or InMemoryAuditRepository()

    def create_case(
        self,
        document_id: str,
        land_record: dict[str, Any],
        validation_result: dict[str, Any],
        gis_result: dict[str, Any] | None = None,
        land_record_id: str | None = None,
    ) -> dict[str, Any]:
        if not document_id:
            raise ValueError('document_id is required.')
        if not isinstance(land_record, dict):
            raise ValueError('land_record must be a dictionary object.')
        if not isinstance(validation_result, dict):
            raise ValueError('validation_result must be a dictionary object.')
        if gis_result is not None and not isinstance(gis_result, dict):
            raise ValueError('gis_result must be a dictionary object when provided.')

        with self.repository.transaction():
            case_id = self.repository.next_case_id()
            case = ReviewCase(
                case_id=case_id,
                document_id=document_id,
                land_record_id=land_record_id,
                land_record=deepcopy(land_record),
                original_land_record=deepcopy(land_record),
                validation_result=deepcopy(validation_result),
                gis_result=deepcopy(gis_result),
                status='PENDING_REVIEW',
                priority=self._priority_from_validation(validation_result),
                validation_score=float(validation_result.get('validation', {}).get('overall_score', 100.0)),
            )

            case.anomalies = self._build_anomalies(validation_result)
            case.priority = self._compute_priority(case.anomalies)
            case.validation_score = float(validation_result.get('validation', {}).get('overall_score', 100.0))
            self.repository.create(case)
            if gis_result:
                self.attach_gis_findings(case.case_id, gis_result, actor_id='SYSTEM')
                case = self.repository.get_by_id(case.case_id)
            self._add_event(case, 'SYSTEM', 'SYSTEM', 'CASE_CREATED', reason='Case created for officer review.', metadata={'document_id': document_id})
            return self._serialize_case(case)

    def attach_gis_findings(self, case_id: str, gis_result: dict[str, Any], actor_id: str = 'SYSTEM') -> dict[str, Any]:
        case = self._get_case_or_raise(case_id)
        if gis_result is None or not isinstance(gis_result, dict):
            raise ValueError('gis_result must be a dictionary object.')

        case.gis_result = deepcopy(gis_result)
        gis_anomalies = gis_review_adapter.convert(gis_result, case_id=case_id, document_id=case.document_id)
        if not gis_anomalies:
            self.repository.update(case)
            return {'success': True, 'case': self._serialize_case(case)}

        # Keep GIS findings advisory by attaching them as standard review anomalies that an
        # authorized officer can resolve, dismiss, or escalate during review.
        case.anomalies.extend(gis_anomalies)
        case.priority = self._compute_priority(case.anomalies)
        case.updated_at = utc_now()
        self.repository.update(case)
        self._add_event(
            case,
            actor_id,
            'GIS_SYSTEM',
            'GIS_FINDINGS_ATTACHED',
            reason='GIS findings attached to the case for officer review.',
            metadata={
                'gis_findings_count': len(gis_anomalies),
                'number_of_gis_anomalies': len(gis_anomalies),
                'source': 'GIS',
                'document_id': case.document_id,
                'case_id': case.case_id,
            },
        )
        self.repository.update(case)
        return {'success': True, 'case': self._serialize_case(case)}

    def get_case(self, case_id: str) -> dict[str, Any]:
        case = self.repository.get_by_id(case_id)
        if case is None:
            raise ValueError(f'Case {case_id} not found.')
        return {
            'success': True,
            'case': self._serialize_case(case),
            'summary': self.build_summary(case),
        }

    def list_cases(
        self,
        *,
        status: str | None = None,
        priority: str | None = None,
        assigned_officer: str | None = None,
        anomaly_type: str | None = None,
    ) -> dict[str, Any]:
        cases = self.repository.list(
            status=status,
            priority=priority,
            assigned_officer=assigned_officer,
            anomaly_type=anomaly_type,
        )
        return {'success': True, 'cases': [self._serialize_case(case) for case in cases]}

    def get_review_view(self, case_id: str) -> dict[str, Any]:
        case = self._get_case_or_raise(case_id)
        view = self._build_review_view(case)
        return {'success': True, 'data': view.model_dump(mode='json')}

    def list_case_summaries(self) -> dict[str, Any]:
        cases = self.repository.list()
        return {'success': True, 'cases': [self._build_case_list_summary(case) for case in cases]}

    def start_review(self, case_id: str, officer_id: str) -> dict[str, Any]:
        self._validate_officer_identity(officer_id)
        case = self._get_case_or_raise(case_id)
        self._ensure_transition(case.status, 'IN_REVIEW')
        case.status = 'IN_REVIEW'
        case.assigned_officer = officer_id
        case.updated_at = utc_now()
        self.repository.update(case)
        self._add_event(case, officer_id, 'GOVERNMENT_OFFICER', 'REVIEW_STARTED', reason='Officer started case review.', metadata={'assigned_officer': officer_id})
        return {'success': True, 'case': self._serialize_case(case)}

    def approve_case(self, case_id: str, officer_id: str, reason: str) -> dict[str, Any]:
        self._validate_officer_identity(officer_id)
        self._validate_reason(reason)
        case = self._get_case_or_raise(case_id)
        self._ensure_transition(case.status, 'APPROVED')
        case.status = 'APPROVED'
        case.updated_at = utc_now()
        self.repository.update(case)
        self._add_event(case, officer_id, 'GOVERNMENT_OFFICER', 'CASE_APPROVED', reason=reason, metadata={'decision': 'APPROVE'})
        return {'success': True, 'case': self._serialize_case(case)}

    def request_correction(self, case_id: str, officer_id: str, reason: str) -> dict[str, Any]:
        self._validate_officer_identity(officer_id)
        self._validate_reason(reason)
        case = self._get_case_or_raise(case_id)
        self._ensure_transition(case.status, 'CORRECTION_REQUIRED')
        case.status = 'CORRECTION_REQUIRED'
        case.updated_at = utc_now()
        self.repository.update(case)
        self._add_event(case, officer_id, 'GOVERNMENT_OFFICER', 'CORRECTION_REQUESTED', reason=reason, metadata={'decision': 'REQUEST_CORRECTION'})
        return {'success': True, 'case': self._serialize_case(case)}

    def hold_case(self, case_id: str, officer_id: str, reason: str) -> dict[str, Any]:
        self._validate_officer_identity(officer_id)
        self._validate_reason(reason)
        case = self._get_case_or_raise(case_id)
        self._ensure_transition(case.status, 'ON_HOLD')
        case.status = 'ON_HOLD'
        case.updated_at = utc_now()
        self.repository.update(case)
        self._add_event(case, officer_id, 'GOVERNMENT_OFFICER', 'CASE_PUT_ON_HOLD', reason=reason, metadata={'decision': 'HOLD'})
        return {'success': True, 'case': self._serialize_case(case)}

    def reject_case(self, case_id: str, officer_id: str, reason: str) -> dict[str, Any]:
        self._validate_officer_identity(officer_id)
        self._validate_reason(reason)
        case = self._get_case_or_raise(case_id)
        self._ensure_transition(case.status, 'REJECTED')
        case.status = 'REJECTED'
        case.updated_at = utc_now()
        self.repository.update(case)
        self._add_event(case, officer_id, 'GOVERNMENT_OFFICER', 'CASE_REJECTED', reason=reason, metadata={'decision': 'REJECT'})
        return {'success': True, 'case': self._serialize_case(case)}

    def add_note(self, case_id: str, officer_id: str, text: str) -> dict[str, Any]:
        self._validate_officer_identity(officer_id)
        if not text or not text.strip():
            raise ValueError('Note text is required.')
        case = self._get_case_or_raise(case_id)
        note = OfficerNote(case_id=case_id, officer_id=officer_id, text=text.strip())
        case.notes.append(note)
        self.repository.update(case)
        self._add_event(case, officer_id, 'GOVERNMENT_OFFICER', 'NOTE_ADDED', reason='Officer note added to case.', metadata={'note_id': note.note_id}, field=None, old_value=None, new_value=text.strip())
        return {'success': True, 'note': note.model_dump(mode='json')}

    def add_field_correction(self, case_id: str, officer_id: str, field: str, new_value: Any, reason: str) -> dict[str, Any]:
        self._validate_officer_identity(officer_id)
        self._validate_reason(reason)
        if not field:
            raise ValueError('field is required.')
        case = self._get_case_or_raise(case_id)
        current_value = case.land_record.get(field)
        original_value = current_value.get('value') if isinstance(current_value, dict) else current_value
        if field not in case.land_record:
            case.land_record[field] = {'value': new_value, 'confidence': 0.99, 'source': 'OFFICER'}
        elif isinstance(case.land_record[field], dict):
            case.land_record[field]['value'] = new_value
            case.land_record[field]['confidence'] = 0.99
            case.land_record[field]['source'] = 'OFFICER'
        else:
            case.land_record[field] = {'value': new_value, 'confidence': 0.99, 'source': 'OFFICER'}

        correction = FieldCorrection(
            field=field,
            original_value=original_value,
            corrected_value=new_value,
            reason=reason,
            officer_id=officer_id,
        )
        case.field_corrections.append(correction)
        case.updated_at = utc_now()
        self.repository.update(case)
        self._add_event(
            case,
            officer_id,
            'GOVERNMENT_OFFICER',
            'FIELD_CORRECTED',
            reason=reason,
            field=field,
            old_value=mask_sensitive_value(original_value),
            new_value=mask_sensitive_value(new_value),
            metadata={'source': 'OFFICER', 'field': field},
        )

        case.validation_result = self._revalidate_record(case)
        case.validation_score = float(case.validation_result.get('validation', {}).get('overall_score', 100.0))
        cached_gis_anomalies = [anomaly for anomaly in case.anomalies if anomaly.source == 'GIS']
        case.anomalies = self._build_anomalies(case.validation_result) + cached_gis_anomalies
        case.priority = self._compute_priority(case.anomalies)
        self.repository.update(case)
        return {'success': True, 'case': self._serialize_case(case)}

    def resolve_anomaly(self, case_id: str, anomaly_id: str, officer_id: str, reason: str) -> dict[str, Any]:
        self._validate_officer_identity(officer_id)
        self._validate_reason(reason)
        case = self._get_case_or_raise(case_id)
        anomaly = next((item for item in case.anomalies if item.anomaly_id == anomaly_id), None)
        if anomaly is None:
            raise ValueError(f'Anomaly {anomaly_id} not found.')
        anomaly.status = 'RESOLVED'
        case.updated_at = utc_now()
        self.repository.update(case)
        self._add_event(case, officer_id, 'GOVERNMENT_OFFICER', 'ANOMALY_RESOLVED', reason=reason, field=anomaly.field, old_value=anomaly.status, new_value='RESOLVED', metadata={'anomaly_id': anomaly_id, 'anomaly_type': anomaly.anomaly_type})
        return {'success': True, 'anomaly': anomaly.model_dump(mode='json')}

    def dismiss_anomaly(self, case_id: str, anomaly_id: str, officer_id: str, reason: str) -> dict[str, Any]:
        self._validate_officer_identity(officer_id)
        self._validate_reason(reason)
        case = self._get_case_or_raise(case_id)
        anomaly = next((item for item in case.anomalies if item.anomaly_id == anomaly_id), None)
        if anomaly is None:
            raise ValueError(f'Anomaly {anomaly_id} not found.')
        anomaly.status = 'DISMISSED'
        case.updated_at = utc_now()
        self.repository.update(case)
        self._add_event(case, officer_id, 'GOVERNMENT_OFFICER', 'ANOMALY_DISMISSED', reason=reason, field=anomaly.field, old_value=anomaly.status, new_value='DISMISSED', metadata={'anomaly_id': anomaly_id, 'anomaly_type': anomaly.anomaly_type})
        return {'success': True, 'anomaly': anomaly.model_dump(mode='json')}

    def get_audit_history(self, case_id: str) -> dict[str, Any]:
        case = self._get_case_or_raise(case_id)
        return {'success': True, 'case_id': case_id, 'audit_events': [self._sanitize_event(e) for e in case.audit_events]}

    def build_summary(self, case: ReviewCase) -> dict[str, Any]:
        validation_payload = case.validation_result.get('validation', {}) if isinstance(case.validation_result, dict) else {}
        record_summary = {
            'owner_name': self._extract_record_value(case.land_record, 'owner_name'),
            'survey_number': self._extract_record_value(case.land_record, 'survey_number'),
            'area': self._extract_record_value(case.land_record, 'area'),
            'village': self._extract_record_value(case.land_record, 'village'),
            'taluk': self._extract_record_value(case.land_record, 'taluk'),
            'district': self._extract_record_value(case.land_record, 'district'),
        }
        source_traceability = {
            field: {
                'source_page': self._extract_source_page(case.land_record, field),
                'source_bbox': self._extract_source_bbox(case.land_record, field),
                'confidence': self._extract_confidence(case.land_record, field),
            }
            for field in ['owner_name', 'survey_number', 'area', 'village', 'taluk', 'district']
            if field in case.land_record
        }
        return {
            'case_id': case.case_id,
            'status': case.status,
            'priority': case.priority,
            'record_summary': record_summary,
            'validation': {'score': float(validation_payload.get('overall_score', case.validation_score)), 'status': validation_payload.get('status', 'REVIEW_REQUIRED')},
            'anomalies': [
                {
                    'type': anomaly.anomaly_type,
                    'field': anomaly.field,
                    'severity': anomaly.severity,
                    'message': anomaly.message,
                }
                for anomaly in case.anomalies
            ],
            'recommendation': self._recommendation_for(case.status, case.priority),
            'source_traceability': source_traceability,
        }

    def _build_review_view(self, case: ReviewCase) -> OfficerReviewView:
        validation_payload = case.validation_result.get('validation', {}) if isinstance(case.validation_result, dict) else {}
        if not isinstance(validation_payload, dict):
            validation_payload = {}
        validation_available = bool(validation_payload)
        validation_checks = validation_payload.get('checks', []) or []
        validation_issues = validation_payload.get('issues') or [
            check for check in validation_checks if str(check.get('status', 'PASS')).upper() != 'PASS'
        ]
        validation_review_required = bool(validation_payload.get('review_required') or validation_issues) or any(
            str(issue.get('status', '')).upper() not in {'', 'PASS'} for issue in validation_issues
        )
        normalized_validation_issues = [
            ValidationIssueView(
                type=str(issue.get('rule', issue.get('type', 'OTHER'))),
                message=str(issue.get('message', 'Validation finding requires review.')),
                severity=self._view_severity(issue.get('severity', 'INFO')),
                field=issue.get('field'),
            )
            for issue in validation_issues
            if isinstance(issue, dict)
        ]

        field_confidences = {
            name: float(field_value['confidence'])
            for name, field_value in case.land_record.items()
            if isinstance(field_value, dict)
            and isinstance(field_value.get('confidence'), (int, float))
        }
        low_confidence_fields = {
            str(check.get('field'))
            for check in validation_checks
            if isinstance(check, dict) and check.get('rule') == 'LOW_CONFIDENCE' and check.get('field')
        }
        low_confidence_fields.update(
            name for name, confidence in field_confidences.items() if get_confidence_level(confidence) == 'LOW'
        )

        known_fields = {'owner_name', 'survey_number', 'area', 'village', 'taluk', 'district', 'classification', 'date'}
        record_values = {name: self._extract_record_value(case.land_record, name) for name in known_fields}
        additional_fields = {
            name: self._extract_record_value(case.land_record, name)
            for name in case.land_record
            if name not in known_fields
        }
        source_traceability = {
            name: {
                'source': field_value.get('source', field_value.get('method')),
                'source_page': field_value.get('source_page'),
                'source_bbox': field_value.get('source_bbox'),
                'confidence': field_value.get('confidence'),
            }
            for name, field_value in case.land_record.items()
            if isinstance(field_value, dict)
        }

        anomaly_views = [
            ReviewAnomalyView(
                anomaly_id=anomaly.anomaly_id,
                type=anomaly.anomaly_type,
                severity=self._view_severity(anomaly.severity),
                status=anomaly.status,
                source=anomaly.source,
                title=self._anomaly_title(anomaly.anomaly_type),
                message=anomaly.message,
                review_required=bool(anomaly.review_required or anomaly.status == 'OPEN'),
                metadata=anomaly.metadata,
            )
            for anomaly in case.anomalies
        ]
        anomaly_summary = self._build_anomaly_summary(anomaly_views)
        gis_view = self._build_gis_view(case.gis_result)
        priority = self._review_priority(
            anomaly_views,
            validation_review_required=validation_review_required,
            gis_review_required=gis_view.review_required,
        )
        blocking_anomalies = sum(
            1 for anomaly in anomaly_views
            if anomaly.status == 'OPEN' and anomaly.review_required and anomaly.severity in {'CRITICAL', 'HIGH'}
        )
        allowed = VALID_TRANSITIONS.get(case.status, set())
        decision_reason = (
            'High-severity findings require officer review.' if blocking_anomalies
            else 'Review findings remain advisory and should be checked by the officer.' if validation_review_required or gis_view.review_required
            else 'No blocking findings are currently recorded.'
        )

        return OfficerReviewView(
            case=ReviewViewCase(
                case_id=case.case_id,
                status=case.status,
                created_at=case.created_at,
                updated_at=case.updated_at,
                priority=priority,
                review_required=bool(validation_review_required or gis_view.review_required or anomaly_summary.open),
            ),
            land_record=LandRecordView(**record_values, additional_fields=additional_fields, source_traceability=source_traceability),
            ai=AIConfidenceView(
                overall_confidence=self._existing_overall_confidence(case.land_record),
                field_confidences=field_confidences,
                extraction_status='AVAILABLE' if case.land_record else 'UNAVAILABLE',
                low_confidence_fields=sorted(low_confidence_fields),
            ),
            validation=ValidationView(
                status=str(validation_payload.get('status', 'UNAVAILABLE' if not validation_available else 'REVIEW_REQUIRED' if validation_review_required else 'PASS')),
                score=float(validation_payload['overall_score']) if isinstance(validation_payload.get('overall_score'), (int, float)) else None,
                issue_count=len(normalized_validation_issues),
                issues=normalized_validation_issues,
                review_required=validation_review_required,
            ),
            gis=gis_view,
            anomalies=anomaly_views,
            anomaly_summary=anomaly_summary,
            officer=OfficerView(
                corrections=[self._safe_correction(correction.model_dump(mode='json')) for correction in case.field_corrections],
                notes=[note.model_dump(mode='json') for note in case.notes],
            ),
            audit=self._build_audit_view(case),
            decision=DecisionView(
                can_approve='APPROVED' in allowed and blocking_anomalies == 0,
                can_reject='REJECTED' in allowed,
                can_request_correction='CORRECTION_REQUIRED' in allowed,
                can_hold='ON_HOLD' in allowed,
                blocking_anomalies=blocking_anomalies,
                reason=decision_reason,
            ),
            priority=priority,
        )

    def _build_gis_view(self, gis_result: dict[str, Any] | None) -> GISView:
        if not isinstance(gis_result, dict) or not gis_result:
            return GISView()

        validation = gis_result.get('gis_validation') if isinstance(gis_result.get('gis_validation'), dict) else {}
        comparison = gis_result.get('comparison') if isinstance(gis_result.get('comparison'), dict) else {}
        if not comparison:
            comparison = {
                'document_area': gis_result.get('document_area'),
                'gis_area': gis_result.get('gis_area'),
                'difference': gis_result.get('area_difference'),
                'classification': gis_result.get('classification', 'UNAVAILABLE'),
                'review_required': gis_result.get('review_required', False),
            }

        geometry_area = validation.get('area') if isinstance(validation.get('area'), dict) else {}
        gis_area = comparison.get('gis_area') or geometry_area or None
        area_warning = geometry_area.get('warning')
        if area_warning == 'AREA_REQUIRES_PROJECTED_CRS':
            gis_area = {'value': None, 'unit': geometry_area.get('unit', 'square_metre'), 'warning': area_warning}
        difference = comparison.get('difference') if isinstance(comparison.get('difference'), dict) else {}
        relationships = gis_result.get('spatial_relationships')
        if not isinstance(relationships, list):
            relationships = gis_result.get('results') if isinstance(gis_result.get('results'), list) else []
        issues = validation.get('issues') or gis_result.get('gis_issues') or []
        boundary = validation.get('boundary') or gis_result.get('boundary_status') or {}
        boundary_findings = boundary.get('issues', []) if isinstance(boundary, dict) else []
        geometry_valid = validation.get('geometry_valid', gis_result.get('geometry_valid'))
        review_required = bool(
            gis_result.get('review_required')
            or validation.get('review_required')
            or comparison.get('review_required')
        )
        classification = str(comparison.get('classification', gis_result.get('classification', 'UNAVAILABLE'))).upper()
        if review_required:
            gis_status = 'REVIEW_REQUIRED'
        elif geometry_valid is False:
            gis_status = 'INVALID'
        elif geometry_valid is True:
            gis_status = 'VALID'
        else:
            gis_status = 'UNAVAILABLE'

        return GISView(
            status=gis_status,
            geometry_status='VALID' if geometry_valid is True else 'INVALID' if geometry_valid is False else 'UNAVAILABLE',
            spatial_confidence=validation.get('spatial_confidence', gis_result.get('spatial_confidence')),
            review_required=review_required,
            area_comparison=GISAreaComparisonView(
                document_area=comparison.get('document_area'),
                gis_area=gis_area,
                difference=difference.get('absolute'),
                difference_percent=difference.get('percentage'),
                tolerance_percent=GIS_AREA_TOLERANCE_PERCENT,
                classification=classification,
            ),
            overlap_findings=[item for item in relationships if isinstance(item, dict)],
            geometry_findings=[item for item in issues if isinstance(item, dict)],
            boundary_findings=[str(item) for item in boundary_findings],
            crs=gis_result.get('crs') or validation.get('crs'),
        )

    def _build_anomaly_summary(self, anomalies: list[ReviewAnomalyView]) -> AnomalySummaryView:
        counts = {'total': len(anomalies), 'open': 0, 'resolved': 0, 'dismissed': 0, 'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        for anomaly in anomalies:
            status_key = anomaly.status.lower()
            if status_key in counts:
                counts[status_key] += 1
            severity_key = anomaly.severity.lower()
            if severity_key in counts:
                counts[severity_key] += 1
        return AnomalySummaryView(**counts)

    def _build_audit_view(self, case: ReviewCase) -> AuditView:
        recent_events = [
            AuditEventView(
                event_type=event.action,
                timestamp=event.timestamp,
                actor='system' if event.actor_id.upper() == 'SYSTEM' else event.actor_id,
            )
            for event in list(reversed(case.audit_events))[:10]
        ]
        return AuditView(event_count=len(case.audit_events), recent_events=recent_events)

    def _build_case_list_summary(self, case: ReviewCase) -> dict[str, Any]:
        anomaly_severities = [self._view_severity(anomaly.severity) for anomaly in case.anomalies]
        validation = case.validation_result.get('validation', {}) if isinstance(case.validation_result, dict) else {}
        gis_validation = case.gis_result.get('gis_validation', {}) if isinstance(case.gis_result, dict) else {}
        validation_required = bool(validation.get('review_required')) if isinstance(validation, dict) else False
        if isinstance(validation, dict):
            validation_required = validation_required or bool(validation.get('issues')) or any(
                isinstance(check, dict) and str(check.get('status', 'PASS')).upper() != 'PASS'
                for check in validation.get('checks', []) or []
            )
        gis_required = bool(case.gis_result.get('review_required')) if isinstance(case.gis_result, dict) else False
        if isinstance(gis_validation, dict):
            gis_required = gis_required or bool(gis_validation.get('review_required'))
        gis_comparison = case.gis_result.get('comparison', {}) if isinstance(case.gis_result, dict) else {}
        if isinstance(gis_comparison, dict):
            gis_required = gis_required or bool(gis_comparison.get('review_required'))
        gis_required = bool(gis_required or any(anomaly.source == 'GIS' and anomaly.status == 'OPEN' for anomaly in case.anomalies))
        return {
            'case_id': case.case_id,
            'status': case.status,
            'priority': self._review_priority(
                [ReviewAnomalyView(anomaly_id=item.anomaly_id, type=item.anomaly_type, severity=self._view_severity(item.severity), status=item.status, source=item.source, title='', message='', review_required=item.review_required, metadata={}) for item in case.anomalies],
                validation_review_required=validation_required,
                gis_review_required=gis_required,
            ),
            'owner_display': mask_sensitive_value(self._extract_record_value(case.land_record, 'owner_name')),
            'survey_number': mask_sensitive_value(self._extract_record_value(case.land_record, 'survey_number')),
            'village': mask_sensitive_value(self._extract_record_value(case.land_record, 'village')),
            'anomaly_count': len(case.anomalies),
            'critical_high_anomaly_count': sum(1 for severity in anomaly_severities if severity in {'CRITICAL', 'HIGH'}),
            'gis_review_required': gis_required,
            'validation_review_required': validation_required,
            'created_at': case.created_at,
            'updated_at': case.updated_at,
        }

    def _review_priority(
        self,
        anomalies: list[ReviewAnomalyView],
        *,
        validation_review_required: bool,
        gis_review_required: bool,
    ) -> str:
        severities = {anomaly.severity for anomaly in anomalies if anomaly.status == 'OPEN'}
        if 'CRITICAL' in severities:
            return 'CRITICAL'
        if 'HIGH' in severities:
            return 'HIGH'
        if 'MEDIUM' in severities or validation_review_required or gis_review_required:
            return 'MEDIUM'
        return 'LOW'

    def _view_severity(self, severity: Any) -> str:
        normalized = str(severity or 'LOW').upper()
        return {'ERROR': 'HIGH', 'WARNING': 'MEDIUM', 'INFO': 'LOW'}.get(normalized, normalized if normalized in {'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'} else 'LOW')

    def _anomaly_title(self, anomaly_type: str) -> str:
        titles = {
            'AREA_INCONSISTENCY': 'Land area mismatch',
            'GIS_REVIEW_REQUIRED': 'Spatial review required',
            'RECORD_CONFLICT': 'Record conflict',
            'LOW_CONFIDENCE': 'Low extraction confidence',
            'MISSING_FIELD': 'Missing required field',
        }
        return titles.get(anomaly_type, anomaly_type.replace('_', ' ').title())

    def _existing_overall_confidence(self, land_record: dict[str, Any]) -> float | None:
        confidence = land_record.get('overall_confidence')
        if isinstance(confidence, (int, float)):
            return float(confidence)
        return None

    def _safe_correction(self, correction: dict[str, Any]) -> dict[str, Any]:
        for field in ('original_value', 'corrected_value', 'reason'):
            correction[field] = mask_sensitive_value(correction.get(field))
        return correction

    def _serialize_case(self, case: ReviewCase) -> dict[str, Any]:
        return {
            'case_id': case.case_id,
            'document_id': case.document_id,
            'status': case.status,
            'priority': case.priority,
            'validation_score': float(case.validation_score),
            'land_record': case.land_record,
            'validation_result': case.validation_result,
            'anomalies': [anomaly.model_dump(mode='json') for anomaly in case.anomalies],
            'notes': [note.model_dump(mode='json') for note in case.notes],
            'field_corrections': [correction.model_dump(mode='json') for correction in case.field_corrections],
            'audit_events': [self._sanitize_event(event) for event in case.audit_events],
            'assigned_officer': case.assigned_officer,
            'created_at': case.created_at,
            'updated_at': case.updated_at,
        }

    def _sanitize_event(self, event: AuditEvent) -> dict[str, Any]:
        sanitized = event.model_dump(mode='json')
        sanitized['old_value'] = mask_sensitive_value(sanitized.get('old_value'))
        sanitized['new_value'] = mask_sensitive_value(sanitized.get('new_value'))
        if sanitized.get('metadata'):
            sanitized['metadata'] = {key: mask_sensitive_value(value) for key, value in sanitized['metadata'].items()}
        return sanitized

    def _get_case_or_raise(self, case_id: str) -> ReviewCase:
        case = self.repository.get_by_id(case_id)
        if case is None:
            raise ValueError(f'Case {case_id} not found.')
        return case

    def _add_event(
        self,
        case: ReviewCase,
        actor_id: str,
        actor_role: str,
        action: str,
        *,
        reason: str | None = None,
        field: str | None = None,
        old_value: Any = None,
        new_value: Any = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        event = AuditEvent(
            case_id=case.case_id,
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            field=field,
            old_value=mask_sensitive_value(old_value),
            new_value=mask_sensitive_value(new_value),
            reason=reason,
            metadata=metadata or {},
        )
        self.audit_repository.add_event(case, event)
        if event not in case.audit_events:
            case.audit_events.append(event)
        self.repository.update(case)

    def _revalidate_record(self, case: ReviewCase) -> dict[str, Any]:
        return validation_engine.validate_land_record(case.land_record)

    def _build_anomalies(self, validation_result: dict[str, Any]) -> list[Anomaly]:
        checks = validation_result.get('validation', {}).get('checks', [])
        anomalies: list[Anomaly] = []
        for check in checks:
            if check.get('status') == 'PASS':
                continue
            anomaly_type = self._map_rule_to_anomaly(check.get('rule'), check.get('field'))
            anomaly = Anomaly(
                anomaly_type=anomaly_type,
                field=check.get('field'),
                severity=str(check.get('severity', 'WARNING')).upper(),
                status='OPEN',
                message=str(check.get('message', 'Review required.')),
                explanation=self._explanation_for(check),
                value=check.get('value'),
                confidence=check.get('confidence'),
                source_page=check.get('source_page'),
                source_bbox=check.get('source_bbox'),
            )
            anomalies.append(anomaly)
        return anomalies

    def _map_rule_to_anomaly(self, rule: str | None, field: str | None) -> str:
        if rule in {'REQUIRED_FIELD', 'MISSING_FIELD'}:
            return 'MISSING_FIELD'
        if rule == 'LOW_CONFIDENCE':
            return 'LOW_CONFIDENCE'
        if rule == 'SURVEY_FORMAT':
            return 'INVALID_FORMAT'
        if rule == 'AREA_VALIDATION':
            return 'INVALID_AREA'
        if rule == 'DATE_VALIDATION':
            return 'INVALID_DATE'
        if rule in {'POSSIBLE_DUPLICATE'}:
            return 'POSSIBLE_DUPLICATE'
        if rule in {'CONFLICT', 'RECORD_CONFLICT'}:
            return 'RECORD_CONFLICT'
        if field in {'owner_name'}:
            return 'OWNER_INCONSISTENCY'
        if field in {'area'}:
            return 'AREA_INCONSISTENCY'
        if field in {'village', 'district', 'taluk'}:
            return 'LOCATION_INCONSISTENCY'
        return 'OTHER'

    def _explanation_for(self, check: dict[str, Any]) -> str:
        rule = str(check.get('rule', 'OTHER'))
        field = check.get('field') or 'record'
        if rule == 'LOW_CONFIDENCE':
            return f'{field} confidence is below the review threshold and requires officer verification.'
        if rule == 'REQUIRED_FIELD':
            return f'{field} is required for a complete land record and must be verified by the officer.'
        if rule == 'SURVEY_FORMAT':
            return 'Survey number format does not match the expected pattern and should be checked against the source document.'
        if rule == 'AREA_VALIDATION':
            return 'Area value is invalid or inconsistent with expected land-record values.'
        if rule == 'DATE_VALIDATION':
            return 'The document date does not match a valid record format.'
        if rule in {'POSSIBLE_DUPLICATE', 'CONFLICT'}:
            return 'Possible duplicate or conflicting record detected; officer review is required.'
        return f'{field} requires review to confirm correctness before workflow approval.'

    def _priority_from_validation(self, validation_result: dict[str, Any]) -> str:
        validation = validation_result.get('validation', {}) if isinstance(validation_result, dict) else {}
        score = float(validation.get('overall_score', 100.0))
        if score < 50:
            return 'CRITICAL'
        if score < 75:
            return 'HIGH'
        if any(check.get('severity') == 'WARNING' for check in validation.get('checks', [])):
            return 'MEDIUM'
        return 'LOW'

    def _compute_priority(self, anomalies: list[Anomaly]) -> str:
        if any(item.severity == 'CRITICAL' for item in anomalies):
            return 'CRITICAL'
        if any(item.severity == 'ERROR' for item in anomalies):
            return 'HIGH'
        if any(item.severity == 'WARNING' for item in anomalies):
            return 'MEDIUM'
        return 'LOW'

    def _recommendation_for(self, status: str, priority: str) -> str:
        if status in {'APPROVED'}:
            return 'APPROVED'
        if priority == 'CRITICAL':
            return 'OFFICER_REVIEW_REQUIRED'
        if priority == 'HIGH':
            return 'OFFICER_REVIEW_REQUIRED'
        return 'ADVISORY_ONLY'

    def _validate_officer_identity(self, officer_id: str | None) -> None:
        if not officer_id or not str(officer_id).strip():
            raise ValueError('officer_id is required.')

    def _validate_reason(self, reason: str | None) -> None:
        if not reason or not str(reason).strip():
            raise ValueError('reason is required.')

    def _ensure_transition(self, current_status: str, next_status: str) -> None:
        allowed = VALID_TRANSITIONS.get(current_status, set())
        if next_status not in allowed:
            raise ValueError(f'Invalid transition: {current_status} -> {next_status}')

    def _extract_record_value(self, record: dict[str, Any], field: str) -> Any:
        if field not in record:
            return None
        value = record[field]
        if isinstance(value, dict):
            return value.get('value')
        return value

    def _extract_confidence(self, record: dict[str, Any], field: str) -> float | None:
        value = record.get(field)
        if not isinstance(value, dict):
            return None
        conf = value.get('confidence')
        return float(conf) if conf is not None else None

    def _extract_source_page(self, record: dict[str, Any], field: str) -> int | None:
        value = record.get(field)
        if not isinstance(value, dict):
            return None
        return value.get('source_page')

    def _extract_source_bbox(self, record: dict[str, Any], field: str) -> list[int] | dict[str, Any] | None:
        value = record.get(field)
        if not isinstance(value, dict):
            return None
        return value.get('source_bbox')


def _configured_review_repository() -> ReviewCaseRepository:
    backend = settings.persistence_backend.strip().lower()
    if backend == 'mysql':
        from app.services.review.mysql_repository import MySQLReviewRepository

        return MySQLReviewRepository()
    raise ValueError('PERSISTENCE_BACKEND must be mysql. Memory persistence is not supported.')


review_case_service = ReviewCaseService(repository=_configured_review_repository())
