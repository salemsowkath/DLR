from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.models.review import Anomaly

GIS_TOLERANCE_PERCENT = 2.0


class GISReviewAdapter:
    """Convert GIS spatial findings into official review anomalies.

    The GIS engine remains advisory and does not make legal ownership decisions. It only
    creates review-ready evidence that an authorized officer can evaluate against the
    source document and official records.
    """

    def convert(self, gis_result: dict[str, Any], *, case_id: str | None = None, document_id: str | None = None) -> list[Anomaly]:
        if not isinstance(gis_result, dict):
            return []

        anomalies: list[Anomaly] = []
        seen: set[str] = set()

        validation = gis_result.get('gis_validation') if isinstance(gis_result.get('gis_validation'), dict) else {}
        comparison = gis_result.get('comparison') if isinstance(gis_result.get('comparison'), dict) else {}
        relationships = gis_result.get('spatial_relationships') if isinstance(gis_result.get('spatial_relationships'), list) else []

        for issue in validation.get('issues', []) or []:
            key = self._issue_key(issue)
            if key in seen:
                continue
            anomaly = self._anomaly_from_issue(issue, validation=validation, comparison=comparison, case_id=case_id, document_id=document_id)
            if anomaly is not None:
                anomalies.append(anomaly)
                seen.add(key)

        classification = str(comparison.get('classification', 'UNAVAILABLE')).upper()
        if classification in {'SIGNIFICANT_MISMATCH', 'MINOR_VARIANCE'}:
            key = 'AREA_INCONSISTENCY'
            if key not in seen:
                anomalies.append(self._build_area_anomaly(comparison, case_id=case_id, document_id=document_id))
                seen.add(key)

        if isinstance(validation.get('spatial_confidence'), (int, float)) and float(validation['spatial_confidence']) < 0.5:
            key = 'LOW_SPATIAL_CONFIDENCE'
            if key not in seen:
                anomalies.append(
                    Anomaly(
                        anomaly_type='GIS_REVIEW_REQUIRED',
                        field='spatial_confidence',
                        severity='MEDIUM',
                        status='OPEN',
                        message='Spatial confidence is below the minimum threshold for safe acceptance.',
                        explanation='The GIS result has low confidence and requires officer review before acceptance.',
                        value=float(validation.get('spatial_confidence', 0.0)),
                        confidence=float(validation.get('spatial_confidence', 0.0)),
                        source='GIS',
                        review_required=True,
                        metadata={
                            'gis_check': 'spatial_confidence',
                            'spatial_confidence': float(validation.get('spatial_confidence', 0.0)),
                            'score': validation.get('score'),
                            'crs': settings.gis_projected_crs,
                            'document_id': document_id,
                            'case_id': case_id,
                        },
                    )
                )
                seen.add(key)

        for item in relationships:
            if not isinstance(item, dict):
                continue
            relationship = str(item.get('relationship', '')).upper()
            if not item.get('review_required') and relationship not in {'OVERLAP', 'TOUCHING', 'CONTAINS', 'WITHIN', 'EQUAL'}:
                continue
            key = f'RELATIONSHIP::{relationship}'
            if key in seen:
                continue
            anomalies.append(
                Anomaly(
                    anomaly_type='RECORD_CONFLICT' if relationship in {'OVERLAP', 'TOUCHING', 'CONTAINS', 'WITHIN', 'EQUAL'} else 'GIS_REVIEW_REQUIRED',
                    field='parcel_relationship',
                    severity=self._severity_for_relationship(relationship),
                    status='OPEN',
                    message=f'Parcel boundary relationship requires officer review: {relationship}.',
                    explanation='The GIS engine detected a parcel relationship that may require further manual verification before approval.',
                    value=item,
                    confidence=None,
                    source='GIS',
                    review_required=True,
                    metadata={
                        'gis_check': 'parcel_overlap',
                        'relationship': relationship,
                        'intersection_area': item.get('intersection_area'),
                        'pair': item.get('pair'),
                        'document_id': document_id,
                        'case_id': case_id,
                    },
                )
            )
            seen.add(key)

        return anomalies

    def _issue_key(self, issue: dict[str, Any]) -> str:
        issue_type = str(issue.get('type', 'GENERIC')).upper()
        message = str(issue.get('message', ''))
        return f'{issue_type}::{message}'

    def _anomaly_from_issue(
        self,
        issue: dict[str, Any],
        *,
        validation: dict[str, Any],
        comparison: dict[str, Any],
        case_id: str | None = None,
        document_id: str | None = None,
    ) -> Anomaly | None:
        issue_type = str(issue.get('type', 'GENERIC')).upper()
        message = str(issue.get('message', 'Spatial review required.'))
        severity = self._severity_for_issue(issue_type, issue.get('severity'))

        if issue_type in {'INVALID_GEOMETRY', 'SELF_INTERSECTION', 'ZERO_AREA_GEOMETRY', 'UNSUPPORTED_GEOMETRY', 'BOUNDARY_INCONSISTENCY'}:
            anomaly_type = 'GIS_REVIEW_REQUIRED'
            field = 'geometry'
        elif issue_type in {'CRS_MISSING', 'PROJECTED_CRS_REQUIRED', 'AREA_REQUIRES_PROJECTED_CRS'}:
            anomaly_type = 'GIS_REVIEW_REQUIRED'
            field = 'crs'
        elif issue_type in {'LOW_SPATIAL_CONFIDENCE'}:
            anomaly_type = 'GIS_REVIEW_REQUIRED'
            field = 'spatial_confidence'
        else:
            anomaly_type = 'GIS_REVIEW_REQUIRED'
            field = 'geometry'

        metadata = {
            'gis_check': issue_type,
            'finding_type': issue.get('type'),
            'message': message,
            'document_area': comparison.get('document_area'),
            'gis_area': comparison.get('gis_area'),
            'area_difference': comparison.get('difference'),
            'tolerance_percent': GIS_TOLERANCE_PERCENT,
            'review_required': bool(validation.get('review_required') or comparison.get('review_required') or True),
            'crs': settings.gis_projected_crs,
            'document_id': document_id,
            'case_id': case_id,
        }

        return Anomaly(
            anomaly_type=anomaly_type,
            field=field,
            severity=severity,
            status='OPEN',
            message=message,
            explanation='The GIS engine detected a spatial condition that requires manual officer verification before approval.',
            value=issue,
            confidence=float(validation.get('spatial_confidence', 0.0)) if isinstance(validation.get('spatial_confidence'), (int, float)) else None,
            source='GIS',
            review_required=True,
            metadata=metadata,
        )

    def _build_area_anomaly(self, comparison: dict[str, Any], *, case_id: str | None = None, document_id: str | None = None) -> Anomaly:
        classification = str(comparison.get('classification', 'UNAVAILABLE')).upper()
        severity = 'HIGH' if classification == 'SIGNIFICANT_MISMATCH' else 'MEDIUM'
        return Anomaly(
            anomaly_type='AREA_INCONSISTENCY',
            field='area',
            severity=severity,
            status='OPEN',
            message='Document area differs materially from GIS calculated area.',
            explanation='The extracted land-record area does not align closely enough with the GIS geometry and requires officer review.',
            value=comparison,
            confidence=None,
            source='GIS',
            review_required=True,
            metadata={
                'gis_check': 'area_comparison',
                'document_area': comparison.get('document_area'),
                'gis_area': comparison.get('gis_area'),
                'area_difference': comparison.get('difference'),
                'classification': classification,
                'tolerance_percent': GIS_TOLERANCE_PERCENT,
                'document_id': document_id,
                'case_id': case_id,
            },
        )

    def _severity_for_issue(self, issue_type: str, fallback: Any) -> str:
        if issue_type in {'INVALID_GEOMETRY', 'SELF_INTERSECTION', 'ZERO_AREA_GEOMETRY', 'UNSUPPORTED_GEOMETRY'}:
            return 'CRITICAL'
        if issue_type in {'CRS_MISSING', 'PROJECTED_CRS_REQUIRED', 'AREA_REQUIRES_PROJECTED_CRS', 'BOUNDARY_INCONSISTENCY'}:
            return 'HIGH'
        if issue_type in {'LOW_SPATIAL_CONFIDENCE'}:
            return 'MEDIUM'
        if fallback is not None:
            severity = str(fallback).upper()
            if severity in {'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'}:
                return severity
        return 'LOW'

    def _severity_for_relationship(self, relationship: str) -> str:
        if relationship in {'OVERLAP', 'CONTAINS', 'WITHIN', 'EQUAL'}:
            return 'CRITICAL'
        if relationship == 'TOUCHING':
            return 'HIGH'
        return 'MEDIUM'


gis_review_adapter = GISReviewAdapter()
