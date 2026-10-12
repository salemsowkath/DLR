ALTER TABLE review_cases MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING_OFFICER_REVIEW';

CREATE TABLE IF NOT EXISTS appointments (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    case_id VARCHAR(255) NOT NULL,
    citizen_id CHAR(36) NOT NULL,
    officer_id CHAR(36) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(50) NOT NULL,
    office_location VARCHAR(255) NOT NULL,
    purpose VARCHAR(255) NOT NULL DEFAULT 'PHYSICAL_VERIFICATION',
    status ENUM('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'MISSED') NOT NULL DEFAULT 'SCHEDULED',
    notes TEXT,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_appointments_case_id (case_id),
    INDEX idx_appointments_citizen_id (citizen_id),
    INDEX idx_appointments_officer_id (officer_id),
    INDEX idx_appointments_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS verification_sessions (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    case_id VARCHAR(255) NOT NULL,
    appointment_id CHAR(36),
    citizen_id CHAR(36) NOT NULL,
    officer_id CHAR(36) NOT NULL,
    otp_verified TINYINT(1) NOT NULL DEFAULT 0,
    otp_verified_at DATETIME(6),
    photo_captured TINYINT(1) NOT NULL DEFAULT 0,
    photo_captured_at DATETIME(6),
    photo_id CHAR(36),
    documents_checked TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
    notes TEXT,
    started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    completed_at DATETIME(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_verification_sessions_case_id (case_id),
    INDEX idx_verification_sessions_citizen_id (citizen_id),
    INDEX idx_verification_sessions_officer_id (officer_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS citizen_verification_photos (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    session_id CHAR(36) NOT NULL,
    case_id VARCHAR(255) NOT NULL,
    citizen_id CHAR(36) NOT NULL,
    officer_id CHAR(36) NOT NULL,
    storage_reference VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
    file_size BIGINT NOT NULL DEFAULT 0,
    captured_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_verification_photos_case_id (case_id),
    INDEX idx_verification_photos_session_id (session_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS verification_otps (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    session_id CHAR(36) NOT NULL,
    case_id VARCHAR(255) NOT NULL,
    citizen_id CHAR(36) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    verified TINYINT(1) NOT NULL DEFAULT 0,
    expires_at DATETIME(6) NOT NULL,
    verified_at DATETIME(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_verification_otps_session_id (session_id),
    INDEX idx_verification_otps_case_id (case_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    target_role VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO',
    reference_id VARCHAR(255),
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_target_role (target_role),
    INDEX idx_notifications_is_read (is_read)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS digital_land_records (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    record_id VARCHAR(255) NOT NULL UNIQUE,
    case_id VARCHAR(255) NOT NULL,
    land_record_id CHAR(36) NOT NULL,
    citizen_id CHAR(36) NOT NULL,
    approved_by_officer_id CHAR(36) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    survey_number VARCHAR(255) NOT NULL,
    khasra_number VARCHAR(100),
    khata_number VARCHAR(100),
    area_value DECIMAL(20,6),
    area_unit VARCHAR(50),
    village VARCHAR(150) NOT NULL,
    taluk VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Tamil Nadu',
    classification VARCHAR(100),
    final_approved_data JSON NOT NULL,
    verification_session_id CHAR(36),
    status VARCHAR(50) NOT NULL DEFAULT 'GOVERNMENT_APPROVED',
    approval_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_digital_land_records_case_id (case_id),
    INDEX idx_digital_land_records_citizen_id (citizen_id),
    INDEX idx_digital_land_records_survey_number (survey_number),
    INDEX idx_digital_land_records_location (survey_number, village, taluk, district)
) ENGINE=InnoDB;
