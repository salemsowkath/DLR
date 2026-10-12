const crypto = require('crypto');
const { pool } = require('../config/database');

async function seedOfficerWork() {
  console.log('Seeding realistic work data for Officer SS027 and monitoring...');

  // 1. Get Officer SS027
  const officerRes = await pool.query(`
    SELECT id, username, name, state, district, department
    FROM users
    WHERE LOWER(username) = 'ss027' OR LOWER(external_reference) = 'user-ss027'
    LIMIT 1
  `);

  if (!officerRes.rows.length) {
    console.log('Officer SS027 not found. Creating officer SS027...');
    await pool.query(`
      INSERT INTO users (id, external_reference, username, name, email, department, state, district, status)
      VALUES (
        'fa5a539a-ec4c-4a17-b884-59c9a8ef35f5',
        'USER-ss027',
        'SS027',
        'Salem Sowkath',
        'ss027@dlr.tn.gov.in',
        'Land Records',
        'Tamil Nadu',
        'Salem',
        'ACTIVE'
      )
      ON DUPLICATE KEY UPDATE
        username = 'SS027',
        state = 'Tamil Nadu',
        district = 'Salem',
        department = 'Land Records',
        status = 'ACTIVE'
    `);
    await pool.query(`
      INSERT IGNORE INTO user_roles (user_id, role_id)
      SELECT 'fa5a539a-ec4c-4a17-b884-59c9a8ef35f5', id FROM roles WHERE role_name = 'OFFICER'
    `);
  }

  const officer = (await pool.query("SELECT id, username FROM users WHERE LOWER(username) = 'ss027' LIMIT 1")).rows[0];
  const officerId = officer.id;
  const username = officer.username;

  // Update district & state to proper casing if needed
  await pool.query(`
    UPDATE users 
    SET state = 'Tamil Nadu', district = 'Salem', department = 'Land Records'
    WHERE id = ?
  `, [officerId]);

  // Also ensure a citizen user exists to attach documents to
  const citizenRes = await pool.query("SELECT id FROM users WHERE status = 'ACTIVE' LIMIT 1");
  const citizenId = citizenRes.rows[0]?.id || officerId;

  // Cases to seed
  const casesData = [
    {
      caseId: 'APP-SLM-2026-001',
      docId: 'DOC-SLM-001',
      recordId: 'LR-SLM-001',
      ownerName: 'Muthukumar S',
      surveyNumber: '142/2A',
      village: 'Kandhampatti',
      taluk: 'Salem South',
      district: 'Salem',
      state: 'Tamil Nadu',
      status: 'APPROVED',
      priority: 'HIGH',
      score: 96.5,
      aiConfidence: 0.96,
      aiStatus: 'COMPLETED',
      officerNotes: 'Boundary coordinates and patta title verified against revenue survey map.',
      reviewedAt: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 19).replace('T', ' '),
      correction: {
        field: 'area_value',
        originalValue: '2.40',
        correctedValue: '2.45',
        reason: 'Corrected as per field survey measurement FMB sketch',
      },
      note: 'Field inspection completed with village administrative officer (VAO).',
    },
    {
      caseId: 'APP-SLM-2026-002',
      docId: 'DOC-SLM-002',
      recordId: 'LR-SLM-002',
      ownerName: 'Lakshmi Narayanan',
      surveyNumber: '88/4B',
      village: 'Suramangalam',
      taluk: 'Salem West',
      district: 'Salem',
      state: 'Tamil Nadu',
      status: 'APPROVED',
      priority: 'MEDIUM',
      score: 98.0,
      aiConfidence: 0.98,
      aiStatus: 'COMPLETED',
      officerNotes: 'All documents in order. Verified ownership deeds and tax receipts.',
      reviewedAt: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 19).replace('T', ' '),
      correction: null,
      note: 'Verified online revenue database cross-check.',
    },
    {
      caseId: 'APP-SLM-2026-003',
      docId: 'DOC-SLM-003',
      recordId: 'LR-SLM-003',
      ownerName: 'Praveen Chandran',
      surveyNumber: '204/1C',
      village: 'Narasingapuram',
      taluk: 'Attur',
      district: 'Salem',
      state: 'Tamil Nadu',
      status: 'REJECTED',
      priority: 'HIGH',
      score: 72.0,
      aiConfidence: 0.88,
      aiStatus: 'COMPLETED',
      officerNotes: 'Mismatch in survey subdivision area. Prior encumbrance certificate required.',
      rejectionReason: 'Mismatch in survey subdivision area. Prior encumbrance certificate required.',
      reviewedAt: new Date(Date.now() - 12 * 3600000).toISOString().slice(0, 19).replace('T', ' '),
      correction: null,
      note: 'Citizen contacted regarding missing prior deed.',
    },
    {
      caseId: 'APP-SLM-2026-004',
      docId: 'DOC-SLM-004',
      recordId: 'LR-SLM-004',
      ownerName: 'Senthil Kumar',
      surveyNumber: '310/5A',
      village: 'Omalur Town',
      taluk: 'Omalur',
      district: 'Salem',
      state: 'Tamil Nadu',
      status: 'IN_REVIEW',
      priority: 'MEDIUM',
      score: 88.5,
      aiConfidence: 0.92,
      aiStatus: 'COMPLETED',
      officerNotes: 'Under verification with local revenue inspector.',
      reviewedAt: null,
      correction: {
        field: 'owner_name',
        originalValue: 'S. Kumar',
        correctedValue: 'Senthil Kumar',
        reason: 'Full expansion verified from Aadhaar identity record',
      },
      note: 'Waiting for subdivision clearance from taluk survey team.',
    },
    {
      caseId: 'APP-SLM-2026-005',
      docId: 'DOC-SLM-005',
      recordId: 'LR-SLM-005',
      ownerName: 'Venkatesan R',
      surveyNumber: '177/3D',
      village: 'Mecheri',
      taluk: 'Mettur',
      district: 'Salem',
      state: 'Tamil Nadu',
      status: 'PENDING_REVIEW',
      priority: 'LOW',
      score: 94.0,
      aiConfidence: 0.94,
      aiStatus: 'COMPLETED',
      officerNotes: null,
      reviewedAt: null,
      correction: null,
      note: null,
    },
  ];

  for (const item of casesData) {
    // 1. Land Record
    await pool.query(`
      INSERT INTO land_records (
        id, record_reference, owner_name, survey_number, village, taluk, district, state,
        area_value, area_unit, classification, status, verification_status, verified_by,
        verified_at, ocr_confidence, ai_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2.50, 'Acres', 'Dry Land (Punjai)', ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        owner_name = VALUES(owner_name),
        survey_number = VALUES(survey_number),
        status = VALUES(status),
        verification_status = VALUES(verification_status),
        verified_by = VALUES(verified_by),
        verified_at = VALUES(verified_at)
    `, [
      item.recordId,
      `REC-${item.surveyNumber.replace('/', '-')}`,
      item.ownerName,
      item.surveyNumber,
      item.village,
      item.taluk,
      item.district,
      item.state,
      item.status === 'APPROVED' ? 'VERIFIED' : 'AI_GENERATED',
      item.status === 'APPROVED' ? 'OFFICER VERIFIED' : 'PENDING',
      item.status === 'APPROVED' ? username : null,
      item.reviewedAt || null,
      item.aiConfidence,
      item.aiStatus,
    ]);

    // 2. Document
    await pool.query(`
      INSERT INTO documents (
        document_id, created_by_user_id, land_record_id, document_type, original_filename,
        stored_filename, mime_type, file_size, storage_reference, processing_status, created_at, updated_at
      ) VALUES (?, ?, ?, 'PATTA', ?, ?, 'application/pdf', 1048576, ?, 'PROCESSED', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        processing_status = 'PROCESSED'
    `, [
      item.docId,
      citizenId,
      item.recordId,
      `${item.caseId}.pdf`,
      `${item.caseId}.pdf`,
      `uploads/${item.caseId}.pdf`,
    ]);

    // 3. Review Case
    await pool.query(`
      INSERT INTO review_cases (
        case_id, document_id, land_record_id, status, priority, validation_score,
        ai_confidence, ai_status, assigned_officer_id, reviewed_by, reviewed_at,
        officer_notes, rejection_reason, case_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        assigned_officer_id = VALUES(assigned_officer_id),
        reviewed_by = VALUES(reviewed_by),
        reviewed_at = VALUES(reviewed_at),
        officer_notes = VALUES(officer_notes),
        rejection_reason = VALUES(rejection_reason)
    `, [
      item.caseId,
      item.docId,
      item.recordId,
      item.status,
      item.priority,
      item.score,
      item.aiConfidence,
      item.aiStatus,
      officerId,
      item.status === 'APPROVED' || item.status === 'REJECTED' ? officerId : null,
      item.reviewedAt || null,
      item.officerNotes || null,
      item.rejectionReason || null,
    ]);

    // 4. Correction if any
    if (item.correction) {
      const corrId = `CORR-${item.caseId}`;
      await pool.query(`
        INSERT INTO officer_corrections (
          id, case_id, field, original_value, corrected_value, reason, officer_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          reason = VALUES(reason)
      `, [
        corrId,
        item.caseId,
        item.correction.field,
        JSON.stringify(item.correction.originalValue),
        JSON.stringify(item.correction.correctedValue),
        item.correction.reason,
        officerId,
      ]);
    }

    // 5. Note if any
    if (item.note) {
      const noteId = `NOTE-${item.caseId}`;
      await pool.query(`
        INSERT INTO officer_notes (
          id, case_id, officer_id, note, created_at
        ) VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          note = VALUES(note)
      `, [
        noteId,
        item.caseId,
        officerId,
        item.note,
      ]);
    }

    // 6. Audit event
    await pool.query(`
      INSERT INTO audit_events (
        id, case_id, event_type, actor_type, actor_reference, metadata, created_at
      ) VALUES (?, ?, ?, 'OFFICER', ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        event_type = VALUES(event_type)
    `, [
      `AUDIT-${item.caseId}`,
      item.caseId,
      item.status === 'APPROVED' ? 'CASE_APPROVED' : item.status === 'REJECTED' ? 'CASE_REJECTED' : 'CASE_REVIEW_STARTED',
      officerId,
      JSON.stringify({
        caseId: item.caseId,
        officerId,
        status: item.status,
        officerNotes: item.officerNotes,
      }),
    ]);
  }

  // Also log login for SS027
  await pool.query(`
    INSERT INTO audit_events (
      id, case_id, event_type, actor_type, actor_reference, metadata, created_at
    ) VALUES ('AUDIT-LOGIN-SS027', NULL, 'LOGIN_SUCCESS', 'OFFICER', ?, '{"role":"OFFICER"}', NOW())
    ON DUPLICATE KEY UPDATE
      created_at = NOW()
  `, [officerId]);

  console.log('Successfully seeded officer SS027 work profile data!');
  process.exit(0);
}

seedOfficerWork().catch((err) => {
  console.error('Failed to seed officer work:', err);
  process.exit(1);
});
