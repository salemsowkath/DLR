-- Migration 006: State Administration & Jurisdiction-based RBAC
-- Adds 28 Indian States Master, State Admin Role, Profiles & Jurisdiction Constraints

CREATE TABLE IF NOT EXISTS states (
    id CHAR(36) NOT NULL PRIMARY KEY,
    state_code VARCHAR(10) NOT NULL UNIQUE,
    state_name VARCHAR(100) NOT NULL UNIQUE,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_states_code (state_code),
    INDEX idx_states_name (state_name)
) ENGINE=InnoDB;

INSERT IGNORE INTO roles (id, role_name, description) VALUES
(UUID(), 'STATE_ADMIN', 'State Administrator for state-level land records and personnel governance');

INSERT IGNORE INTO states (id, state_code, state_name, is_active) VALUES
('e0000001-0000-0000-0000-000000000001', 'AP', 'Andhra Pradesh', 1),
('e0000001-0000-0000-0000-000000000002', 'AR', 'Arunachal Pradesh', 1),
('e0000001-0000-0000-0000-000000000003', 'AS', 'Assam', 1),
('e0000001-0000-0000-0000-000000000004', 'BR', 'Bihar', 1),
('e0000001-0000-0000-0000-000000000005', 'CG', 'Chhattisgarh', 1),
('e0000001-0000-0000-0000-000000000006', 'GA', 'Goa', 1),
('e0000001-0000-0000-0000-000000000007', 'GJ', 'Gujarat', 1),
('e0000001-0000-0000-0000-000000000008', 'HR', 'Haryana', 1),
('e0000001-0000-0000-0000-000000000009', 'HP', 'Himachal Pradesh', 1),
('e0000001-0000-0000-0000-000000000010', 'JH', 'Jharkhand', 1),
('e0000001-0000-0000-0000-000000000011', 'KA', 'Karnataka', 1),
('e0000001-0000-0000-0000-000000000012', 'KL', 'Kerala', 1),
('e0000001-0000-0000-0000-000000000013', 'MP', 'Madhya Pradesh', 1),
('e0000001-0000-0000-0000-000000000014', 'MH', 'Maharashtra', 1),
('e0000001-0000-0000-0000-000000000015', 'MN', 'Manipur', 1),
('e0000001-0000-0000-0000-000000000016', 'ML', 'Meghalaya', 1),
('e0000001-0000-0000-0000-000000000017', 'MZ', 'Mizoram', 1),
('e0000001-0000-0000-0000-000000000018', 'NL', 'Nagaland', 1),
('e0000001-0000-0000-0000-000000000019', 'OD', 'Odisha', 1),
('e0000001-0000-0000-0000-000000000020', 'PB', 'Punjab', 1),
('e0000001-0000-0000-0000-000000000021', 'RJ', 'Rajasthan', 1),
('e0000001-0000-0000-0000-000000000022', 'SK', 'Sikkim', 1),
('e0000001-0000-0000-0000-000000000023', 'TN', 'Tamil Nadu', 1),
('e0000001-0000-0000-0000-000000000024', 'TS', 'Telangana', 1),
('e0000001-0000-0000-0000-000000000025', 'TR', 'Tripura', 1),
('e0000001-0000-0000-0000-000000000026', 'UP', 'Uttar Pradesh', 1),
('e0000001-0000-0000-0000-000000000027', 'UK', 'Uttarakhand', 1),
('e0000001-0000-0000-0000-000000000028', 'WB', 'West Bengal', 1);

ALTER TABLE users ADD COLUMN state_id CHAR(36) NULL;
ALTER TABLE users ADD COLUMN district_id VARCHAR(50) NULL;
ALTER TABLE users ADD INDEX idx_users_state_id (state_id);
ALTER TABLE users ADD INDEX idx_users_district (district);

ALTER TABLE land_records ADD COLUMN state_id CHAR(36) NULL;
ALTER TABLE land_records ADD INDEX idx_land_records_state_id (state_id);
ALTER TABLE land_records ADD INDEX idx_land_records_district (district);

