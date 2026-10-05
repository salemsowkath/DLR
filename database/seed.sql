BEGIN;

INSERT INTO roles (role_name, description)
VALUES 
    ('CITIZEN', 'Citizen role for document submission and status tracking.'),
    ('OFFICER', 'Land Revenue Officer role for verification and corrections.'),
    ('GOVERNMENT_OFFICER', 'Legacy alias for land officer role.'),
    ('MINISTER', 'Minister / Executive Admin role for high-level monitoring.'),
    ('ADMIN', 'System Administrator role for full administrative control.')
ON CONFLICT (role_name) DO NOTHING;

-- Demo Officer password hash for 'OfficerPass123!' (bcrypt cost 10)
INSERT INTO users (external_reference, name, password_hash, status)
VALUES ('DEMO-OFFICER-001', 'Demo Officer', '$2a$10$wN9a/sA2.6pE9qB7dGzP8.XkZ4B4M3.qG8zN7yX9wP5kL1vJ3bQ2a', 'ACTIVE')
ON CONFLICT (external_reference) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Demo Minister password hash for 'MinisterPass123!' (bcrypt cost 10)
INSERT INTO users (external_reference, name, password_hash, status)
VALUES ('DEMO-MINISTER-001', 'Demo Minister', '$2a$10$wN9a/sA2.6pE9qB7dGzP8.XkZ4B4M3.qG8zN7yX9wP5kL1vJ3bQ2a', 'ACTIVE')
ON CONFLICT (external_reference) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Demo Citizen
INSERT INTO users (external_reference, name, status)
VALUES ('DEMO-CITIZEN-001', 'Demo Citizen', 'ACTIVE')
ON CONFLICT (external_reference) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
JOIN roles ON roles.role_name IN ('OFFICER', 'GOVERNMENT_OFFICER')
WHERE users.external_reference = 'DEMO-OFFICER-001'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
JOIN roles ON roles.role_name IN ('MINISTER', 'ADMIN')
WHERE users.external_reference = 'DEMO-MINISTER-001'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
JOIN roles ON roles.role_name = 'CITIZEN'
WHERE users.external_reference = 'DEMO-CITIZEN-001'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO land_records (
    record_reference, owner_name, survey_number, area_value, area_unit,
    village, taluk, district, classification, status
)
VALUES (
    'DEMO-RECORD-125-3A', 'TEST_OWNER_NAME', '125/3A', 2.5, 'acre',
    'Salem', 'Salem', 'Salem', 'Agricultural', 'ACTIVE'
)
ON CONFLICT (record_reference) DO NOTHING;

INSERT INTO land_record_fields (land_record_id, field_name, field_value, confidence, source)
SELECT id, 'survey_number', '{"value":"125/3A"}'::jsonb, 0.98, 'SYNTHETIC_DEMO'
FROM land_records
WHERE record_reference = 'DEMO-RECORD-125-3A'
AND NOT EXISTS (
    SELECT 1 FROM land_record_fields fields
    WHERE fields.land_record_id = land_records.id AND fields.field_name = 'survey_number'
);

COMMIT;
