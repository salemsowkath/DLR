USE dlr_database;

INSERT INTO roles (id, role_name, description) VALUES
    (UUID(), 'CITIZEN', 'Citizen role for document submission and status tracking.'),
    (UUID(), 'OFFICER', 'Land Revenue Officer role for verification and corrections.'),
    (UUID(), 'GOVERNMENT_OFFICER', 'Legacy alias for land officer role.'),
    (UUID(), 'MINISTER', 'Minister / Executive Admin role for high-level monitoring.'),
    (UUID(), 'SUPER_ADMIN', 'Super Administrator role for complete system management and control.'),
    (UUID(), 'ADMIN', 'System Administrator role for full administrative control.')
ON DUPLICATE KEY UPDATE
    description = VALUES(description);

-- Demo Super Admin User
INSERT INTO users (id, external_reference, username, name, email, department, password_hash, status)
VALUES (
    'usr-superadmin-001',
    'SUPER-ADMIN-001',
    'Dora027',
    'Super Administrator',
    'superadmin@dlr.gov.in',
    'System Administration',
    '$2b$10$ZXl406Bz0y//82/RXZmFC.tS4yelR1sl3.Od9Qvke5YRP6EsG/KPC',
    'ACTIVE'
)
ON DUPLICATE KEY UPDATE
    username = VALUES(username),
    name = VALUES(name),
    email = VALUES(email),
    password_hash = VALUES(password_hash),
    status = VALUES(status);

-- Link Super Admin Role
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 'usr-superadmin-001', id FROM roles WHERE role_name = 'SUPER_ADMIN';

-- Demo Officer User
INSERT INTO users (id, external_reference, username, name, email, state, district, department, password_hash, status)
VALUES (
    'usr-officer-001',
    'DEMO-OFFICER-001',
    'DEMO-OFFICER-001',
    'Demo Officer',
    'officer@dlr.gov.in',
    'Tamil Nadu',
    'Salem',
    'Land Records',
    '$2b$10$ikRLDpAbY2HA6xnvz7bgu.hUVnoYQ.h8bF076HRHQrDnYA7oG.4yq',
    'ACTIVE'
)
ON DUPLICATE KEY UPDATE
    username = VALUES(username),
    password_hash = VALUES(password_hash),
    status = VALUES(status);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 'usr-officer-001', id FROM roles WHERE role_name IN ('OFFICER', 'GOVERNMENT_OFFICER');

-- Demo Minister User
INSERT INTO users (id, external_reference, username, name, email, state, department, password_hash, status)
VALUES (
    'usr-minister-001',
    'DEMO-MINISTER-001',
    'DEMO-MINISTER-001',
    'Demo Minister',
    'minister@dlr.gov.in',
    'Tamil Nadu',
    'Revenue',
    '$2b$10$lkQAJuq/U/6M0/QTG0FxmeOhdOWQ1tbiDwA/mbRwDgFkeGaIHZSFS',
    'ACTIVE'
)
ON DUPLICATE KEY UPDATE
    username = VALUES(username),
    password_hash = VALUES(password_hash),
    status = VALUES(status);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 'usr-minister-001', id FROM roles WHERE role_name = 'MINISTER';

-- Demo Admin User
INSERT INTO users (id, external_reference, username, name, email, department, password_hash, status)
VALUES (
    'usr-admin-001',
    'DEMO-ADMIN-001',
    'DEMO-ADMIN-001',
    'Demo Admin',
    'admin@dlr.gov.in',
    'Revenue Administration',
    '$2b$10$wNrk9Wq7l3G3g4bZ9fO7UeZ9vLzT3I3w9UoN2P9z.3F7T5N1X8e2C',
    'ACTIVE'
)
ON DUPLICATE KEY UPDATE
    username = VALUES(username),
    password_hash = VALUES(password_hash),
    status = VALUES(status);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 'usr-admin-001', id FROM roles WHERE role_name = 'ADMIN';

-- Demo Citizen User
INSERT INTO users (id, external_reference, username, name, status)
VALUES (
    'usr-citizen-001',
    'DEMO-CITIZEN-001',
    'DEMO-CITIZEN-001',
    'Demo Citizen',
    'ACTIVE'
)
ON DUPLICATE KEY UPDATE
    status = VALUES(status);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 'usr-citizen-001', id FROM roles WHERE role_name = 'CITIZEN';

-- Pre-seeded Citizen for OTP testing (Aadhaar 999988881234)
INSERT INTO users (id, external_reference, username, name, date_of_birth, gender, state, district, taluk, village, pincode, status)
VALUES (
    'usr-aadhaar-1234',
    'AADHAAR-XXXX-XXXX-1234',
    'AADHAAR-XXXX-XXXX-1234',
    'Registered Citizen 1234',
    '1992-08-20',
    'Male',
    'Tamil Nadu',
    'Salem',
    'Salem',
    'Salem Central',
    '636001',
    'ACTIVE'
)
ON DUPLICATE KEY UPDATE
    status = VALUES(status);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT 'usr-aadhaar-1234', id FROM roles WHERE role_name = 'CITIZEN';

INSERT INTO identity_verifications (user_id, identity_type, masked_reference, verification_status, verified_at)
VALUES (
    'usr-aadhaar-1234',
    'AADHAAR',
    'XXXX-XXXX-1234',
    'VERIFIED',
    NOW()
)
ON DUPLICATE KEY UPDATE
    verification_status = 'VERIFIED';

-- Demo Document for Testing
INSERT INTO documents (
    document_id, created_by_user_id, document_type, original_filename, stored_filename,
    mime_type, file_size, storage_reference, processing_status, created_at, updated_at
) VALUES (
    'DOC-DEMO-001', 'usr-aadhaar-1234', 'DEED', 'demo-deed.pdf', 'demo-deed.pdf',
    'application/pdf', 1024, 'uploads/demo-deed.pdf', 'PENDING_REVIEW', NOW(), NOW()
) ON DUPLICATE KEY UPDATE
    processing_status = VALUES(processing_status);

-- Demo Review Case for Testing
INSERT INTO review_cases (
    case_id, document_id, status, priority, validation_score, review_required,
    case_data, created_at, updated_at
) VALUES (
    'CASE-TEST-001', 'DOC-DEMO-001', 'PENDING_REVIEW', 'MEDIUM', 95.00, 1,
    '{}', NOW(), NOW()
) ON DUPLICATE KEY UPDATE
    status = VALUES(status);


