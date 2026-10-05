# DLR AI Service

The DLR AI service is the Python component responsible for multilingual document OCR, preprocessing, and future validation workflows for land records. It supports document intake, OCR orchestration, confidence scoring, and modular replacement of OCR engines without changing the API contract.

## Python Version

- Python 3.13.7

## AI Service Purpose

- Accept land-record documents in image and PDF formats
- Preprocess documents for OCR readability
- Extract text with multilingual support for English, Tamil, and Hindi
- Return OCR text plus confidence scores
- Keep the OCR engine replaceable through a modular service design

## Installation

```bash
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Tesseract Installation Requirement

This service requires the system Tesseract OCR executable.

- Install Tesseract OCR from the official package
- Ensure the command is available in PATH or set `TESSERACT_CMD` in `.env`
- Tesseract language data must be installed for `eng`, `tam`, and `hin`

If a requested language is unavailable, the API returns a clear validation/configuration error instead of silently failing.

## Environment Variables

Copy `.env.example` to `.env` and configure values as needed:

```bash
TESSERACT_CMD=
OCR_MAX_FILE_SIZE_MB=10
OCR_DEFAULT_LANGUAGE=eng
GIS_PROJECTED_CRS=EPSG:32644
```

`GIS_PROJECTED_CRS` is optional. When it is not configured, geographic CRSs remain safe and the service returns `AREA_REQUIRES_PROJECTED_CRS` instead of reporting degrees² as square metres.

## Starting the Service

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## OCR API Endpoint

```http
POST /api/v1/ocr/extract
```

Multipart form data:
- `file` - uploaded document
- `language` - optional, defaults to `eng`

Supported values:
- `eng`
- `tam`
- `hin`
- `tam+eng`
- `hin+eng`
- `tam+hin`
- `tam+hin+eng`

## Example curl Request

```bash
curl -X POST "http://localhost:8000/api/v1/ocr/extract" \
  -F "file=@/path/to/land_record.jpg" \
  -F "language=tam+eng"
```

## Example Response

```json
{
  "success": true,
  "service": "dlr-ai-service",
  "operation": "ocr",
  "filename": "land_record.jpg",
  "language": "tam+eng",
  "document_type": "image",
  "page_count": 1,
  "overall_confidence": 91.35,
  "pages": [
    {
      "page_number": 1,
      "text": "sample extracted text",
      "confidence": 91.35
    }
  ]
}
```

## Phase 3A: AI Land Record Validation Engine

The AI service now includes a deterministic validation layer that evaluates extracted land-record fields for required-data checks, format validation, area normalization, confidence review, duplicate detection, and simple conflict checks. This is an AI-assisted consistency engine only. It does not make legal ownership decisions.

### Validation rules

- Required-field checks for owner, survey number, area, village, taluk, and district
- Survey-number format validation for common land record patterns
- Area parsing and normalization for acre, hectare, square feet, and cent values
- Date validation and malformed-date detection
- Confidence thresholds for low-confidence extraction review
- Duplicate and conflict detection across two structured records
- Traceability from field to source page and bounding box when available

### API examples

```bash
curl -X POST "http://localhost:8000/api/v1/validation/land-record" \
  -H "Content-Type: application/json" \
  -d '{
    "owner_name": {"value": "TEST_OWNER_NAME", "confidence": 0.96},
    "survey_number": {"value": "125/3A", "confidence": 0.98},
    "area": {"value": "2.50 Acres", "confidence": 0.91},
    "village": {"value": "Salem", "confidence": 0.95},
    "taluk": {"value": "Salem", "confidence": 0.94},
    "district": {"value": "Salem", "confidence": 0.97}
  }'
```

```bash
curl -X POST "http://localhost:8000/api/v1/validation/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "record_a": {"survey_number": {"value": "125/3A"}, "owner_name": {"value": "A"}, "area": {"value": "2.5 Acres"}},
    "record_b": {"survey_number": {"value": "125/3A"}, "owner_name": {"value": "A"}, "area": {"value": "2.5 Acres"}}
  }'
