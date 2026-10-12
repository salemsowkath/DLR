ALTER TABLE land_records ADD COLUMN is_duplicate TINYINT(1) DEFAULT 0;
ALTER TABLE land_records ADD COLUMN duplicate_reason TEXT;
ALTER TABLE land_records ADD COLUMN ai_status VARCHAR(50) DEFAULT 'NOT_STARTED';
ALTER TABLE review_cases ADD COLUMN is_duplicate TINYINT(1) DEFAULT 0;
ALTER TABLE review_cases ADD COLUMN duplicate_reason TEXT;
ALTER TABLE review_cases ADD COLUMN ai_status VARCHAR(50) DEFAULT 'NOT_STARTED';
ALTER TABLE land_records ADD INDEX idx_land_records_location_survey (survey_number, village, taluk, district);