CREATE TABLE IF NOT EXISTS state_admin_profiles (
    id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL UNIQUE,
    state_id CHAR(36) NOT NULL UNIQUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_state_admin_user (user_id),
    INDEX idx_state_admin_state (state_id),
    CONSTRAINT fk_state_admin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_state_admin_state FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

UPDATE users SET state_id = 'e0000001-0000-0000-0000-000000000023' WHERE state = 'Tamil Nadu' AND state_id IS NULL;
UPDATE land_records SET state_id = 'e0000001-0000-0000-0000-000000000023' WHERE (state = 'Tamil Nadu' OR state IS NULL) AND state_id IS NULL;

-- Demo State Admin for Tamil Nadu
INSERT INTO users (id, external_reference, username, name, email, department, state, state_id, password_hash, status)
VALUES (
    'usr-stateadmin-tn',
    'STATE-ADMIN-TN',
    'Tamil_Nadu_admin',
    'Tamil Nadu State Administrator',
    'admin@tn.gov.in',
    'Land Records & Revenue',
    'Tamil Nadu',
    'e0000001-0000-0000-0000-000000000023',
    '$2b$10$9tHzNE.UeP2Ivv7L1lMiMeMWKkKqVqKdl2dxqDkIMhxE5FEusIHg2',
    'ACTIVE'
) ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    email = VALUES(email),
    state_id = VALUES(state_id),
    password_hash = VALUES(password_hash),
    status = VALUES(status);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 'usr-stateadmin-tn', id FROM roles WHERE role_name = 'STATE_ADMIN';

INSERT INTO state_admin_profiles (id, user_id, state_id)
VALUES (UUID(), 'usr-stateadmin-tn', 'e0000001-0000-0000-0000-000000000023')
ON DUPLICATE KEY UPDATE state_id = VALUES(state_id);

-- Demo State Admin for Kerala (for cross-state authorization tests)
INSERT INTO users (id, external_reference, username, name, email, department, state, state_id, password_hash, status)
VALUES (
    'usr-stateadmin-kl',
    'STATE-ADMIN-KL',
    'Kerala_admin',
    'Kerala State Administrator',
    'admin@kerala.gov.in',
    'Revenue & Land Affairs',
    'Kerala',
    'e0000001-0000-0000-0000-000000000012',
    '$2b$10$/rEQ.KzkHOk4Fg8gprZUheRLcglQ6EYNKeoERN4TuZbIsBMS0Tasu',
    'ACTIVE'
) ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    email = VALUES(email),
    state_id = VALUES(state_id),
    password_hash = VALUES(password_hash),
    status = VALUES(status);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 'usr-stateadmin-kl', id FROM roles WHERE role_name = 'STATE_ADMIN';

INSERT INTO state_admin_profiles (id, user_id, state_id)
VALUES (UUID(), 'usr-stateadmin-kl', 'e0000001-0000-0000-0000-000000000012')
ON DUPLICATE KEY UPDATE state_id = VALUES(state_id);

-- Demo Kerala Minister
INSERT INTO users (id, external_reference, username, name, email, department, state, state_id, password_hash, status)
VALUES (
    'usr-minister-kl',
    'MINISTER-KL-001',
    'kerala_minister_01',
    'Kerala Revenue Minister',
    'minister@kerala.gov.in',
    'Revenue Department',
    'Kerala',
    'e0000001-0000-0000-0000-000000000012',
    '$2b$10$NaMsGkWQ45yusXeZKUfqa.1mhPxiUzFyHFrB3VmBt751cPxdu.nf6',
    'ACTIVE'
) ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    state = VALUES(state),
    state_id = VALUES(state_id),
    password_hash = VALUES(password_hash),
    status = VALUES(status);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 'usr-minister-kl', id FROM roles WHERE role_name = 'MINISTER';

-- Demo Kerala Officer (District: Kochi)
INSERT INTO users (id, external_reference, username, name, email, department, state, state_id, district, password_hash, status)
VALUES (
    'usr-officer-kl',
    'OFFICER-KL-001',
    'officer_kochi_01',
    'Kochi Revenue Officer',
    'officer.kochi@kerala.gov.in',
    'Land Records',
    'Kerala',
    'e0000001-0000-0000-0000-000000000012',
    'Kochi',
    '$2b$10$9s8n0u6Zjn0ryxRDLw3YY./8l9Ar5rktVcig8UTCaHsl0mdqw44SG',
    'ACTIVE'
) ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    state = VALUES(state),
    state_id = VALUES(state_id),
    district = VALUES(district),
    password_hash = VALUES(password_hash),
    status = VALUES(status);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 'usr-officer-kl', id FROM roles WHERE role_name = 'OFFICER';
