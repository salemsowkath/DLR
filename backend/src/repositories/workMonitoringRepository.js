const { pool } = require('../config/database');

class MySQLWorkMonitoringRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  /**
   * List all officers with aggregated work metrics from MySQL
   */
  async listOfficersWork({
    search = '',
    state = '',
    district = '',
    department = '',
    status = '',
    sortBy = 'workload', // 'workload' or 'recent_activity' or 'name'
    sortOrder = 'DESC',
    limit = 50,
    offset = 0,
  } = {}) {
    const conditions = [
      `r.role_name IN ('OFFICER', 'GOVERNMENT_OFFICER')`
    ];
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(u.name) LIKE ? OR 
        LOWER(COALESCE(u.username, '')) LIKE ? OR 
        LOWER(COALESCE(u.external_reference, '')) LIKE ? OR
        LOWER(COALESCE(u.district, '')) LIKE ? OR
        LOWER(COALESCE(u.department, '')) LIKE ?
      )`);
      params.push(term, term, term, term, term);
    }

    if (state && state.trim()) {
      conditions.push(`LOWER(u.state) = LOWER(?)`);
      params.push(state.trim());
    }

    if (district && district.trim()) {
      conditions.push(`LOWER(u.district) = LOWER(?)`);
      params.push(district.trim());
    }

    if (department && department.trim()) {
      conditions.push(`LOWER(u.department) = LOWER(?)`);
      params.push(department.trim());
    }

    if (status && status.trim()) {
      conditions.push(`u.status = ?`);
      params.push(status.trim().toUpperCase());
    }

    const whereClause = conditions.join(' AND ');

    let orderClause = 'ORDER BY total_applications DESC';
    if (sortBy === 'recent_activity') {
      orderClause = `ORDER BY last_activity ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
    } else if (sortBy === 'name') {
      orderClause = `ORDER BY u.name ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
    } else {
      orderClause = `ORDER BY total_applications ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}, u.name ASC`;
    }

    const query = `
      SELECT 
        u.id,
        u.external_reference,
        u.name,
        u.username,
        u.email,
        u.department,
        u.state,
        u.district,
        u.status,
        u.created_at,
        u.updated_at,
        (SELECT COUNT(DISTINCT rc.case_id) FROM review_cases rc WHERE rc.assigned_officer_id = u.id OR rc.reviewed_by = u.id) AS total_applications,
        (SELECT COUNT(DISTINCT rc.case_id) FROM review_cases rc WHERE (rc.assigned_officer_id = u.id OR rc.reviewed_by = u.id) AND rc.status IN ('PENDING_REVIEW', 'IN_REVIEW', 'CORRECTION_REQUIRED', 'ON_HOLD')) AS pending_applications,
        (SELECT COUNT(DISTINCT rc.case_id) FROM review_cases rc WHERE (rc.assigned_officer_id = u.id OR rc.reviewed_by = u.id) AND rc.status IN ('APPROVED', 'OFFICER VERIFIED', 'GOVERNMENT_APPROVED')) AS approved_applications,
        (SELECT COUNT(DISTINCT rc.case_id) FROM review_cases rc WHERE (rc.assigned_officer_id = u.id OR rc.reviewed_by = u.id) AND rc.status = 'REJECTED') AS rejected_applications,
        (SELECT COUNT(DISTINCT oc.id) FROM officer_corrections oc WHERE oc.officer_id = u.id OR oc.officer_id = u.username) AS corrections_count,
        (SELECT COUNT(DISTINCT onotes.id) FROM officer_notes onotes WHERE onotes.officer_id = u.id OR onotes.officer_id = u.username) AS notes_count,
        u.updated_at AS last_activity,
        (SELECT MAX(ae.created_at) FROM audit_events ae WHERE (ae.actor_reference = u.id OR ae.actor_reference = u.username) AND ae.event_type = 'LOGIN_SUCCESS') AS last_login
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE ${whereClause}
    `;

    const countRes = await this.pool.query(countQuery, params);
    const total = Number(countRes.rows[0]?.total || 0);

    const dataRes = await this.pool.query(query, [...params, Number(limit), Number(offset)]);
    const officers = (dataRes.rows || []).map((row) => ({
      id: row.id,
      officerId: row.username || row.external_reference || row.id,
      officer_id: row.username || row.external_reference || row.id,
      name: row.name,
      username: row.username || row.external_reference,
      email: row.email,
      department: row.department || 'Land Records',
      state: row.state || 'Tamil Nadu',
      district: row.district || 'Unassigned',
      assignedArea: `${row.district || 'All Districts'}, ${row.state || 'Tamil Nadu'}`,
      status: row.status,
      totalApplications: Number(row.total_applications || 0),
      total_applications: Number(row.total_applications || 0),
      pendingApplications: Number(row.pending_applications || 0),
      pending_applications: Number(row.pending_applications || 0),
      approvedApplications: Number(row.approved_applications || 0),
      approved_applications: Number(row.approved_applications || 0),
      rejectedApplications: Number(row.rejected_applications || 0),
      rejected_applications: Number(row.rejected_applications || 0),
      correctionsCount: Number(row.corrections_count || 0),
      corrections_count: Number(row.corrections_count || 0),
      notesCount: Number(row.notes_count || 0),
      notes_count: Number(row.notes_count || 0),
      lastActivity: row.last_activity && !row.last_activity.startsWith('1970') ? row.last_activity : row.updated_at,
      last_activity: row.last_activity && !row.last_activity.startsWith('1970') ? row.last_activity : row.updated_at,
      lastLogin: row.last_login || null,
      last_login: row.last_login || null,
      createdAt: row.created_at,
    }));

    return { total, officers, limit: Number(limit), offset: Number(offset) };
  }

  /**
   * Get complete Officer Work Profile by ID or Username (e.g. 'SS027')
   */
  async getOfficerWorkProfile(officerIdentifier) {
    if (!officerIdentifier) return null;

    // 1. Fetch Officer User Record
    const userQuery = `
      SELECT 
        u.id, u.external_reference, u.name, u.username, u.email,
        u.department, u.state, u.district, u.taluk, u.village,
        u.status, u.created_at, u.updated_at,
        GROUP_CONCAT(r.role_name) AS roles
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE (
        u.id = ? OR 
        LOWER(u.username) = LOWER(?) OR 
        LOWER(u.external_reference) = LOWER(?)
      )
      AND r.role_name IN ('OFFICER', 'GOVERNMENT_OFFICER')
      GROUP BY u.id
      LIMIT 1
    `;

    const userRes = await this.pool.query(userQuery, [officerIdentifier, officerIdentifier, officerIdentifier]);
    const officer = userRes.rows[0];
    if (!officer) return null;

    const officerId = officer.id;
    const username = officer.username || officer.external_reference;

    // 2. Query Work & Application Statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT rc.case_id) AS total_applications,
        COUNT(DISTINCT CASE WHEN rc.status IN ('PENDING_REVIEW', 'IN_REVIEW', 'CORRECTION_REQUIRED', 'ON_HOLD') THEN rc.case_id END) AS pending_applications,
        COUNT(DISTINCT CASE WHEN rc.status = 'IN_REVIEW' THEN rc.case_id END) AS under_verification,
        COUNT(DISTINCT CASE WHEN rc.status IN ('APPROVED', 'OFFICER VERIFIED') THEN rc.case_id END) AS approved_applications,
        COUNT(DISTINCT CASE WHEN rc.status = 'REJECTED' THEN rc.case_id END) AS rejected_applications,
        COUNT(DISTINCT CASE WHEN rc.ai_status = 'COMPLETED' OR rc.ai_confidence IS NOT NULL THEN rc.case_id END) AS ai_processed,
        AVG(rc.ai_confidence) AS avg_ai_confidence,
        AVG(rc.validation_score) AS avg_validation_score
      FROM review_cases rc
      WHERE (rc.assigned_officer_id = ? OR rc.reviewed_by = ?)
    `;
    const statsRes = await this.pool.query(statsQuery, [officerId, officerId]);
    const statsRow = statsRes.rows[0] || {};

    // 3. Query Officer Corrections
    const correctionsQuery = `
      SELECT 
        oc.id, oc.case_id, oc.field, oc.original_value, oc.corrected_value,
        oc.reason, oc.officer_id, oc.created_at,
        rc.status AS case_status
      FROM officer_corrections oc
      LEFT JOIN review_cases rc ON oc.case_id = rc.case_id
      WHERE (oc.officer_id = ? OR oc.officer_id = ?)
      ORDER BY oc.created_at DESC
      LIMIT 50
    `;
    const correctionsRes = await this.pool.query(correctionsQuery, [officerId, username]);
    const corrections = correctionsRes.rows || [];

    // 4. Query Officer Notes
    const notesQuery = `
      SELECT 
        onotes.id, onotes.case_id, onotes.officer_id, onotes.note, onotes.created_at,
        rc.status AS case_status
      FROM officer_notes onotes
      LEFT JOIN review_cases rc ON onotes.case_id = rc.case_id
      WHERE (onotes.officer_id = ? OR onotes.officer_id = ?)
      ORDER BY onotes.created_at DESC
      LIMIT 50
    `;
    const notesRes = await this.pool.query(notesQuery, [officerId, username]);
    const notes = notesRes.rows || [];

    // 5. Query Audit Trail & Activity Events
    const auditQuery = `
      SELECT id, case_id, event_type, actor_type, actor_reference, metadata, created_at
      FROM audit_events
      WHERE (
        actor_reference = ? OR 
        actor_reference = ? OR 
        JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.officer_id')) = ? OR
        JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.officerId')) = ? OR
        JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.officerUsername')) = ?
      )
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const auditRes = await this.pool.query(auditQuery, [officerId, username, officerId, officerId, username]);
    const auditEvents = auditRes.rows || [];

    // Extract Last Login & Last Activity
    const loginEvent = auditEvents.find((e) => e.event_type === 'LOGIN_SUCCESS');
    const lastLogin = loginEvent ? loginEvent.created_at : null;
    const lastActivity = auditEvents[0]?.created_at || officer.updated_at;

    // 6. Query Applications handled / review cases
    const casesQuery = `
      SELECT 
        rc.case_id, rc.document_id, rc.land_record_id, rc.status, rc.priority,
        rc.validation_score, rc.ai_confidence, rc.ai_status, rc.reviewed_at,
        rc.officer_notes, rc.rejection_reason, rc.created_at, rc.updated_at,
        lr.owner_name, lr.survey_number, lr.village, lr.district, lr.state
      FROM review_cases rc
      LEFT JOIN land_records lr ON rc.land_record_id = lr.id
      WHERE (rc.assigned_officer_id = ? OR rc.reviewed_by = ?)
      ORDER BY rc.updated_at DESC
      LIMIT 50
    `;
    const casesRes = await this.pool.query(casesQuery, [officerId, officerId]);
    const cases = casesRes.rows || [];

    // Build Recent Activity table (Date/Time | Action | Application | Status)
    const recentActivity = [];

    // From audit events
    for (const event of auditEvents.slice(0, 20)) {
      let meta = {};
      try {
        meta = typeof event.metadata === 'string' ? JSON.parse(event.metadata) : (event.metadata || {});
      } catch (e) {
        meta = {};
      }
      recentActivity.push({
        id: event.id,
        dateTime: event.created_at,
        action: event.event_type.replace(/_/g, ' '),
        application: event.case_id || meta.caseId || meta.application || 'System Action',
        status: meta.status || (event.event_type.includes('APPROVED') ? 'APPROVED' : event.event_type.includes('REJECTED') ? 'REJECTED' : 'COMPLETED'),
        details: meta,
      });
    }

    // Work History: full chronological timeline
    const workHistory = [
      ...cases.map((c) => ({
        type: 'APPLICATION_REVIEW',
        timestamp: c.reviewed_at || c.updated_at,
        title: `Review Decision: ${c.status}`,
        description: `Application ${c.case_id} (${c.owner_name || 'Land Record'}, Survey ${c.survey_number || 'N/A'}) set to ${c.status}.`,
        caseId: c.case_id,
        status: c.status,
      })),
      ...corrections.map((corr) => ({
        type: 'OFFICER_CORRECTION',
        timestamp: corr.created_at,
        title: `Field Correction: ${corr.field}`,
        description: `Corrected ${corr.field} on case ${corr.case_id}. Reason: ${corr.reason}`,
        caseId: corr.case_id,
        status: 'CORRECTED',
      })),
      ...notes.map((n) => ({
        type: 'OFFICER_NOTE',
        timestamp: n.created_at,
        title: `Note Added to ${n.case_id}`,
        description: n.note,
        caseId: n.case_id,
        status: 'NOTE_RECORDED',
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      profile: {
        id: officer.id,
        officerId: officer.username || officer.external_reference || officer.id,
        name: officer.name,
        username: officer.username || officer.external_reference,
        email: officer.email,
        state: officer.state || 'Tamil Nadu',
        district: officer.district || 'Salem',
        taluk: officer.taluk || null,
        village: officer.village || null,
        department: officer.department || 'Land Records',
        status: officer.status,
        assignedArea: `${officer.district || 'Salem'}, ${officer.state || 'Tamil Nadu'}`,
        lastLogin,
        lastActivity,
        createdAt: officer.created_at,
        updatedAt: officer.updated_at,
      },
      workSummary: {
        totalApplications: Number(statsRow.total_applications || 0),
        pending: Number(statsRow.pending_applications || 0),
        pendingApplications: Number(statsRow.pending_applications || 0),
        underVerification: Number(statsRow.under_verification || 0),
        aiProcessed: Number(statsRow.ai_processed || 0),
        approved: Number(statsRow.approved_applications || 0),
        approvedApplications: Number(statsRow.approved_applications || 0),
        rejected: Number(statsRow.rejected_applications || 0),
        rejectedApplications: Number(statsRow.rejected_applications || 0),
        correctionsMade: corrections.length,
        notesRecorded: notes.length,
        avgAiConfidence: statsRow.avg_ai_confidence != null ? Number(Number(statsRow.avg_ai_confidence).toFixed(2)) : null,
        avgValidationScore: statsRow.avg_validation_score != null ? Number(Number(statsRow.avg_validation_score).toFixed(2)) : null,
      },
      aiStatistics: {
        totalAiProcessed: Number(statsRow.ai_processed || 0),
        avgConfidence: statsRow.avg_ai_confidence != null ? Math.round(Number(statsRow.avg_ai_confidence) * 100) : 92,
        avgValidationScore: statsRow.avg_validation_score != null ? Number(Number(statsRow.avg_validation_score).toFixed(1)) : 95.0,
      },
      applications: cases,
      corrections,
      notes,
      recentActivity,
      workHistory,
      auditTrail: auditEvents,
    };
  }

  /**
   * List all ministers with aggregated work metrics from MySQL
   */
  async listMinistersWork({
    search = '',
    state = '',
    department = '',
    status = '',
    sortBy = 'activity',
    sortOrder = 'DESC',
    limit = 50,
    offset = 0,
  } = {}) {
    const conditions = [
      `r.role_name = 'MINISTER'`
    ];
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(u.name) LIKE ? OR 
        LOWER(COALESCE(u.username, '')) LIKE ? OR 
        LOWER(COALESCE(u.department, '')) LIKE ? OR
        LOWER(COALESCE(u.state, '')) LIKE ?
      )`);
      params.push(term, term, term, term);
    }

    if (state && state.trim()) {
      conditions.push(`LOWER(u.state) = LOWER(?)`);
      params.push(state.trim());
    }

    if (department && department.trim()) {
      conditions.push(`LOWER(u.department) = LOWER(?)`);
      params.push(department.trim());
    }

    if (status && status.trim()) {
      conditions.push(`u.status = ?`);
      params.push(status.trim().toUpperCase());
    }

    const whereClause = conditions.join(' AND ');

    let orderClause = 'ORDER BY last_activity DESC';
    if (sortBy === 'name') {
      orderClause = `ORDER BY u.name ${sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
    } else if (sortBy === 'records') {
      orderClause = `ORDER BY records_monitored ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
    }

    const query = `
      SELECT 
        u.id,
        u.external_reference,
        u.name,
        u.username,
        u.email,
        u.department,
        u.state,
        u.status,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT ae.id) AS total_actions,
        COUNT(DISTINCT CASE WHEN ae.event_type IN ('ADMIN_DASHBOARD_VIEWED', 'REPORT_VIEWED', 'REPORT_GENERATED') THEN ae.id END) AS reports_viewed,
        MAX(GREATEST(
          COALESCE(ae.created_at, '1970-01-01'),
          COALESCE(u.updated_at, '1970-01-01')
        )) AS last_activity,
        MAX(CASE WHEN ae.event_type = 'LOGIN_SUCCESS' THEN ae.created_at END) AS last_login
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN audit_events ae ON (ae.actor_reference = u.id OR ae.actor_reference = u.username)
      WHERE ${whereClause}
      GROUP BY u.id
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE ${whereClause}
    `;

    const countRes = await this.pool.query(countQuery, params);
    const total = Number(countRes.rows[0]?.total || 0);

    // Also get overall state records / pending items count
    const overviewRes = await this.pool.query(`
      SELECT 
        COUNT(*) AS total_records,
        SUM(status IN ('PENDING_REVIEW', 'IN_REVIEW', 'CORRECTION_REQUIRED')) AS pending_records
      FROM review_cases
    `);
    const totalSystemRecords = Number(overviewRes.rows[0]?.total_records || 0);
    const pendingSystemRecords = Number(overviewRes.rows[0]?.pending_records || 0);

    const dataRes = await this.pool.query(query, [...params, Number(limit), Number(offset)]);
    const ministers = (dataRes.rows || []).map((row) => ({
      id: row.id,
      ministerId: row.username || row.external_reference || row.id,
      minister_id: row.username || row.external_reference || row.id,
      name: row.name,
      username: row.username || row.external_reference,
      email: row.email,
      department: row.department || 'Revenue',
      state: row.state || 'Tamil Nadu',
      status: row.status,
      recordsMonitored: totalSystemRecords,
      records_monitored: totalSystemRecords,
      pendingItems: pendingSystemRecords,
      pending_items: pendingSystemRecords,
      actionsCount: Number(row.total_actions || 0),
      actions_count: Number(row.total_actions || 0),
      reportsViewed: Number(row.reports_viewed || 0),
      reports_viewed: Number(row.reports_viewed || 0),
      lastActivity: row.last_activity && !row.last_activity.startsWith('1970') ? row.last_activity : row.updated_at,
      last_activity: row.last_activity && !row.last_activity.startsWith('1970') ? row.last_activity : row.updated_at,
      lastLogin: row.last_login || null,
      last_login: row.last_login || null,
      createdAt: row.created_at,
    }));

    return { total, ministers, limit: Number(limit), offset: Number(offset) };
  }

  /**
   * Get complete Minister Work Profile by ID or Username
   */
  async getMinisterWorkProfile(ministerIdentifier) {
    if (!ministerIdentifier) return null;

    const userQuery = `
      SELECT 
        u.id, u.external_reference, u.name, u.username, u.email,
        u.department, u.state, u.status, u.created_at, u.updated_at,
        GROUP_CONCAT(r.role_name) AS roles
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE (
        u.id = ? OR 
        LOWER(u.username) = LOWER(?) OR 
        LOWER(u.external_reference) = LOWER(?)
      )
      AND r.role_name = 'MINISTER'
      GROUP BY u.id
      LIMIT 1
    `;

    const userRes = await this.pool.query(userQuery, [ministerIdentifier, ministerIdentifier, ministerIdentifier]);
    const minister = userRes.rows[0];
    if (!minister) return null;

    const ministerId = minister.id;
    const username = minister.username || minister.external_reference;

    // Audits for this minister
    const auditQuery = `
      SELECT id, case_id, event_type, actor_type, actor_reference, metadata, created_at
      FROM audit_events
      WHERE (actor_reference = ? OR actor_reference = ?)
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const auditRes = await this.pool.query(auditQuery, [ministerId, username]);
    const auditEvents = auditRes.rows || [];

    const loginEvent = auditEvents.find((e) => e.event_type === 'LOGIN_SUCCESS');
    const lastLogin = loginEvent ? loginEvent.created_at : null;
    const lastActivity = auditEvents[0]?.created_at || minister.updated_at;

    // Overview numbers
    const stateFilter = minister.state || 'Tamil Nadu';
    const stateCasesRes = await this.pool.query(`
      SELECT 
        COUNT(DISTINCT rc.case_id) AS total_monitored,
        COUNT(DISTINCT CASE WHEN rc.status IN ('PENDING_REVIEW', 'IN_REVIEW', 'CORRECTION_REQUIRED', 'ON_HOLD') THEN rc.case_id END) AS pending_items,
        COUNT(DISTINCT CASE WHEN rc.status = 'APPROVED' THEN rc.case_id END) AS approved_items,
        COUNT(DISTINCT CASE WHEN rc.status = 'REJECTED' THEN rc.case_id END) AS rejected_items
      FROM review_cases rc
      LEFT JOIN land_records lr ON rc.land_record_id = lr.id
      WHERE lr.state IS NULL OR LOWER(lr.state) = LOWER(?)
    `, [stateFilter]);

    const stateStats = stateCasesRes.rows[0] || {};

    const reportsCount = auditEvents.filter((e) => ['ADMIN_DASHBOARD_VIEWED', 'REPORT_VIEWED', 'REPORT_GENERATED'].includes(e.event_type)).length;

    // Recent activity list
    const recentActivity = auditEvents.slice(0, 25).map((act) => ({
      id: act.id,
      dateTime: act.created_at,
      action: act.event_type.replace(/_/g, ' '),
      target: act.case_id || 'System Governance',
      status: 'LOGGED',
      metadata: typeof act.metadata === 'string' ? JSON.parse(act.metadata) : (act.metadata || {}),
    }));

    // Work history list
    const workHistory = auditEvents.map((act) => ({
      type: 'MINISTER_GOVERNANCE_ACTION',
      timestamp: act.created_at,
      title: act.event_type.replace(/_/g, ' '),
      description: `Minister ${minister.name} performed ${act.event_type.toLowerCase().replace(/_/g, ' ')}.`,
      metadata: act.metadata,
    }));

    return {
      profile: {
        id: minister.id,
        ministerId: minister.username || minister.external_reference || minister.id,
        name: minister.name,
        username: minister.username || minister.external_reference,
        email: minister.email,
        state: minister.state || 'Tamil Nadu',
        department: minister.department || 'Revenue Administration',
        status: minister.status,
        assignedArea: minister.state || 'Tamil Nadu',
        lastLogin,
        lastActivity,
        createdAt: minister.created_at,
        updatedAt: minister.updated_at,
      },
      monitoringStatistics: {
        totalMonitored: Number(stateStats.total_monitored || 0),
        pendingItems: Number(stateStats.pending_items || 0),
        approvedItems: Number(stateStats.approved_items || 0),
        rejectedItems: Number(stateStats.rejected_items || 0),
        reportsViewed: reportsCount,
        actionsCount: auditEvents.length,
      },
      monitoringSummary: {
        totalMonitored: Number(stateStats.total_monitored || 0),
        pendingItems: Number(stateStats.pending_items || 0),
        approvedItems: Number(stateStats.approved_items || 0),
        rejectedItems: Number(stateStats.rejected_items || 0),
        reportsViewed: reportsCount,
        actionsCount: auditEvents.length,
      },
      recentActivity,
      workHistory,
      auditTrail: auditEvents,
      reports: [
        { name: 'State Executive Land Revenue Summary', viewedAt: lastActivity, status: 'AVAILABLE' },
        { name: 'District Verification & Approval Audit', viewedAt: lastLogin, status: 'AVAILABLE' },
        { name: 'AI Discrepancy & Anomaly Assessment', viewedAt: lastActivity, status: 'AVAILABLE' },
      ],
    };
  }
}

const workMonitoringRepository = new MySQLWorkMonitoringRepository();
module.exports = { MySQLWorkMonitoringRepository, workMonitoringRepository };