```

### Validation output

The validation response returns a deterministic status, overall score, checks, and review flags without making legal determinations.

## Phase 3B: Officer Review and Anomaly Management

The AI system provides advisory validation and anomaly detection. Final verification remains with the authorized government officer.

### Officer workflow

1. Document submission
2. OCR and field extraction
3. Validation and anomaly detection
4. Officer review case creation
5. Human action: approve, request correction, hold, or reject
6. Field correction with preserved history
7. Revalidation after correction
8. Audit trail creation

### Supported actions

- Create review case
- Start review
- Approve case
- Request correction
- Hold case
- Reject case
- Correct extracted field
- Add officer note
- Resolve anomaly
- Dismiss anomaly
- Retrieve audit history

### State transitions

- PENDING_REVIEW -> IN_REVIEW
- IN_REVIEW -> APPROVED
- IN_REVIEW -> CORRECTION_REQUIRED
- IN_REVIEW -> ON_HOLD
- IN_REVIEW -> REJECTED
- CORRECTION_REQUIRED -> IN_REVIEW
- ON_HOLD -> IN_REVIEW
- APPROVED -> CLOSED

Invalid transitions return a clear API error.

### Security and privacy notes

- The review layer does not implement production authentication.
- Officer identity is passed as an abstraction using `officer_id` and `officer_role`.
- Audit logging masks sensitive values before persistence.
- Real land documents are never stored in tests.

### Known limitations

- No production cadastral database integration or GIS authorization
- No production RBAC or external governmental system integration
- The review flow is advisory and does not replace legal officer responsibility

## Phase 3C-1: GeoJSON and Shapely Spatial Validation Engine

Phase 3C-1 uses GeoJSON and Shapely for spatial validation. Optional PostgreSQL/PostGIS persistence is described in Phase 3D.

### Spatial capabilities

- GeoJSON validation for Feature, FeatureCollection, Polygon, and MultiPolygon
- Shapely-based polygon and MultiPolygon validation
- CRS safety checks for geographic coordinates
- area calculation in square metres for projected CRS
- unit conversion for square feet, acre, hectare, and cent
- document-area comparison and tolerance-based classification
- parcel overlap and touching detection
- spatial confidence and score reporting

### CRS safety

The system does not silently treat EPSG:4326 as planar square-metre area. When a geographic CRS is supplied, geometry validation still works, but planar area is marked unavailable and the response includes `AREA_REQUIRES_PROJECTED_CRS`.

### Advisory role

Spatial validation is advisory and does not determine legal ownership or boundary rights.

## Phase 3C-2: GIS → Officer Review Integration

The GIS layer is now integrated into the review workflow as an advisory evidence source. It converts spatial findings into standard review anomalies so that an authorized officer can evaluate them before any decision is made.

### Architecture

Land record → GIS validation → GIS findings → GIS anomaly mapping → officer review case → officer action → audit trail.

The workflow remains advisory and does not replace legal determination. It feeds the review process with source-aware spatial evidence, including CRS context, area difference, overlap result, and confidence score.

### GIS finding mapping

- Invalid geometry → GIS_REVIEW_REQUIRED
- Self-intersection → GIS_REVIEW_REQUIRED
- Zero-area geometry → GIS_REVIEW_REQUIRED
- Major document/GIS mismatch → AREA_INCONSISTENCY
- Minor document/GIS variance → AREA_INCONSISTENCY
- Parcel overlap/touching → RECORD_CONFLICT or GIS_REVIEW_REQUIRED
- Boundary inconsistency → GIS_REVIEW_REQUIRED
- Unsupported geometry → GIS_REVIEW_REQUIRED
- Projected CRS required → GIS_REVIEW_REQUIRED
- Low spatial confidence → GIS_REVIEW_REQUIRED

### Severity mapping

- CRITICAL: invalid geometry, severe overlap/conflict, unusable spatial record
- HIGH: major boundary issue, significant area mismatch, projected CRS missing for a planar comparison
- MEDIUM: minor area variance, low spatial confidence
- LOW: informational spatial finding

### Officer workflow

1. Create a review case with optional GIS findings
2. Attach GIS anomalies as standard review anomalies
3. Permit officer review actions: resolve, dismiss, add note, request correction, hold, or reject
4. Keep audit records without saving raw sensitive document content

### Audit trail

GIS findings produce audit events such as `GIS_FINDINGS_ATTACHED`, preserving the case identifier, number of GIS findings, number of GIS anomalies, and safe metadata. Sensitive document content is never stored in audit logs.

### Legal and safety boundary

The GIS engine and AI remain advisory systems. They can flag inconsistencies, but they cannot automatically reject ownership or legal claims. Final review remains with the authorized officer.

### Projected CRS configuration

Use the environment variable `GIS_PROJECTED_CRS` to specify a preferred projected CRS for area calculations, for example `EPSG:32644`.

If the CRS is missing or geographic, the system keeps calculations safe and emits `AREA_REQUIRES_PROJECTED_CRS` instead of reporting degrees² as square metres.

## Phase 3C-3: Officer Review UX/API Payload Layer

Phase 3C-3 adds a frontend-oriented read model for the future React Officer Dashboard. It projects existing review case, extraction, validation, GIS, anomaly, officer, and audit data into one response; it does not introduce another validation or GIS calculation engine.

### Endpoints

- `GET /api/v1/review/cases/{case_id}/view` returns one complete dashboard payload.
- `GET /api/v1/review/cases/summary` returns lightweight dashboard rows without full case, geometry, or audit data.

Existing review endpoints and response contracts remain available. The view is derived from case data; optional GIS results are retained when supplied at case creation. OCR page text is not attached to review cases, and overall AI confidence is null unless that aggregate already exists in the case data.

### View payload

The view includes case status and timestamps, normalized land-record fields and source traceability, existing field confidence values, validation issues and status, GIS geometry/area/overlap/boundary findings, review anomalies, anomaly counts, officer corrections and notes, a safe recent audit summary, decision hints, and deterministic priority.

Geographic-CRS area values remain unavailable when the GIS engine reports `AREA_REQUIRES_PROJECTED_CRS`; the view does not reinterpret coordinate degrees as square metres. GIS checks remain advisory and never automatically approve or reject a land record.

### Anomaly and priority summaries

Anomaly totals and severity/status counts are derived directly from current case anomalies. Dashboard priority is deterministic: any open CRITICAL anomaly gives CRITICAL; otherwise any open HIGH gives HIGH; otherwise MEDIUM applies when there are MEDIUM anomalies or validation/GIS review flags; otherwise priority is LOW. No independent count or priority state is stored.

### Decision hints and privacy

`decision` flags reflect the existing allowed workflow transitions and whether open high-severity review-required anomalies exist. They are UI hints only; existing service transition checks remain authoritative. Recent audit events expose event type, timestamp, and actor only, omitting raw old/new values and audit metadata. Sensitive digit-only display values are masked in dashboard list summaries using the existing masking utility.

Missing GIS or validation data is represented as `UNAVAILABLE`; malformed case identifiers return `INVALID_CASE_ID`, and unknown valid identifiers return `CASE_NOT_FOUND`.

## Testing Instructions

```bash
pytest -q
```

Integration tests that require a real Tesseract installation should be marked separately and are not required for normal unit coverage.

## Phase 3D: Optional PostgreSQL + PostGIS Persistence

The AI service now has a PostgreSQL connection helper and repository implementations for land records/fields, document extractions, validation results, GIS parcels/results, review aggregates/anomalies, and audit events. Review persistence is selected through the existing repository abstraction. `PERSISTENCE_BACKEND=memory` remains the default; select `postgres` explicitly to use PostgreSQL. Configure `DATABASE_URL` or `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. No password is hard-coded, and connection setup is lazy.

