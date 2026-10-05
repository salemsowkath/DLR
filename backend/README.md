# DLR Backend

The backend is the orchestration layer for the DLR platform. It handles HTTP requests, secure document uploads, metadata tracking, AI processing requests, validation coordination, and future GIS integration points.

## Local Development

```bash
npm install
npm run dev
```

## Health Endpoint

```bash
curl http://localhost:4000/health
```

## Phase 2: Document Upload

### Endpoint

```http
POST /api/documents/upload
```

### Supported file types

- PDF
- JPG
- JPEG
- PNG

### Upload limits

- Maximum file size: 5 MB
- Multipart form field name: `file`

### Request format

```bash
curl -F "file=@/path/to/document.pdf" http://localhost:4000/api/documents/upload
```

### Storage behavior

- The backend validates extension and MIME type.
- It rejects unsupported or oversized files.
- It rejects file payloads that do not match the expected PDF/JPEG/PNG signatures where practical.
- It saves the uploaded file to the local backend storage directory without altering file contents.
- Storage path: `backend/uploads/documents/`
- The original client-provided filename is sanitized before storage and not trusted as the final filename.

### Response format

```json
{
  "success": true,
  "message": "Document uploaded successfully.",
  "data": {
    "document_id": "DOC-20261005-abc123",
    "original_filename": "document.pdf",
    "stored_filename": "1710000000000-abc-document.pdf",
    "file_type": "pdf",
    "mime_type": "application/pdf",
    "file_size": 123456,
    "storage_path": "uploads/documents/1710000000000-abc-document.pdf",
    "processing_status": "UPLOADED",
    "language": null,
    "uploaded_at": "2026-10-05T10:00:00.000Z",
    "updated_at": "2026-10-05T10:00:00.000Z"
  },
  "meta": {}
}
```

### Error responses

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Unsupported file type. Only PDF, JPG, JPEG, and PNG are allowed."
  }
}
```

Common error codes:
- `INVALID_FILE_TYPE`
- `FILE_TOO_LARGE`
- `INVALID_FILE`
- `UPLOAD_FAILED`

## Environment

Copy `.env.example` to `.env` and update the variables for your local environment.

## Phase 3D: Optional PostgreSQL Persistence

The backend uses the existing `pg` dependency through one lazy connection pool. Document metadata defaults to the existing in-memory repository. To opt into PostgreSQL, set `PERSISTENCE_BACKEND=postgres` and provide `DATABASE_URL`, or set all of `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`. Missing configuration leaves persistence disabled; credentials are not hard-coded. Uploaded document bytes continue to be stored as local files, with only metadata and a storage reference stored in PostgreSQL.

Apply the shared schema and synthetic seed from the workspace root using the commands in `database/README.md`. Node repository tests use an injected pool; the live PostgreSQL/PostGIS integration was also verified in this environment.

## Phase 4: Backend ↔ AI Service Integration

`POST /api/documents/process` accepts a multipart document (`file`, optional `language`, and optional GeoJSON `geometry` plus `crs`). It validates and stores the upload through the existing document service/repository, then sends the stored file to FastAPI. The existing `POST /api/documents/upload` endpoint remains unchanged.

The orchestration calls the actual AI routes in order:

1. `POST /api/v1/documents/process` performs one OCR pass and source-mapped extraction.
2. `POST /api/v1/validation/land-record` validates the extracted fields.
3. `POST /api/v1/gis/land-record` runs only when geometry is supplied.
4. `POST /api/v1/review/cases` creates an officer case when validation or GIS requires review.

The unified response includes document status, OCR confidence, extracted fields, validation issues/score, optional GIS area/overlap results, and review status. Node does not duplicate AI logic. AI errors and timeouts use explicit `AI_*` error codes; persisted document status transitions through `UPLOADED`, `PROCESSING`, `PROCESSED`, or `FAILED`.

Set `AI_SERVICE_URL` and `AI_SERVICE_TIMEOUT_MS` in the backend `.env`; `.env.example` points to `http://127.0.0.1:8000`. With PostgreSQL enabled, the backend and AI service must use the same database so review-case document foreign keys resolve.

Automated integration tests use a local HTTP mock. The optional live test requires `DLR_RUN_AI_INTEGRATION=1` and a running FastAPI service:

```powershell
$env:AI_SERVICE_URL = 'http://127.0.0.1:8000'
$env:DLR_RUN_AI_INTEGRATION = '1'
npm test -- --test-name-pattern="live backend upload"
```

It uploads generated synthetic image data and cleans its unique rows when PostgreSQL mode is selected.
