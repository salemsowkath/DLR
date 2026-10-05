CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SEQUENCE IF NOT EXISTS review_case_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_reference TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email_hash TEXT,
    phone_token TEXT,
    password_hash TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS land_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_reference TEXT NOT NULL UNIQUE,
    owner_name TEXT,
    survey_number TEXT,
    area_value NUMERIC(20, 6) CHECK (area_value IS NULL OR area_value >= 0),
    area_unit TEXT,
    village TEXT,
    taluk TEXT,
    district TEXT,
    classification TEXT,
    record_date DATE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'UNDER_REVIEW', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS land_record_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_value JSONB NOT NULL,
    confidence NUMERIC(5, 4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    source TEXT,
    source_page INTEGER CHECK (source_page IS NULL OR source_page > 0),
    source_bbox JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
    document_id TEXT PRIMARY KEY,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    land_record_id UUID REFERENCES land_records(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size >= 0),
    storage_reference TEXT NOT NULL,
    checksum TEXT,
    processing_status TEXT NOT NULL DEFAULT 'UPLOADED',
    language TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    language TEXT,
    ocr_status TEXT NOT NULL DEFAULT 'PENDING',
    extraction_status TEXT NOT NULL DEFAULT 'PENDING',
    raw_text_reference TEXT,
    structured_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Citizen-visible pipeline output is linked to the owning document. The document
-- foreign key keeps results inside the existing ownership boundary.
CREATE TABLE IF NOT EXISTS document_processing_results (
    document_id TEXT PRIMARY KEY REFERENCES documents(document_id) ON DELETE CASCADE,
    ocr_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    extraction_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    gis_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    review_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    score NUMERIC(6, 2),
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    result_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gis_parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    parcel_reference TEXT NOT NULL,
    geometry geometry NOT NULL,
    geometry_type TEXT NOT NULL,
    srid INTEGER NOT NULL CHECK (srid > 0),
    area_value NUMERIC(20, 6) CHECK (area_value IS NULL OR area_value >= 0),
    area_unit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ST_SRID(geometry) = srid)
);

CREATE TABLE IF NOT EXISTS gis_validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_record_id UUID NOT NULL REFERENCES land_records(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES gis_parcels(id) ON DELETE SET NULL,
    geometry_status TEXT NOT NULL,
    spatial_confidence NUMERIC(5, 4) CHECK (spatial_confidence IS NULL OR spatial_confidence BETWEEN 0 AND 1),
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    area_comparison JSONB NOT NULL DEFAULT '{}'::jsonb,
    overlap_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    boundary_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    crs TEXT,
    result_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_cases (
    case_id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(document_id) ON DELETE RESTRICT,
    land_record_id UUID REFERENCES land_records(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING_REVIEW', 'IN_REVIEW', 'CORRECTION_REQUIRED', 'ON_HOLD', 'REJECTED', 'APPROVED', 'CLOSED')),
    priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    validation_score NUMERIC(6, 2) NOT NULL DEFAULT 100,
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    case_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS review_anomalies (
    anomaly_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES review_cases(case_id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    field TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'WARNING', 'HIGH', 'ERROR', 'CRITICAL')),
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
    source TEXT NOT NULL DEFAULT 'SYSTEM',
    title TEXT,
    message TEXT NOT NULL,
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS officer_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id TEXT NOT NULL REFERENCES review_cases(case_id) ON DELETE CASCADE,
    anomaly_id TEXT REFERENCES review_anomalies(anomaly_id) ON DELETE SET NULL,
    field TEXT NOT NULL,
    original_value JSONB,
    corrected_value JSONB,
    reason TEXT NOT NULL,
    officer_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS officer_notes (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES review_cases(case_id) ON DELETE CASCADE,
    officer_id TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    case_id TEXT REFERENCES review_cases(case_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_reference TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_land_records_survey_number ON land_records (survey_number);
CREATE INDEX IF NOT EXISTS idx_land_records_village ON land_records (village);
CREATE INDEX IF NOT EXISTS idx_land_records_district ON land_records (district);
CREATE INDEX IF NOT EXISTS idx_review_cases_status ON review_cases (status);
CREATE INDEX IF NOT EXISTS idx_review_cases_priority ON review_cases (priority);
CREATE INDEX IF NOT EXISTS idx_review_anomalies_case_id ON review_anomalies (case_id);
CREATE INDEX IF NOT EXISTS idx_review_anomalies_status ON review_anomalies (status);
CREATE INDEX IF NOT EXISTS idx_gis_parcels_land_record_id ON gis_parcels (land_record_id);
CREATE INDEX IF NOT EXISTS idx_gis_parcels_geometry ON gis_parcels USING GIST (geometry);

