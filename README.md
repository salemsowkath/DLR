# DLR – Intelligent Land Record Digitization and Validation System

DLR is an AI-driven land record digitization and validation platform designed for multilingual Indian documents, starting with Tamil, English, and Hindi. The first phase focuses on a clean backend foundation, a Python FastAPI AI service, PostGIS-ready database configuration, and health verification before moving into OCR and land-field extraction.

## Architecture

- Backend: Node.js + Express.js
- AI Service: Python + FastAPI + Pydantic
- Optional persistent store: PostgreSQL + PostGIS (explicit opt-in; in-memory repositories remain the default)
- Initial support: Tamil, English, Hindi
- Future-ready modular structure for OCR, extraction, validation, and GIS comparison

## Project Structure

```text
DLR/
├── backend/
│   ├── src/
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── README.md
├── ai-service/
│   ├── app/
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   └── README.md
├── docker-compose.yml
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── README.md
├── .env.example
├── .gitignore
├── README.md
└── .venv/
```

## Run Locally

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

### 2) AI Service

```bash
cd ai-service
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3) Optional PostgreSQL / PostGIS

PostgreSQL 16+ and PostGIS 3.x must be installed separately. Docker is optional, and the application defaults to in-memory/demo persistence unless `PERSISTENCE_BACKEND=postgres` is explicitly configured.

```bash
psql -d dlr_database -v ON_ERROR_STOP=1 -f database/schema.sql
psql -d dlr_database -v ON_ERROR_STOP=1 -f database/seed.sql
```

## Health Checks

- Backend: http://localhost:4000/health
- AI Service: http://localhost:8000/health

## Phase 1 Status

Phase 1 verifies the foundation only:

- project structure creation
- Node.js backend initialization
- Python AI service initialization
- database/PostGIS configuration skeleton
- env examples
- health endpoints
- logging and error handling
- documentation

OCR, field extraction, and validation logic begin only after the foundation is verified live.

## Phase 2 Status

Phase 2 adds secure document upload and local storage:

- backend upload endpoint
- extension and MIME validation
- file-size validation
- safe filename generation
- document metadata tracking
- local file storage in `backend/uploads/documents/`
- upload tests and error handling

No OCR or NLP processing has been added in this phase.
## Important Notes

- No legal approval is performed by the AI service.
- AI output is structured and confidence-scored.
- GIS and validation layers are designed for future integration with official cadastral systems.
- The system preserves original document language and extracted text without unnecessary translation.

## Phase 3D: PostgreSQL + PostGIS Persistence

The project now includes a reproducible PostgreSQL/PostGIS schema, synthetic seed data, Python data repositories, and a Node document metadata repository. Existing in-memory review/document repositories remain the default and can be selected without a database. Set `PERSISTENCE_BACKEND=postgres` plus `DATABASE_URL` (or explicit PostgreSQL connection variables) to opt in. Connections are lazy; configuring persistence does not imply the server is installed or reachable.

The schema covers users/roles, land records and traceable fields, documents/extractions, validation results, GIS parcels/results, review cases/anomalies, officer corrections/notes, and audit events. See [database/README.md](database/README.md) for applying and verifying the schema.

GIS geometry uses flexible PostGIS geometry storage with an explicit SRID column and constraint. Writes require a declared SRID and only label coordinates; they do not transform them. The GIS engine remains responsible for validation and safe area calculations. No geographic-coordinate area is generated as square metres. No real Aadhaar data, production authentication, external integration, or document blobs are stored in PostgreSQL.

PostgreSQL/PostGIS connectivity and review-case persistence have been verified in the development environment. Persistence remains opt-in and requires the Node backend and AI service to use the same database.

## Phase 4: Backend ↔ AI Service Integration

The Node backend exposes `POST /api/documents/process` as the orchestration entry point. It persists document metadata, forwards the uploaded file to the existing FastAPI document-processing endpoint for a single OCR/extraction pass, calls the existing validation route, calls GIS when GeoJSON is supplied, and creates an officer review case when results require review. The existing upload endpoint remains unchanged.

Configure `AI_SERVICE_URL=http://127.0.0.1:8000` and `AI_SERVICE_TIMEOUT_MS=120000` in `backend/.env`. OCR, extraction, validation, and GIS remain Python-owned. Mock-server integration tests run without an external service; the synthetic live test is opt-in with `DLR_RUN_AI_INTEGRATION=1`.

## Environment Variables

Use the example env files as a template for local configuration. Do not commit real secrets.
