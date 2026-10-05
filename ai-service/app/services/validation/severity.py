from __future__ import annotations

SEVERITY_ORDER = {'INFO': 0, 'WARNING': 1, 'ERROR': 2, 'CRITICAL': 3}


def severity_rank(severity: str) -> int:
    return SEVERITY_ORDER.get(severity.upper(), 0)
