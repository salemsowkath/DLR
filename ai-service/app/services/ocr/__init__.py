"""OCR-related services and abstractions."""

from app.services.ocr.engine import OCRConfigError, OCRProcessingError, OCRService, ocr_service

__all__ = [
    'OCRConfigError',
    'OCRProcessingError',
    'OCRService',
    'ocr_service',
]
