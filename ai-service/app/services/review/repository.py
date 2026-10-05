from __future__ import annotations

from abc import ABC, abstractmethod
from contextlib import contextmanager
from typing import Any

from app.models.review import ReviewCase


class ReviewCaseRepository(ABC):
    @contextmanager
    def transaction(self):
        yield

    @abstractmethod
    def create(self, case: ReviewCase) -> ReviewCase:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, case_id: str) -> ReviewCase | None:
        raise NotImplementedError

    @abstractmethod
    def list(self, *, status: str | None = None, priority: str | None = None, assigned_officer: str | None = None, anomaly_type: str | None = None) -> list[ReviewCase]:
        raise NotImplementedError

    @abstractmethod
    def update(self, case: ReviewCase) -> ReviewCase:
        raise NotImplementedError

    @abstractmethod
    def next_case_id(self) -> str:
        raise NotImplementedError


class AnomalyRepository(ABC):
    @abstractmethod
    def add(self, case: ReviewCase, anomaly: Any) -> None:
        raise NotImplementedError


class AuditRepository(ABC):
    @abstractmethod
    def add_event(self, case: ReviewCase, event: Any) -> None:
        raise NotImplementedError


class InMemoryReviewCaseRepository(ReviewCaseRepository):
    def __init__(self) -> None:
        self._cases: dict[str, ReviewCase] = {}
        self._counter = 1

    def create(self, case: ReviewCase) -> ReviewCase:
        self._cases[case.case_id] = case
        return case

    def get_by_id(self, case_id: str) -> ReviewCase | None:
        return self._cases.get(case_id)

    def list(self, *, status: str | None = None, priority: str | None = None, assigned_officer: str | None = None, anomaly_type: str | None = None) -> list[ReviewCase]:
        items = list(self._cases.values())
        if status:
            items = [case for case in items if case.status == status]
        if priority:
            items = [case for case in items if case.priority == priority]
        if assigned_officer:
            items = [case for case in items if (case.assigned_officer or '').lower() == assigned_officer.lower()]
        if anomaly_type:
            items = [case for case in items if any(item.anomaly_type == anomaly_type for item in case.anomalies)]
        return sorted(items, key=lambda item: item.created_at, reverse=True)

    def update(self, case: ReviewCase) -> ReviewCase:
        self._cases[case.case_id] = case
        return case

    def next_case_id(self) -> str:
        case_id = f'CASE-{self._counter:06d}'
        self._counter += 1
        return case_id


class InMemoryAnomalyRepository(AnomalyRepository):
    def add(self, case: ReviewCase, anomaly: Any) -> None:
        case.anomalies.append(anomaly)


class InMemoryAuditRepository(AuditRepository):
    def add_event(self, case: ReviewCase, event: Any) -> None:
        case.audit_events.append(event)