Install dependencies from `requirements.txt` to include `psycopg`. Apply `database/schema.sql` and `database/seed.sql` from the workspace root; schema and verification details are in `database/README.md`. PostgreSQL 16+ and PostGIS 3.x are required for the persistent spatial repository. The application does not install or start either service.

GIS parcel persistence requires an explicit positive SRID and never calls `ST_Transform`. Geometry is stored with flexible SRID support and checked against its explicit SRID column. SQL does not calculate area; geographic-coordinate calculations remain unavailable under the existing `AREA_REQUIRES_PROJECTED_CRS` behavior.

Database contract tests use injected fake connections and do not require PostgreSQL. A live smoke test is marked `postgres_integration` and skips by default. To run it after installing/configuring PostgreSQL 16+ with PostGIS 3.x and installing the requirements:

```powershell
$env:DLR_RUN_POSTGRES_INTEGRATION = '1'
$env:DATABASE_URL = 'postgresql://USER:CHANGE_ME@localhost:5432/dlr_database'
.\.venv\Scripts\python.exe -m pytest -m postgres_integration -q
```

PostgreSQL 16/PostGIS 3 connectivity and the review persistence path have been verified in the development environment. The live integration test remains opt-in.

## Phase 4: Backend Integration

The Node backend calls the existing `POST /api/v1/documents/process` endpoint for one OCR pass plus extraction, followed by `POST /api/v1/validation/land-record`. When the request includes geometry, Node calls `POST /api/v1/gis/land-record`; when validation or GIS requests review, it calls `POST /api/v1/review/cases` with the backend's persisted document ID. No OCR, extraction, validation, or GIS algorithm is duplicated in Node.

The document-processing response exposes OCR engine confidence as `ocr.confidence` (0-100); `ocr.average_confidence` is retained for compatibility and remains the existing extraction-field average. Review case persistence in PostgreSQL requires the backend's `documents` row to exist in the same database before case creation.
