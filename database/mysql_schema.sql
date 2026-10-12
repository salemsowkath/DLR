CREATE DATABASE IF NOT EXISTS dlr_database CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE dlr_database;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    external_reference VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email_hash VARCHAR(255),
    phone_token VARCHAR(255),
    password_hash VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(50),
    state VARCHAR(100),
    district VARCHAR(100),
    taluk VARCHAR(100),
    village VARCHAR(150),
    pincode VARCHAR(6),
    username VARCHAR(100) UNIQUE NULL,
    email VARCHAR(255),
    department VARCHAR(100),
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_users_external_reference (external_reference),
    UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    role_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_roles_role_name (role_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id CHAR(36) NOT NULL,
    role_id CHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    INDEX idx_user_roles_role_id (role_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS identity_verifications (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    identity_type VARCHAR(50) NOT NULL DEFAULT 'AADHAAR',
    masked_reference VARCHAR(32) NOT NULL,
    verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'VERIFIED',
    verified_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_identity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_identity_user_type (user_id, identity_type),
    UNIQUE KEY uq_identity_masked_reference (masked_reference),
    INDEX idx_identity_verifications_user_id (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS otp_verifications (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    masked_reference VARCHAR(32) NOT NULL,
    otp_code VARCHAR(16),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    registration_data JSON,
    expires_at DATETIME(6) NOT NULL,
    verified_at DATETIME(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CHECK (attempts >= 0),
    CHECK (max_attempts > 0),
    INDEX idx_otp_verifications_expires_at (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS land_records (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    record_reference VARCHAR(255) NOT NULL UNIQUE,
    owner_name VARCHAR(255),
    survey_number VARCHAR(255),
    subdivision_number VARCHAR(100),
    khasra_number VARCHAR(100),
    khata_number VARCHAR(100),
    patta_number VARCHAR(100),
    document_number VARCHAR(100),
    co_owners JSON,
    area_value DECIMAL(20,6),
    area_unit VARCHAR(50),
    village VARCHAR(150),
    taluk VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    classification VARCHAR(100),
    record_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'AI_GENERATED',
    verification_status VARCHAR(50) DEFAULT 'AI_GENERATED',
    verified_by VARCHAR(255),
    verified_at DATETIME(6),
    officer_notes TEXT,
    source_document_id VARCHAR(255),
    ocr_language VARCHAR(32),
    ocr_confidence DECIMAL(5,4),
    validation_status VARCHAR(50),
    validation_result JSON,
    citizen_submitted_data JSON,
    ai_extracted_data JSON,
    is_duplicate TINYINT(1) NOT NULL DEFAULT 0,
    duplicate_reason TEXT,
    ai_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CHECK (area_value IS NULL OR area_value >= 0),
    CHECK (ocr_confidence IS NULL OR ocr_confidence BETWEEN 0 AND 1),
    INDEX idx_land_records_survey_number (survey_number),
    INDEX idx_land_records_village (village),
    INDEX idx_land_records_district (district),
    INDEX idx_land_records_location_survey (survey_number, village, taluk, district),
    INDEX idx_land_records_status (status),
    INDEX idx_land_records_source_document (source_document_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS land_record_fields (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    land_record_id CHAR(36) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_value JSON NOT NULL,
    confidence DECIMAL(5,4),
    source VARCHAR(100),
    source_page INT,
    source_bbox JSON,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_land_fields_record FOREIGN KEY (land_record_id) REFERENCES land_records(id) ON DELETE CASCADE,
    CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    CHECK (source_page IS NULL OR source_page > 0),
    INDEX idx_land_record_fields_record (land_record_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS documents (
    document_id VARCHAR(255) NOT NULL PRIMARY KEY,
    created_by_user_id CHAR(36),
    land_record_id CHAR(36),
    document_type VARCHAR(50) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(150) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_reference VARCHAR(500) NOT NULL,
    processing_status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',
    language VARCHAR(32),
    checksum CHAR(64),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_documents_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_documents_land_record FOREIGN KEY (land_record_id) REFERENCES land_records(id) ON DELETE SET NULL,
    CHECK (file_size >= 0),
    INDEX idx_documents_user (created_by_user_id),
    INDEX idx_documents_land_record (land_record_id),
    UNIQUE KEY uq_documents_user_checksum (created_by_user_id, checksum)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS document_extractions (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    document_id VARCHAR(255) NOT NULL,
    language VARCHAR(32),
    ocr_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    extraction_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    raw_text_reference VARCHAR(500),
    structured_result JSON NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_extractions_document FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
    INDEX idx_extractions_document (document_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS document_processing_results (
    document_id VARCHAR(255) NOT NULL PRIMARY KEY,
    ocr_result JSON NOT NULL,
    extraction_result JSON NOT NULL,
    validation_result JSON NOT NULL,
    gis_result JSON NOT NULL,
    review_result JSON NOT NULL,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_processing_document FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS validation_results (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    land_record_id CHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL,
    score DECIMAL(6,2),
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    result_json JSON NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_validation_record FOREIGN KEY (land_record_id) REFERENCES land_records(id) ON DELETE CASCADE,
    INDEX idx_validation_record (land_record_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gis_parcels (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    land_record_id CHAR(36) NOT NULL,
    parcel_reference VARCHAR(255) NOT NULL UNIQUE,
    geometry GEOMETRY NOT NULL,
    geometry_type VARCHAR(32) NOT NULL,
    srid INT NOT NULL,
    area_value DECIMAL(20,6),
    area_unit VARCHAR(50),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_gis_parcel_record FOREIGN KEY (land_record_id) REFERENCES land_records(id) ON DELETE CASCADE,
    CHECK (srid > 0),
    CHECK (area_value IS NULL OR area_value >= 0),
    INDEX idx_gis_parcels_land_record_id (land_record_id),
    SPATIAL INDEX idx_gis_parcels_geometry (geometry)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gis_validation_results (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    land_record_id CHAR(36) NOT NULL,
    parcel_id CHAR(36),
    geometry_status VARCHAR(50) NOT NULL,
    spatial_confidence DECIMAL(5,4),
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    area_comparison JSON NOT NULL,
    overlap_findings JSON NOT NULL,
    boundary_findings JSON NOT NULL,
    crs VARCHAR(64),
    result_json JSON NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_gis_validation_record FOREIGN KEY (land_record_id) REFERENCES land_records(id) ON DELETE CASCADE,
    CONSTRAINT fk_gis_validation_parcel FOREIGN KEY (parcel_id) REFERENCES gis_parcels(id) ON DELETE SET NULL,
    CHECK (spatial_confidence IS NULL OR spatial_confidence BETWEEN 0 AND 1),
    INDEX idx_gis_validation_record (land_record_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS review_cases (
    case_id VARCHAR(255) NOT NULL PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL,
    land_record_id CHAR(36),
    status ENUM('PENDING_REVIEW', 'IN_REVIEW', 'CORRECTION_REQUIRED', 'ON_HOLD', 'REJECTED', 'APPROVED', 'CLOSED') NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    validation_score DECIMAL(6,2) NOT NULL DEFAULT 100,
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    case_data JSON NOT NULL,
    ai_confidence DECIMAL(5,4),
    validation_result JSON,
    assigned_officer_id CHAR(36),
    reviewed_by CHAR(36),
    reviewed_at DATETIME(6),
    officer_notes TEXT,
    rejection_reason TEXT,
    is_duplicate TINYINT(1) NOT NULL DEFAULT 0,
    duplicate_reason TEXT,
    ai_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_review_document FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE RESTRICT,
    CONSTRAINT fk_review_record FOREIGN KEY (land_record_id) REFERENCES land_records(id) ON DELETE SET NULL,
    CONSTRAINT fk_review_assigned_officer FOREIGN KEY (assigned_officer_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_review_cases_status (status),
    INDEX idx_review_cases_priority (priority)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_id VARCHAR(255) NOT NULL PRIMARY KEY,
    applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS review_anomalies (
    anomaly_id VARCHAR(255) NOT NULL PRIMARY KEY,
    case_id VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    field VARCHAR(100),
    severity ENUM('INFO', 'LOW', 'MEDIUM', 'WARNING', 'HIGH', 'ERROR', 'CRITICAL') NOT NULL,
    status ENUM('OPEN', 'RESOLVED', 'DISMISSED') NOT NULL,
    source VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    title VARCHAR(255),
    message TEXT NOT NULL,
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSON NOT NULL,
    created_at DATETIME(6) NOT NULL,
    resolved_at DATETIME(6),
    CONSTRAINT fk_anomaly_case FOREIGN KEY (case_id) REFERENCES review_cases(case_id) ON DELETE CASCADE,
    INDEX idx_review_anomalies_case_id (case_id),
    INDEX idx_review_anomalies_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS officer_corrections (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    case_id VARCHAR(255) NOT NULL,
    anomaly_id VARCHAR(255),
    field VARCHAR(100) NOT NULL,
    original_value JSON,
    corrected_value JSON,
    reason TEXT NOT NULL,
    officer_id VARCHAR(255) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_correction_case FOREIGN KEY (case_id) REFERENCES review_cases(case_id) ON DELETE CASCADE,
    CONSTRAINT fk_correction_anomaly FOREIGN KEY (anomaly_id) REFERENCES review_anomalies(anomaly_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS officer_notes (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    case_id VARCHAR(255) NOT NULL,
    officer_id VARCHAR(255) NOT NULL,
    note TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_note_case FOREIGN KEY (case_id) REFERENCES review_cases(case_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    case_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    actor_type VARCHAR(100) NOT NULL,
    actor_reference VARCHAR(255) NOT NULL,
    metadata JSON NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_audit_case FOREIGN KEY (case_id) REFERENCES review_cases(case_id) ON DELETE CASCADE,
    INDEX idx_audit_case (case_id),
    INDEX idx_audit_event_type (event_type)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
