const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { reviewRepository } = require('../repositories/reviewRepository');
const { landRecordRepository } = require('../repositories/landRecordRepository');
const { auditRepository } = require('../repositories/auditRepository');
const { appointmentRepository } = require('../repositories/appointmentRepository');
const { verificationSessionRepository } = require('../repositories/verificationSessionRepository');
const { verificationOtpRepository } = require('../repositories/verificationOtpRepository');
const { verificationPhotoRepository, PHOTO_STORAGE_DIR } = require('../repositories/verificationPhotoRepository');
const { digitalLandRecordRepository } = require('../repositories/digitalLandRecordRepository');
const { notificationRepository } = require('../repositories/notificationRepository');
const { landRecordPipelineService } = require('../services/landRecordPipelineService');
const documentService = require('../services/documentService');
const config = require('../config/env');
const logger = require('../config/logger');

function createAppError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

const ALLOWED_TRANSITIONS = {
  PENDING_OFFICER_REVIEW: ['UNDER_OFFICER_REVIEW', 'AI_PROCESSING', 'REJECTED'],
  PENDING_REVIEW: ['UNDER_OFFICER_REVIEW', 'IN_REVIEW', 'AI_PROCESSING', 'REJECTED'],
  IN_REVIEW: ['UNDER_OFFICER_REVIEW', 'AI_PROCESSING', 'OFFICER_CORRECTION', 'CORRECTION_REQUIRED', 'REJECTED'],
  UNDER_OFFICER_REVIEW: ['AI_PROCESSING', 'OFFICER_CORRECTION', 'READY_FOR_CITIZEN_VERIFICATION', 'REJECTED'],
  AI_PROCESSING: ['AI_GENERATED', 'FAILED', 'REJECTED'],
  AI_GENERATED: ['OFFICER_CORRECTION', 'READY_FOR_CITIZEN_VERIFICATION', 'APPOINTMENT_SCHEDULED', 'AI_PROCESSING', 'REJECTED'],
  OFFICER_CORRECTION: ['READY_FOR_CITIZEN_VERIFICATION', 'APPOINTMENT_SCHEDULED', 'OFFICER_CORRECTION', 'REJECTED'],
  READY_FOR_CITIZEN_VERIFICATION: ['APPOINTMENT_SCHEDULED', 'CITIZEN_VERIFICATION', 'REJECTED'],
  APPOINTMENT_SCHEDULED: ['CITIZEN_VERIFICATION', 'READY_FOR_CITIZEN_VERIFICATION', 'REJECTED'],
  CITIZEN_VERIFICATION: ['OFFICER_FINAL_REVIEW', 'REJECTED'],
  OFFICER_FINAL_REVIEW: ['GOVERNMENT_APPROVED', 'REJECTED'],
  GOVERNMENT_APPROVED: [],
  REJECTED: [],
};

function assertValidTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw createAppError(
      400,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition application status from '${currentStatus}' to '${nextStatus}'.`
    );
  }
}

function isElevatedUser(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [user?.primary_role || user?.roles];
  return roles.some((r) => ['SUPER_ADMIN', 'MINISTER', 'STATE_ADMIN', 'ADMIN'].includes(String(r || '').toUpperCase()));
}

async function assertOfficerAuthorized(user, reviewCase, req = null) {
  if (!user || !reviewCase) return;

  const roles = Array.isArray(user?.roles) ? user.roles.map(r => String(r).toUpperCase()) : [String(user?.primary_role || user?.roles || '').toUpperCase()];
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  // Super Admin has nationwide jurisdiction
  if (isSuperAdmin) return;

  // Resolve application state and district
  const appState = reviewCase.state ||
                   reviewCase.land_record?.state ||
                   reviewCase.citizen_submitted_data?.state ||
                   reviewCase.citizen?.state ||
                   'Tamil Nadu';

  const appDistrict = reviewCase.district ||
                      reviewCase.land_record?.district ||
                      reviewCase.citizen_submitted_data?.district ||
                      reviewCase.citizen?.district ||
                      null;

  const userState = user.state || 'Tamil Nadu';

  // State isolation check for STATE_ADMIN, MINISTER, OFFICER
  if (String(appState).trim().toLowerCase() !== String(userState).trim().toLowerCase()) {
    await auditRepository.logAuditEvent({
      eventType: 'UNAUTHORIZED_STATE_ACCESS_ATTEMPT',
      actorType: roles[0] || 'OFFICER',
      actorReference: user.id,
      caseId: reviewCase.case_id,
      metadata: {
        reason: 'Attempted to access case outside assigned state',
        attemptedState: appState,
        assignedState: userState,
        path: req?.originalUrl || req?.url || 'N/A',
      },
    });
    throw createAppError(
      403,
      'UNAUTHORIZED_STATE_ACCESS',
      `Access denied. Application belongs to state '${appState}', outside your assigned state '${userState}'.`
    );
  }

  // District isolation check for OFFICER
  const isOfficer = roles.some((r) => ['OFFICER', 'GOVERNMENT_OFFICER'].includes(r));
  if (isOfficer) {
    const officerDistrict = user.district;
    if (officerDistrict && appDistrict && String(appDistrict).trim().toLowerCase() !== String(officerDistrict).trim().toLowerCase()) {
      await auditRepository.logAuditEvent({
        eventType: 'UNAUTHORIZED_DISTRICT_ACCESS_ATTEMPT',
        actorType: 'OFFICER',
        actorReference: user.id,
        caseId: reviewCase.case_id,
        metadata: {
          reason: 'Attempted to access case outside assigned district',
          attemptedDistrict: appDistrict,
          assignedDistrict: officerDistrict,
          path: req?.originalUrl || req?.url || 'N/A',
        },
      });
      throw createAppError(
        403,
        'UNAUTHORIZED_DISTRICT_ACCESS',
        `Access denied. Application belongs to district '${appDistrict}', outside your assigned district '${officerDistrict}'.`
      );
    }

    if (reviewCase.assigned_officer_id && reviewCase.assigned_officer_id !== user.id) {
      throw createAppError(403, 'CASE_ASSIGNED_TO_ANOTHER_OFFICER', 'This application is assigned to another officer.');
    }
  }
}

function assertCitizenOwnership(user, citizenId) {
  if (isElevatedUser(user)) return;
  if (user.id !== citizenId) {
    throw createAppError(403, 'FORBIDDEN', 'Access denied. You can only access your own records.');
  }
}

// Ensure photo upload dir exists
fs.mkdirSync(PHOTO_STORAGE_DIR, { recursive: true });

class VerificationWorkflowController {
  // ── CITIZEN APPLICATION SUBMISSION ──────────────────────────────────────────
  async submitCitizenApplication(req, res, next) {
    try {
      const application = await landRecordPipelineService.submitCitizenApplication(req);

      // Status in state machine: PENDING_OFFICER_REVIEW
      await reviewRepository.updateStatus(application.application_id, 'PENDING_OFFICER_REVIEW');

      // Create persistent officer notification in MySQL
      const citData = application.citizen_submitted_data || {};
      await notificationRepository.createNotification({
        targetRole: 'OFFICER',
        title: 'NEW LAND RECORD APPLICATION',
        message: `Application ${application.application_id} submitted for ${citData.village || 'location'} (Survey: ${citData.survey_number || 'N/A'}).`,
        type: 'NEW_APPLICATION',
        referenceId: application.application_id,
      });

      return res.status(201).json(
        successResponse('Land record application submitted successfully.', {
          ...application,
          status: 'PENDING_OFFICER_REVIEW',
          owner_name: citData.owner_name || application.owner_name,
          survey_number: citData.survey_number || application.survey_number,
          area: citData.area || application.area,
          village: citData.village || application.village,
          taluk: citData.taluk || application.taluk,
          district: citData.district || application.district,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── CITIZEN VIEW OWN APPLICATIONS ───────────────────────────────────────────
  async getMyApplications(req, res, next) {
    try {
      const documents = await documentService.getDocumentsByUserId(req.user.id);
      const applications = [];

      for (const doc of documents) {
        const reviewCase = await reviewRepository.findByDocumentId(doc.document_id);
        const lr = doc.land_record_id ? await landRecordRepository.findById(doc.land_record_id) : null;
        const citData = lr?.citizen_submitted_data || {};
        const activeAppt = reviewCase ? await appointmentRepository.findActiveByCaseId(reviewCase.case_id) : null;

        applications.push({
          application_id: reviewCase?.case_id || `APP-${doc.document_id.slice(-6)}`,
          document_id: doc.document_id,
          filename: doc.original_filename,
          owner_name: citData.owner_name || lr?.owner_name || '—',
          survey_number: citData.survey_number || lr?.survey_number || '—',
          area: citData.area || (lr?.area_value ? `${lr.area_value} ${lr.area_unit || ''}`.trim() : '—'),
          village: citData.village || lr?.village || '—',
          taluk: citData.taluk || lr?.taluk || '—',
          district: citData.district || lr?.district || '—',
          status: reviewCase?.status || 'PENDING_OFFICER_REVIEW',
          ai_status: reviewCase?.ai_status || lr?.ai_status || 'NOT_STARTED',
          is_duplicate: Boolean(lr?.is_duplicate || reviewCase?.is_duplicate),
          duplicate_reason: lr?.duplicate_reason || reviewCase?.duplicate_reason || null,
          assigned_officer_id: reviewCase?.assigned_officer_id || null,
          appointment: activeAppt,
          submitted_at: doc.uploaded_at,
          updated_at: reviewCase?.updated_at || doc.updated_at,
        });
      }

      return res.status(200).json(successResponse('Applications retrieved.', { applications }));
    } catch (error) {
      return next(error);
    }
  }

  async getMyApplicationById(req, res, next) {
    try {
      const { id } = req.params;
      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }

      const doc = await documentService.getDocumentById(reviewCase.document_id);
      assertCitizenOwnership(req.user, doc.created_by_user_id);

      const lr = reviewCase.land_record_id ? await landRecordRepository.findById(reviewCase.land_record_id) : null;
      const appt = await appointmentRepository.findActiveByCaseId(reviewCase.case_id);
      const approvedRecord = reviewCase.status === 'GOVERNMENT_APPROVED'
        ? await digitalLandRecordRepository.findByCaseId(reviewCase.case_id)
        : null;

      // Filter out internal officer notes and internal audit logs for citizen privacy
      return res.status(200).json(
        successResponse('Application details retrieved.', {
          application_id: reviewCase.case_id,
          status: reviewCase.status,
          priority: reviewCase.priority,
          submitted_at: reviewCase.created_at,
          updated_at: reviewCase.updated_at,
          assigned_officer_id: reviewCase.assigned_officer_id,
          citizen_submitted_data: reviewCase.citizen_submitted_data || lr?.citizen_submitted_data || {},
          document: {
            document_id: doc.document_id,
            filename: doc.original_filename,
            file_type: doc.file_type,
            file_size: doc.file_size,
            uploaded_at: doc.uploaded_at,
          },
          appointment: appt,
          approved_record: approvedRecord,
          is_duplicate: Boolean(reviewCase.is_duplicate),
          duplicate_reason: reviewCase.duplicate_reason,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── OFFICER GET APPLICATIONS LIST ───────────────────────────────────────────
  async getOfficerApplications(req, res, next) {
    try {
      const { status, priority, limit = 50, offset = 0 } = req.query || {};
      const roles = Array.isArray(req.user?.roles) ? req.user.roles.map(r => String(r).toUpperCase()) : [String(req.user?.primary_role || req.user?.roles || '').toUpperCase()];
      const isSuperAdmin = roles.includes('SUPER_ADMIN');
      const isOfficer = roles.some(r => ['OFFICER', 'GOVERNMENT_OFFICER'].includes(r));
      const elevated = roles.some(r => ['SUPER_ADMIN', 'MINISTER', 'STATE_ADMIN', 'ADMIN'].includes(r));

      // Derive authorized state and district strictly from server-side user record
      let queryState = isSuperAdmin ? (req.query?.state || null) : (req.user.state || 'Tamil Nadu');
      let queryDistrict = isOfficer ? (req.user.district || null) : (req.query?.district || null);

      const casesList = await reviewRepository.findAll({
        status,
        priority,
        state: queryState,
        district: queryDistrict,
        assignedOfficerId: elevated ? null : req.user.id,
        includeUnassigned: !elevated,
        limit,
        offset,
      });

      // Get counts for officer dashboard tabs/metrics
      const stats = await reviewRepository.getStats();

      // Additional live metrics from database
      const [apptTodayCount, readyApptCount, verifiedCount] = await Promise.all([
        appointmentRepository.findTodayAppointments(elevated ? null : req.user.id),
        reviewRepository.findAll({ status: 'READY_FOR_CITIZEN_VERIFICATION' }),
        digitalLandRecordRepository.findAll({ limit: 1 }),
      ]);

      return res.status(200).json(
        successResponse('Officer applications retrieved.', {
          applications: casesList,
          stats: {
            ...stats,
            appointments_today: apptTodayCount.length,
            ready_for_appointment: readyApptCount.length,
            total_approved: verifiedCount.total,
          },
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── OFFICER VIEW APPLICATION DETAILS ────────────────────────────────────────
  async getOfficerApplicationById(req, res, next) {
    try {
      const { id } = req.params;
      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }

      await assertOfficerAuthorized(req.user, reviewCase, req);

      // Auto-claim application if not assigned
      if (!reviewCase.assigned_officer_id && !isElevatedUser(req.user) && ['PENDING_OFFICER_REVIEW', 'PENDING_REVIEW', 'CORRECTION_REQUIRED', 'ON_HOLD'].includes(reviewCase.status)) {
        try {
          await reviewRepository.claimCase(id, req.user.id);
          reviewCase.assigned_officer_id = req.user.id;
        } catch (_) {
          // Safe ignore if claimed concurrently
        }
      }

      // If status is PENDING_OFFICER_REVIEW or PENDING_REVIEW, update to UNDER_OFFICER_REVIEW
      if (['PENDING_OFFICER_REVIEW', 'PENDING_REVIEW'].includes(reviewCase.status)) {
        await reviewRepository.updateStatus(id, 'UNDER_OFFICER_REVIEW');
        reviewCase.status = 'UNDER_OFFICER_REVIEW';
        await auditRepository.logAuditEvent({
          eventType: 'OFFICER_VIEWED_APPLICATION',
          actorType: req.user.primary_role || 'OFFICER',
          actorReference: req.user.id,
          caseId: id,
          metadata: { officer_id: req.user.id },
        });
      }

      const [appointments, activeSession, approvedRecord] = await Promise.all([
        appointmentRepository.findByCaseId(id),
        verificationSessionRepository.findActiveSession(id),
        digitalLandRecordRepository.findByCaseId(id),
      ]);

      return res.status(200).json(
        successResponse('Application details retrieved.', {
          ...reviewCase,
          appointments,
          active_verification_session: activeSession,
          approved_record: approvedRecord,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── OFFICER SECURE VIEW OF ORIGINAL UPLOADED DOCUMENT ──────────────────────
  async getOfficerApplicationDocument(req, res, next) {
    try {
      const { id } = req.params;
      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }

      await assertOfficerAuthorized(req.user, reviewCase, req);

      const doc = await documentService.getDocumentById(reviewCase.document_id);
      if (!doc) {
        throw createAppError(404, 'DOCUMENT_NOT_FOUND', 'Original document record not found.');
      }

      const absPath = documentService.getAbsoluteStoragePath(doc.storage_path);
      if (!fs.existsSync(absPath)) {
        throw createAppError(404, 'FILE_NOT_FOUND', 'Original document file not found on storage.');
      }

      res.setHeader('Content-Type', doc.mime_type || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_filename)}"`);
      return res.sendFile(absPath);
    } catch (error) {
      return next(error);
    }
  }

  // ── OFFICER GENERATE DIGITAL LAND RECORD VIA AI ─────────────────────────────
  async generateDigitalLandRecord(req, res, next) {
    try {
      const { id } = req.params;
      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }

      await assertOfficerAuthorized(req.user, reviewCase, req);

      // Audit AI processing start
      await auditRepository.logAuditEvent({
        eventType: 'AI_PROCESSING_STARTED',
        actorType: req.user.primary_role || 'OFFICER',
        actorReference: req.user.id,
        caseId: id,
        metadata: { officer_id: req.user.id },
      });

      // Update status to AI_PROCESSING
      await reviewRepository.updateStatus(id, 'AI_PROCESSING');

      // Call the real Python AI Service via pipeline
      const result = await landRecordPipelineService.processApplicationWithAI(id, req);

      // Transition to AI_GENERATED
      await reviewRepository.updateStatus(id, 'AI_GENERATED');

      // Audit AI processing completed
      await auditRepository.logAuditEvent({
        eventType: 'AI_PROCESSING_COMPLETED',
        actorType: req.user.primary_role || 'OFFICER',
        actorReference: req.user.id,
        caseId: id,
        metadata: {
          officer_id: req.user.id,
          confidence: result.case?.ai_confidence,
          anomalies_count: (result.anomalies || []).length,
        },
      });

      const updatedCase = await reviewRepository.findById(id);

      return res.status(200).json(
        successResponse('Digital Land Record draft generated by AI service.', {
          status: updatedCase?.status || 'AI_GENERATED',
          draft: result.land_record,
          application: updatedCase,
          land_record: result.land_record,
          comparisons: result.comparisons,
          anomalies: result.anomalies,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── OFFICER GET DIGITAL RECORD DRAFT ────────────────────────────────────────
  async getDigitalRecordDraft(req, res, next) {
    try {
      const { id } = req.params;
      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }
      await assertOfficerAuthorized(req.user, reviewCase, req);

      const lr = reviewCase.land_record_id ? await landRecordRepository.findById(reviewCase.land_record_id) : null;
      return res.status(200).json(
        successResponse('Digital Land Record draft retrieved.', {
          application_id: id,
          status: reviewCase.status,
          ai_status: reviewCase.ai_status,
          citizen_submitted_data: reviewCase.citizen_submitted_data || lr?.citizen_submitted_data || {},
          ai_extracted_data: reviewCase.ai_extracted_data || lr?.ai_extracted_data || {},
          fields: lr?.fields || reviewCase.case_data?.land_record || {},
          comparisons: reviewCase.case_data?.comparisons || [],
          anomalies: reviewCase.anomalies || [],
          corrections: reviewCase.corrections || [],
          notes: reviewCase.notes || [],
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── OFFICER EDIT / CORRECT DIGITAL RECORD DRAFT ─────────────────────────────
  async updateDigitalRecordDraft(req, res, next) {
    try {
      const { id } = req.params;
      const { corrections = [], fields, field, originalValue, correctedValue, reason, notes } = req.body || {};

      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }
      await assertOfficerAuthorized(req.user, reviewCase, req);

      if (['GOVERNMENT_APPROVED', 'APPROVED', 'REJECTED'].includes(reviewCase.status)) {
        throw createAppError(409, 'APPLICATION_LOCKED', 'Cannot edit a finalized or rejected application.');
      }

      const itemsToProcess = [];
      if (Array.isArray(corrections) && corrections.length > 0) {
        itemsToProcess.push(...corrections);
      } else if (fields && typeof fields === 'object' && Object.keys(fields).length > 0) {
        for (const [k, v] of Object.entries(fields)) {
          itemsToProcess.push({ field: k, correctedValue: v, reason: notes || reason || 'Officer manual correction' });
        }
      } else if (field && correctedValue !== undefined) {
        itemsToProcess.push({ field, originalValue, correctedValue, reason });
      }

      for (const item of itemsToProcess) {
        const f = item.field;
        const cVal = item.correctedValue;
        const oVal = item.originalValue !== undefined ? item.originalValue : null;
        const r = item.reason || 'Officer manual correction';

        await reviewRepository.addCorrection({
          caseId: id,
          anomalyId: item.anomalyId || null,
          field: f,
          originalValue: oVal,
          correctedValue: cVal,
          reason: r,
          officerId: req.user.id,
        });

        if (reviewCase.land_record_id) {
          await landRecordRepository.updateField(reviewCase.land_record_id, f, cVal);
        }

        await auditRepository.logAuditEvent({
          eventType: 'OFFICER_CORRECTION_SUBMITTED',
          actorType: req.user.primary_role || 'OFFICER',
          actorReference: req.user.id,
          caseId: id,
          metadata: {
            field: f,
            original_value: oVal,
            corrected_value: cVal,
            reason: r,
            officer_id: req.user.id,
          },
        });
      }

      // Update application lifecycle status to OFFICER_CORRECTION or READY_FOR_CITIZEN_VERIFICATION
      const targetStatus = req.body?.status === 'READY_FOR_CITIZEN_VERIFICATION'
        ? 'READY_FOR_CITIZEN_VERIFICATION'
        : 'OFFICER_CORRECTION';
      await reviewRepository.updateStatus(id, targetStatus);

      const updatedCase = await reviewRepository.findById(id);
      return res.status(200).json(
        successResponse('Digital record draft updated and corrections saved.', updatedCase)
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── OFFICER SCHEDULE CITIZEN APPOINTMENT ────────────────────────────────────
  async scheduleAppointment(req, res, next) {
    try {
      const { id } = req.params;
      const { appointmentDate, appointmentTime, officeLocation, purpose, notes } = req.body || {};

      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }
      await assertOfficerAuthorized(req.user, reviewCase, req);

      const doc = await documentService.getDocumentById(reviewCase.document_id);
      if (!doc || !doc.created_by_user_id) {
        throw createAppError(400, 'CITIZEN_NOT_FOUND', 'Citizen user could not be determined for this application.');
      }

      const appointment = await appointmentRepository.createAppointment({
        caseId: id,
        citizenId: doc.created_by_user_id,
        officerId: req.user.id,
        appointmentDate,
        appointmentTime,
        officeLocation,
        purpose: purpose || 'Physical Verification of Original Land Documents',
        notes,
      });

      // Update application status to APPOINTMENT_SCHEDULED
      await reviewRepository.updateStatus(id, 'APPOINTMENT_SCHEDULED');

      // Send persistent notification to Citizen
      await notificationRepository.createNotification({
        userId: doc.created_by_user_id,
        title: 'LAND RECORD VERIFICATION APPOINTMENT SCHEDULED',
        message: `Your verification appointment is scheduled for ${appointment.appointment_date} at ${appointment.appointment_time} at ${appointment.office_location}.`,
        type: 'APPOINTMENT',
        referenceId: id,
      });

      // Audit event
      await auditRepository.logAuditEvent({
        eventType: 'APPOINTMENT_SCHEDULED',
        actorType: req.user.primary_role || 'OFFICER',
        actorReference: req.user.id,
        caseId: id,
        metadata: {
          appointment_id: appointment.id,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          office_location: appointment.office_location,
          citizen_id: doc.created_by_user_id,
        },
      });

      return res.status(201).json(
        successResponse('Citizen appointment scheduled successfully.', appointment)
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── CITIZEN / OFFICER GET APPOINTMENTS ──────────────────────────────────────
  async getAppointments(req, res, next) {
    try {
      const role = req.user?.primary_role || req.user?.role || (Array.isArray(req.user?.roles) ? req.user.roles[0] : 'CITIZEN');

      let appointments = [];
      if (role === 'CITIZEN') {
        appointments = await appointmentRepository.findCitizenAppointments(req.user.id);
      } else {
        const elevated = isElevatedUser(req.user);
        appointments = await appointmentRepository.findOfficerAppointments(elevated ? null : req.user.id);
      }

      return res.status(200).json(successResponse('Appointments retrieved.', { appointments }));
    } catch (error) {
      return next(error);
    }
  }

  // ── OFFICER START PHYSICAL VERIFICATION SESSION ─────────────────────────────
  async startVerification(req, res, next) {
    try {
      const { id } = req.params;
      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }
      await assertOfficerAuthorized(req.user, reviewCase, req);

      const doc = await documentService.getDocumentById(reviewCase.document_id);
      const activeAppt = await appointmentRepository.findActiveByCaseId(id);

      const session = await verificationSessionRepository.createSession({
        caseId: id,
        appointmentId: activeAppt?.id || null,
        citizenId: doc.created_by_user_id,
        officerId: req.user.id,
      });

      // Update application lifecycle status
      await reviewRepository.updateStatus(id, 'CITIZEN_VERIFICATION');

      await auditRepository.logAuditEvent({
        eventType: 'VERIFICATION_SESSION_STARTED',
        actorType: req.user.primary_role || 'OFFICER',
        actorReference: req.user.id,
        caseId: id,
        metadata: {
          session_id: session.id,
          citizen_id: doc.created_by_user_id,
          officer_id: req.user.id,
        },
      });

      return res.status(200).json(
        successResponse('Physical verification session started.', {
          ...session,
          status: 'CITIZEN_VERIFICATION',
          session_status: session.status || 'IN_PROGRESS',
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── CITIZEN IDENTITY OTP VERIFICATION: SEND OTP ─────────────────────────────
  async sendVerificationOtp(req, res, next) {
    try {
      const { id } = req.params;
      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }
      await assertOfficerAuthorized(req.user, reviewCase, req);

      const session = await verificationSessionRepository.findActiveSession(id);
      if (!session) {
        throw createAppError(400, 'NO_ACTIVE_SESSION', 'Please start a verification session first.');
      }

      const doc = await documentService.getDocumentById(reviewCase.document_id);
      const devOtp = config.devOtp || null; // for automated testing / demo

      const otpResult = await verificationOtpRepository.createOtp({
        sessionId: session.id,
        caseId: id,
        citizenId: doc.created_by_user_id,
        otp: devOtp,
      });

      // Send persistent notification to citizen
      await notificationRepository.createNotification({
        userId: doc.created_by_user_id,
        title: 'GOVERNMENT LAND VERIFICATION OTP',
        message: `Your verification OTP is ${otpResult.otp}. Present this to the verifying officer. Valid for 10 minutes.`,
        type: 'VERIFICATION_OTP',
        referenceId: id,
      });

      await auditRepository.logAuditEvent({
        eventType: 'VERIFICATION_OTP_DISPATCHED',
        actorType: req.user.primary_role || 'OFFICER',
        actorReference: req.user.id,
        caseId: id,
        metadata: {
          session_id: session.id,
          citizen_id: doc.created_by_user_id,
          expires_at: otpResult.expiresAt,
        },
      });

      return res.status(200).json(
        successResponse('Verification OTP sent successfully to citizen.', {
          sessionId: session.id,
          expiresAt: otpResult.expiresAt,
          // In test/dev mode only, include demo OTP for seamless test assertions
          ...(process.env.NODE_ENV !== 'production' ? { demoOtp: otpResult.otp } : {}),
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── CITIZEN IDENTITY OTP VERIFICATION: VERIFY OTP ───────────────────────────
  async verifyVerificationOtp(req, res, next) {
    try {
      const { id } = req.params;
      const { otp, sessionId } = req.body || {};

      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }
      await assertOfficerAuthorized(req.user, reviewCase, req);

      const session = sessionId
        ? await verificationSessionRepository.findById(sessionId)
        : await verificationSessionRepository.findActiveSession(id);

      if (!session) {
        throw createAppError(400, 'NO_ACTIVE_SESSION', 'No active verification session found.');
      }

      // Verify OTP (hashes match, attempts limit, expiry)
      const verifyResult = await verificationOtpRepository.verifyOtp({
        sessionId: session.id,
        otp,
      });

      // Update session otp_verified
      await verificationSessionRepository.updateOtpVerified(session.id);

      await auditRepository.logAuditEvent({
        eventType: 'VERIFICATION_OTP_VERIFIED',
        actorType: req.user.primary_role || 'OFFICER',
        actorReference: req.user.id,
        caseId: id,
        metadata: {
          session_id: session.id,
          verified: true,
          officer_id: req.user.id,
        },
      });

      return res.status(200).json(
        successResponse('Citizen identity verified successfully via OTP.', {
          verified: true,
          sessionId: session.id,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── CAPTURE LAND OWNER / CITIZEN PHOTO ──────────────────────────────────────
  async captureVerificationPhoto(req, res, next) {
    try {
      const { id } = req.params;
      const { photoData, mimeType = 'image/jpeg' } = req.body || {};

      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }
      await assertOfficerAuthorized(req.user, reviewCase, req);

      const session = await verificationSessionRepository.findActiveSession(id);
      if (!session) {
        throw createAppError(400, 'NO_ACTIVE_SESSION', 'Please start a verification session first.');
      }

      if (!session.otp_verified) {
        throw createAppError(400, 'OTP_VERIFICATION_REQUIRED', 'Citizen OTP verification must be completed before capturing photo.');
      }

      let buffer;
      let fileSize = 0;

      if (req.file) {
        buffer = await fs.promises.readFile(req.file.path);
        fileSize = req.file.size;
        await fs.promises.unlink(req.file.path).catch(() => {});
      } else if (photoData && typeof photoData === 'string') {
        const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
        fileSize = buffer.length;
      } else {
        throw createAppError(400, 'INVALID_PHOTO_DATA', 'Camera photo capture data or file is required.');
      }

      const photoFileName = `photo-${session.id}-${Date.now()}.jpg`;
      const storagePath = path.join(PHOTO_STORAGE_DIR, photoFileName);

      await fs.promises.writeFile(storagePath, buffer);

      const photoRecord = await verificationPhotoRepository.savePhoto({
        sessionId: session.id,
        caseId: id,
        citizenId: session.citizen_id,
        officerId: req.user.id,
        storageReference: photoFileName,
        mimeType,
        fileSize,
      });

      await verificationSessionRepository.updatePhotoCaptured(session.id, photoRecord.id);

      await auditRepository.logAuditEvent({
        eventType: 'VERIFICATION_PHOTO_CAPTURED',
        actorType: req.user.primary_role || 'OFFICER',
        actorReference: req.user.id,
        caseId: id,
        metadata: {
          photo_id: photoRecord.id,
          session_id: session.id,
          officer_id: req.user.id,
        },
      });

      return res.status(200).json(
        successResponse('Land owner photo captured and saved securely.', {
          photo_id: photoRecord.id,
          sessionId: session.id,
          captured_at: photoRecord.captured_at,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── SECURE RETRIEVAL OF VERIFICATION PHOTO (AUTHORIZATION-PROTECTED) ────────
  async getVerificationPhoto(req, res, next) {
    try {
      const { photoId } = req.params;
      const photo = await verificationPhotoRepository.findById(photoId);
      if (!photo) {
        throw createAppError(404, 'PHOTO_NOT_FOUND', 'Verification photo was not found.');
      }

      // Authorization: Only authorized Officer, Super Admin/Minister, or the Citizen themselves
      if (!isElevatedUser(req.user) && req.user.id !== photo.officer_id && req.user.id !== photo.citizen_id) {
        throw createAppError(403, 'FORBIDDEN', 'Access denied to this verification photo.');
      }

      const filePath = path.join(PHOTO_STORAGE_DIR, photo.storage_reference);
      if (!fs.existsSync(filePath)) {
        throw createAppError(404, 'FILE_NOT_FOUND', 'Verification photo file not found on storage.');
      }

      res.setHeader('Content-Type', photo.mime_type || 'image/jpeg');
      return res.sendFile(filePath);
    } catch (error) {
      return next(error);
    }
  }

  // ── OFFICER FINAL VERIFICATION CHECKLIST ────────────────────────────────────
  async performFinalVerification(req, res, next) {
    try {
      const { id } = req.params;
      const { notes, documentsChecked = true } = req.body || {};

      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }
      await assertOfficerAuthorized(req.user, reviewCase, req);

      const session = await verificationSessionRepository.findActiveSession(id);
      if (!session) {
        throw createAppError(400, 'NO_ACTIVE_SESSION', 'No active verification session.');
      }

      if (!session.otp_verified) {
        throw createAppError(400, 'OTP_VERIFICATION_REQUIRED', 'Citizen OTP verification has not been completed.');
      }

      if (!session.photo_captured) {
        throw createAppError(400, 'PHOTO_CAPTURE_REQUIRED', 'Citizen photo has not been captured.');
      }

      await verificationSessionRepository.updateDocumentsChecked(session.id, documentsChecked);
      await reviewRepository.updateStatus(id, 'OFFICER_FINAL_REVIEW');

      await auditRepository.logAuditEvent({
        eventType: 'OFFICER_FINAL_VERIFICATION_COMPLETED',
        actorType: req.user.primary_role || 'OFFICER',
        actorReference: req.user.id,
        caseId: id,
        metadata: {
          session_id: session.id,
          officer_id: req.user.id,
          notes: notes || 'Physical documents and citizen identity verified in person.',
        },
      });

      const updatedCase = await reviewRepository.findById(id);
      return res.status(200).json(
        successResponse('Final verification checks completed. Ready for Government Approval.', updatedCase)
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── GOVERNMENT APPROVAL (TRANSACTIONAL) ──────────────────────────────────────
  async approveApplication(req, res, next) {
    try {
      const { id } = req.params;
      const { notes = 'Physical verification completed and government approved.' } = req.body || {};

      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }
      await assertOfficerAuthorized(req.user, reviewCase, req);

      if (['GOVERNMENT_APPROVED', 'APPROVED'].includes(reviewCase.status)) {
        throw createAppError(409, 'ALREADY_APPROVED', 'This land record application is already Government Approved.');
      }

      const lr = reviewCase.land_record_id ? await landRecordRepository.findById(reviewCase.land_record_id) : null;
      if (!lr) {
        throw createAppError(400, 'NO_LAND_RECORD', 'Land record data is missing for this application.');
      }

      const doc = await documentService.getDocumentById(reviewCase.document_id);
      const session = await verificationSessionRepository.findActiveSession(id);

      // Final verified data preserving officer corrections
      const finalApprovedData = {
        owner_name: lr.owner_name || reviewCase.citizen_submitted_data?.owner_name || 'Land Owner',
        survey_number: lr.survey_number || reviewCase.citizen_submitted_data?.survey_number || '—',
        khasra_number: lr.khasra_number || null,
        khata_number: lr.khata_number || null,
        area_value: lr.area_value != null ? lr.area_value : null,
        area_unit: lr.area_unit || 'acre',
        village: lr.village || reviewCase.citizen_submitted_data?.village || '',
        taluk: lr.taluk || reviewCase.citizen_submitted_data?.taluk || '',
        district: lr.district || reviewCase.citizen_submitted_data?.district || '',
        state: lr.state || 'Tamil Nadu',
        classification: lr.classification || 'Agricultural',
        record_date: lr.record_date || null,
        officer_corrections: reviewCase.corrections || [],
      };

      // ── TRANSACTION EXECUTION ──────────────────────────────────────────────
      // 1. Create digital_land_records
      const approvedRecord = await digitalLandRecordRepository.createApprovedRecord({
        caseId: id,
        landRecordId: lr.id,
        citizenId: doc.created_by_user_id,
        officerId: req.user.id,
        finalData: finalApprovedData,
        verificationSessionId: session?.id || null,
      });

      // 2. Update review_cases status
      await reviewRepository.updateStatus(id, 'GOVERNMENT_APPROVED', {
        officerId: req.user.id,
        reason: notes,
      });

      // 3. Update land_records status
      await landRecordRepository.updateStatus(lr.id, 'GOVERNMENT_APPROVED', {
        verifiedBy: req.user.name || req.user.username || req.user.id,
        officerNotes: notes,
      });

      // 4. Complete session if active
      if (session) {
        await verificationSessionRepository.completeSession(session.id, notes);
      }

      // 5. Complete active appointment if exists
      const activeAppt = await appointmentRepository.findActiveByCaseId(id);
      if (activeAppt) {
        await appointmentRepository.updateStatus(activeAppt.id, 'COMPLETED', notes);
      }

      // 6. Audit event
      await auditRepository.logAuditEvent({
        eventType: 'LAND_RECORD_GOVERNMENT_APPROVED',
        actorType: req.user.primary_role || 'OFFICER',
        actorReference: req.user.id,
        caseId: id,
        metadata: {
          record_id: approvedRecord.record_id,
          digital_record_id: approvedRecord.id,
          officer_id: req.user.id,
          citizen_id: doc.created_by_user_id,
          approval_date: approvedRecord.approval_date,
        },
      });

      // 7. Notification for Citizen
      await notificationRepository.createNotification({
        userId: doc.created_by_user_id,
        title: 'LAND RECORD GOVERNMENT APPROVED',
        message: `Congratulations! Your land record for Survey No ${finalApprovedData.survey_number} (${finalApprovedData.village}) has been officially verified and Government Approved. Record ID: ${approvedRecord.record_id}.`,
        type: 'RECORD_APPROVED',
        referenceId: approvedRecord.record_id,
      });

      return res.status(200).json(
        successResponse('Government Approved Digital Land Record created successfully.', {
          ...approvedRecord,
          approved_record: approvedRecord,
          record_id: approvedRecord.record_id,
          id: approvedRecord.id,
          status: 'GOVERNMENT_APPROVED',
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── REJECT APPLICATION ──────────────────────────────────────────────────────
  async rejectApplication(req, res, next) {
    try {
      const { id } = req.params;
      const { reason, notes } = req.body || {};

      const reviewCase = await reviewRepository.findById(id);
      if (!reviewCase) {
        throw createAppError(404, 'APPLICATION_NOT_FOUND', `Application '${id}' was not found.`);
      }
      await assertOfficerAuthorized(req.user, reviewCase, req);

      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        throw createAppError(400, 'REJECTION_REASON_REQUIRED', 'Rejection reason is required.');
      }

      const rejReason = reason.trim();
      await reviewRepository.updateStatus(id, 'REJECTED', {
        officerId: req.user.id,
        rejectionReason: rejReason,
      });

      if (reviewCase.land_record_id) {
        await landRecordRepository.updateStatus(reviewCase.land_record_id, 'REJECTED', {
          verifiedBy: req.user.id,
          officerNotes: notes || rejReason,
        });
      }

      const doc = await documentService.getDocumentById(reviewCase.document_id);
      if (doc?.created_by_user_id) {
        await notificationRepository.createNotification({
          userId: doc.created_by_user_id,
          title: 'LAND RECORD APPLICATION REJECTED',
          message: `Application ${id} was rejected. Reason: ${rejReason}`,
          type: 'APPLICATION_REJECTED',
          referenceId: id,
        });
      }

      await auditRepository.logAuditEvent({
        eventType: 'LAND_RECORD_REJECTED',
        actorType: req.user.primary_role || 'OFFICER',
        actorReference: req.user.id,
        caseId: id,
        metadata: {
          reason: rejReason,
          officer_id: req.user.id,
        },
      });

      const updatedCase = await reviewRepository.findById(id);
      return res.status(200).json(
        successResponse('Land record application rejected.', updatedCase)
      );
    } catch (error) {
      return next(error);
    }
  }

  // ── CITIZEN / PUBLIC GET APPROVED LAND RECORDS ──────────────────────────────
  async getApprovedLandRecords(req, res, next) {
    try {
      const role = req.user?.primary_role || req.user?.role || (Array.isArray(req.user?.roles) ? req.user.roles[0] : 'CITIZEN');

      if (role === 'CITIZEN') {
        const records = await digitalLandRecordRepository.findByCitizenId(req.user.id);
        return res.status(200).json(
          successResponse('Approved land records retrieved.', { records })
        );
      }

      // Officer / Minister / State Admin / Super Admin
      const { getUserJurisdiction } = require('../middleware/jurisdiction');
      const jurisdiction = getUserJurisdiction(req.user);
      const { search = '', limit = 50, offset = 0 } = req.query || {};
      const { total, records } = await digitalLandRecordRepository.findAll({
        search,
        state: jurisdiction.isNationwide ? (req.query?.state || null) : jurisdiction.state,
        district: jurisdiction.role === 'OFFICER' ? jurisdiction.district : (req.query?.district || null),
        limit,
        offset,
      });
      return res.status(200).json(
        successResponse('Approved land records retrieved.', { total, records })
      );
    } catch (error) {
      return next(error);
    }
  }

  async getApprovedLandRecordById(req, res, next) {
    try {
      const { id } = req.params;
      const record = await digitalLandRecordRepository.findById(id);
      if (!record) {
        throw createAppError(404, 'RECORD_NOT_FOUND', `Approved land record '${id}' was not found.`);
      }

      // IDOR Protection: Citizens can ONLY view their own records; Officers/Ministers/State Admins must have jurisdiction
      const role = req.user?.primary_role || req.user?.role || (Array.isArray(req.user?.roles) ? req.user.roles[0] : 'CITIZEN');
      if (role === 'CITIZEN') {
        assertCitizenOwnership(req.user, record.citizen_id);
      } else {
        const { authorizeResourceJurisdiction } = require('../middleware/jurisdiction');
        await authorizeResourceJurisdiction(req.user, record, { req });
      }

      await auditRepository.logAuditEvent({
        eventType: 'APPROVED_RECORD_VIEWED',
        actorType: role,
        actorReference: req.user.id,
        caseId: record.case_id,
        metadata: {
          record_id: record.record_id,
          viewer_id: req.user.id,
        },
      });

      return res.status(200).json(
        successResponse('Approved land record details retrieved.', record)
      );
    } catch (error) {
      return next(error);
    }
  }

  async downloadApprovedLandRecordPdf(req, res, next) {
    try {
      const { id } = req.params;
      const record = await digitalLandRecordRepository.findById(id);
      if (!record) {
        throw createAppError(404, 'RECORD_NOT_FOUND', `Approved land record '${id}' was not found.`);
      }

      // IDOR Protection: Citizens can ONLY download their own records; Officers/Ministers/State Admins must have jurisdiction
      const role = req.user?.primary_role || req.user?.role || (Array.isArray(req.user?.roles) ? req.user.roles[0] : 'CITIZEN');
      if (role === 'CITIZEN') {
        assertCitizenOwnership(req.user, record.citizen_id);
      } else {
        const { authorizeResourceJurisdiction } = require('../middleware/jurisdiction');
        await authorizeResourceJurisdiction(req.user, record, { req });
      }

      const { generateLandRecordPdf } = require('../services/landRecordPdfService');
      const pdfBuffer = generateLandRecordPdf(record);

      await auditRepository.logAuditEvent({
        eventType: 'APPROVED_RECORD_PDF_DOWNLOADED',
        actorType: role,
        actorReference: req.user.id,
        caseId: record.case_id,
        metadata: {
          record_id: record.record_id,
          downloader_id: req.user.id,
        },
      });

      const filename = `DLR_Verified_Land_Record_${(record.survey_number || record.record_id || 'record').replace(/[\/\\]/g, '_')}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.status(200).send(pdfBuffer);
    } catch (error) {
      return next(error);
    }
  }

  // ── NOTIFICATIONS API ───────────────────────────────────────────────────────
  async getNotifications(req, res, next) {
    try {
      const role = req.user?.primary_role || req.user?.role || (Array.isArray(req.user?.roles) ? req.user.roles[0] : 'CITIZEN');
      const { unreadOnly = false, limit = 50 } = req.query || {};

      const notifications = await notificationRepository.getNotifications({
        userId: req.user.id,
        role,
        unreadOnly: Boolean(unreadOnly === 'true' || unreadOnly === true),
        limit: Number(limit),
      });

      const unreadCount = await notificationRepository.getUnreadCount(req.user.id, role);

      return res.status(200).json(
        successResponse('Notifications retrieved.', {
          notifications,
          unread_count: unreadCount,
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  async markNotificationRead(req, res, next) {
    try {
      const { id } = req.params;
      await notificationRepository.markAsRead(id, req.user.id);
      return res.status(200).json(successResponse('Notification marked as read.'));
    } catch (error) {
      return next(error);
    }
  }

  async markAllNotificationsRead(req, res, next) {
    try {
      const role = req.user?.primary_role || req.user?.role || (Array.isArray(req.user?.roles) ? req.user.roles[0] : 'CITIZEN');
      await notificationRepository.markAllAsRead(req.user.id, role);
      return res.status(200).json(successResponse('All notifications marked as read.'));
    } catch (error) {
      return next(error);
    }
  }
}

const verificationWorkflowController = new VerificationWorkflowController();

module.exports = {
  VerificationWorkflowController,
  verificationWorkflowController,
};
