from __future__ import annotations

import os

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.config import settings
from app.schemas.land_record import LandRecordExtractionRequest, LandRecordExtractionResponse
from app.services.extraction.extractor import LandRecordExtractor
from app.services.ocr.engine import OCRConfigError, OCRProcessingError, ocr_service

router = APIRouter(prefix='/api/v1/extraction', tags=['extraction'])
extractor = LandRecordExtractor()
ALLOWED_MIME_TYPES = {
    'image/jpeg': 'image',
    'image/png': 'image',
    'application/pdf': 'pdf',
}
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf'}


def sanitize_filename(filename: str | None) -> str:
    if not filename:
        return 'document'
    clean_name = os.path.basename(filename)
    clean_name = ''.join(
        character for character in clean_name if character.isalnum() or character in {'.', '_', '-', ' '}
    )
    return clean_name.strip() or 'document'


@router.post('/land-record', response_model=LandRecordExtractionResponse)
async def extract_land_record(request: LandRecordExtractionRequest) -> LandRecordExtractionResponse:
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': 'INVALID_OCR_TEXT', 'message': 'OCR text is empty.'},
        )

    extracted_fields = extractor.extract(request.text, request.language)
    payload = {
        name: {
            'value': result.value,
            'confidence': result.confidence,
            'source_text': result.source_text,
            'method': result.method,
        }
        for name, result in extracted_fields.items()
    }
    return LandRecordExtractionResponse(
        success=True,
        language=request.language,
        extracted_fields=payload,
        text_length=len(request.text.strip()),
    )


@router.post('/land-record/from-document', response_model=LandRecordExtractionResponse)
async def extract_land_record_from_document(
    file: UploadFile = File(...),
    language: str = Form(default=settings.ocr_default_language),
) -> LandRecordExtractionResponse:
    if file is None or file.filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': 'EMPTY_FILE', 'message': 'No file was uploaded.'},
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': 'EMPTY_FILE', 'message': 'Uploaded file is empty.'},
        )

    sanitized_name = sanitize_filename(file.filename)
    extension = os.path.splitext(sanitized_name)[1].lower()
    mime_type = file.content_type or ''
    document_type = ALLOWED_MIME_TYPES.get(mime_type)

    if document_type is None or extension.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={'error': 'UNSUPPORTED_FILE_TYPE', 'message': 'Only JPG, JPEG, PNG, or PDF documents are allowed.'},
        )

    max_size_bytes = settings.ocr_max_file_size_bytes
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={'error': 'FILE_TOO_LARGE', 'message': f'File exceeds the {settings.ocr_max_file_size_mb} MB limit.'},
        )

    try:
        ocr_result = ocr_service.extract_document(
            content,
            filename=sanitized_name,
            language=language,
            document_type=document_type,
        )
    except OCRConfigError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'error': 'OCR_ENGINE_NOT_FOUND', 'message': str(exc)},
        ) from exc
    except OCRProcessingError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={'error': 'OCR_PROCESSING_ERROR', 'message': str(exc)},
        ) from exc

    pages_text = ' '.join(page.get('text', '') for page in ocr_result.get('pages', []))
    if not pages_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': 'INVALID_OCR_TEXT', 'message': 'No text could be extracted from the uploaded document.'},
        )

    extracted_fields = extractor.extract(pages_text, ocr_result.get('language', language))
    payload = {
        name: {
            'value': result.value,
            'confidence': result.confidence,
            'source_text': result.source_text,
            'method': result.method,
        }
        for name, result in extracted_fields.items()
    }
    return LandRecordExtractionResponse(
        success=True,
        language=ocr_result.get('language', language),
        extracted_fields=payload,
        text_length=len(pages_text.strip()),
    )
