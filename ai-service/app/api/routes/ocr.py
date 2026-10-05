import os

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.config import settings
from app.schemas.ocr import OCRExtractionResponse
from app.services.ocr.engine import OCRConfigError, OCRProcessingError, ocr_service
from app.services.ocr.languages import normalize_language

router = APIRouter(prefix='/api/v1/ocr', tags=['ocr'])
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


@router.post('/extract', response_model=OCRExtractionResponse)
async def extract_document(
    file: UploadFile = File(...),
    language: str = Form(default=settings.ocr_default_language),
) -> OCRExtractionResponse:
    if file is None or file.filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': 'EMPTY_FILE', 'message': 'No file was uploaded.'},
        )

    original_name = file.filename or 'document'
    sanitized_name = sanitize_filename(original_name)
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': 'EMPTY_FILE', 'message': 'Uploaded file is empty.'},
        )

    extension = os.path.splitext(sanitized_name)[1].lower()
    mime_type = file.content_type or ''
    document_type = ALLOWED_MIME_TYPES.get(mime_type)

    if document_type is None or extension.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={'error': 'UNSUPPORTED_FILE_TYPE', 'message': 'Only JPG, JPEG, PNG, or PDF files are allowed.'},
        )

    if extension == '.pdf' and mime_type != 'application/pdf':
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={'error': 'UNSUPPORTED_FILE_TYPE', 'message': 'PDF documents must declare application/pdf MIME type.'},
        )

    max_size_bytes = settings.ocr_max_file_size_mb * 1024 * 1024
    if len(file_bytes) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={'error': 'FILE_TOO_LARGE', 'message': f'File exceeds the {settings.ocr_max_file_size_mb} MB limit.'},
        )

    try:
        normalized_language = normalize_language(language, settings.ocr_default_language)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': 'INVALID_LANGUAGE', 'message': str(exc)},
        ) from exc

    try:
        result = ocr_service.extract_document(
            file_bytes,
            filename=sanitized_name,
            language=normalized_language,
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

    return OCRExtractionResponse(**result)
