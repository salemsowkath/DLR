const fs = require('fs/promises');
const config = require('../config/env');

const SAFE_AI_MESSAGES = {
  EMPTY_FILE: 'The uploaded document is empty.',
  UNSUPPORTED_FILE_TYPE: 'The AI service does not support this document type.',
  FILE_TOO_LARGE: 'The document exceeds the AI service size limit.',
  INVALID_LANGUAGE: 'The requested OCR language is not supported.',
  INVALID_OCR_TEXT: 'No usable text could be extracted from the document.',
  OCR_ENGINE_NOT_FOUND: 'The AI OCR engine is not configured.',
  OCR_PROCESSING_ERROR: 'The AI service could not process the document.',
  INVALID_RECORD: 'The AI service rejected the land-record data.',
  INVALID_INPUT: 'The AI service rejected the GIS input.',
  INVALID_GEOMETRY: 'The AI service could not validate the supplied geometry.',
};

class AIServiceError extends Error {
  constructor(statusCode, code, message, options = {}) {
    super(message, options);
    this.name = 'AIServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details || null;
  }
}

class AIServiceClient {
  constructor({ fetchImpl = globalThis.fetch, configProvider = () => config } = {}) {
    if (typeof fetchImpl !== 'function') {
      throw new Error('A Fetch-compatible HTTP client is required.');
    }
    this.fetch = fetchImpl;
    this.configProvider = configProvider;
  }

  async health() {
    return this._request('/health', { stage: 'health' });
  }

  async processDocument({ filePath, filename, mimeType, language }) {
    let fileBytes;
    try {
      fileBytes = await fs.readFile(filePath);
    } catch (error) {
      throw new AIServiceError(500, 'DOCUMENT_READ_FAILED', 'The stored upload could not be read for AI processing.', { cause: error });
    }

    const form = new FormData();
    form.append('file', new Blob([fileBytes], { type: mimeType }), filename);
    if (language) form.append('language', language);
    return this._request('/api/v1/documents/process', { method: 'POST', body: form, stage: 'document processing' });
  }

  validateLandRecord(landRecord) {
    return this._request('/api/v1/validation/land-record', {
      method: 'POST',
      body: landRecord,
      stage: 'validation',
    });
  }

  validateGIS({ landRecord, geometry, crs }) {
    return this._request('/api/v1/gis/land-record', {
      method: 'POST',
      body: { land_record: landRecord, geometry, crs },
      stage: 'GIS validation',
    });
  }

  createReviewCase({ documentId, landRecord, validationResult, gisResult }) {
    return this._request('/api/v1/review/cases', {
      method: 'POST',
      body: {
        document_id: documentId,
        land_record: landRecord,
        validation_result: validationResult,
        gis_result: gisResult,
      },
      stage: 'review-case persistence',
    });
  }

  async _request(path, { method = 'GET', body, stage }) {
    const config = this.configProvider();
    const baseUrl = process.env.AI_SERVICE_URL || config.aiServiceUrl;
    if (!baseUrl) {
      throw new AIServiceError(503, 'AI_SERVICE_NOT_CONFIGURED', 'AI service URL is not configured.');
    }

    const timeoutValue = Number(process.env.AI_SERVICE_TIMEOUT_MS || config.aiServiceTimeoutMs || 120000);
    const timeoutMs = Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : 120000;
    let endpoint;
    try {
      endpoint = new URL(path, `${baseUrl.replace(/\/+$/, '')}/`);
    } catch (error) {
      throw new AIServiceError(503, 'AI_SERVICE_CONFIGURATION_ERROR', 'AI_SERVICE_URL must be a valid HTTP or HTTPS URL.', { cause: error });
    }
    if (!['http:', 'https:'].includes(endpoint.protocol)) {
      throw new AIServiceError(503, 'AI_SERVICE_CONFIGURATION_ERROR', 'AI_SERVICE_URL must use HTTP or HTTPS.');
    }
    const headers = {};
    let requestBody = body;
    if (body && !(body instanceof FormData)) {
      headers['content-type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }

    let response;
    try {
      response = await this.fetch(endpoint, {
        method,
        headers,
        body: requestBody,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new AIServiceError(504, 'AI_SERVICE_TIMEOUT', `AI ${stage} timed out.`, { cause: error });
      }
      throw new AIServiceError(503, 'AI_SERVICE_UNAVAILABLE', 'AI service is unavailable.', { cause: error });
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new AIServiceError(502, 'AI_INVALID_RESPONSE', `AI ${stage} returned an invalid response.`, { cause: error });
    }

    if (!response.ok) {
      const detail = payload?.detail;
      const upstreamCode = detail?.error || payload?.error?.code;
      const statusCode = response.status >= 500 ? 502 : response.status === 422 ? 400 : response.status;
      const code = stage === 'validation'
        ? 'AI_VALIDATION_FAILED'
        : stage === 'GIS validation'
          ? 'AI_GIS_FAILED'
          : stage === 'review-case persistence'
            ? 'AI_REVIEW_PERSISTENCE_FAILED'
            : upstreamCode || 'AI_PROCESSING_FAILED';
      const message = SAFE_AI_MESSAGES[upstreamCode] || `AI ${stage} failed.`;
      throw new AIServiceError(statusCode, code, message, { details: { upstream_status: response.status } });
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new AIServiceError(502, 'AI_INVALID_RESPONSE', `AI ${stage} returned an invalid response.`);
    }
    return payload;
  }
}

module.exports = { AIServiceClient, AIServiceError, aiServiceClient: new AIServiceClient() };
