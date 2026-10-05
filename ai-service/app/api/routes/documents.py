from __future__ import annotations

import json
import os
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.config import settings
from app.services.document.document_service import document_service
from app.services.ocr.engine import OCRConfigError, OCRProcessingError, ocr_service
from app.services.translation.language_config import normalize_output_language

router = APIRouter(prefix='/api/v1/documents', tags=['documents'])
ALLOWED_MIME_TYPES = {
    'image/jpeg': 'image',
    'image/png': 'image',
    'application/pdf': 'pdf',
}
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf'}


class GenerateDocxRequest(BaseModel):
    language: str = 'en'


def sanitize_filename(filename: str | None) -> str:
    if not filename:
        return 'document'
    clean_name = os.path.basename(filename)
    clean_name = ''.join(
        character for character in clean_name if character.isalnum() or character in {'.', '_', '-', ' '}
    )
    return clean_name.strip() or 'document'


@router.post('/process')
async def process_document(
    file: UploadFile = File(...),
    language: str = Form(default=settings.ocr_default_language),
) -> dict:
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
            detail={'error': 'UNSUPPORTED_FILE_TYPE', 'message': 'Only JPG, JPEG, PNG, or PDF files are allowed.'},
        )

    max_size_bytes = settings.ocr_max_file_size_bytes
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={'error': 'FILE_TOO_LARGE', 'message': f'File exceeds the {settings.ocr_max_file_size_mb} MB limit.'},
        )

    try:
        ocr_result = ocr_service.extract_document_with_coordinates(
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

    document_id = uuid4().hex
    output = document_service.build_outputs(document_id, sanitized_name, ocr_result, language)
    extracted_fields = output['fields']
    average_confidence = 0.0
    values = [float(field.get('confidence', 0.0)) for field in extracted_fields.values() if isinstance(field, dict)]
    if values:
        average_confidence = sum(values) / len(values)

    return {
        'success': True,
        'document': {
            'document_id': document_id,
            'filename': sanitized_name,
            'pages': ocr_result.get('page_count', 0),
        },
        'ocr': {
            'language': ocr_result.get('language', language),
            'text': output['ocr_text'],
            'confidence': ocr_result.get('overall_confidence'),
            'average_confidence': round(average_confidence, 4),
        },
        'fields': extracted_fields,
        'outputs': {
            'docx': f'/api/v1/documents/{document_id}/word',
            'mapping_json': f'/api/v1/documents/{document_id}/mapping',
            'ocr_text': f'/api/v1/documents/{document_id}/ocr',
        },
        'verification': {
            'status': 'PENDING_OFFICER_VERIFICATION',
        },
    }


@router.post('/{document_id}/generate-docx')
async def generate_document_docx(document_id: str, request: GenerateDocxRequest) -> dict:
    try:
        output_language = normalize_output_language(request.language)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': 'UNSUPPORTED_LANGUAGE', 'message': str(exc)},
        ) from exc

    base_dir = Path(settings.generated_root).resolve()
    document_dir = (base_dir / document_id).resolve()
    if not str(document_dir).startswith(str(base_dir)):
        raise HTTPException(status_code=403, detail={'error': 'INVALID_PATH', 'message': 'Access denied.'})

    structured_path = document_dir / 'structured' / 'land_record.json'
    if not structured_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={'error': 'DOCUMENT_NOT_FOUND', 'message': 'Structured land record not found for this document.'},
        )

    structured_record = json.loads(structured_path.read_text(encoding='utf-8'))
    generated = document_service.generate_language_document(document_id, structured_record, output_language)
    return {
        'success': True,
        'document_id': document_id,
        'output_language': output_language,
        'docx': generated['docx'],
        'mapping_json': generated['mapping_json'],
    }


@router.get('/{document_id}/word')
async def get_document_word(document_id: str) -> FileResponse:
    base_dir = Path(settings.generated_root).resolve()
    target = (base_dir / document_id / 'land_record.docx').resolve()
    if not str(target).startswith(str(base_dir)):
        raise HTTPException(status_code=403, detail={'error': 'INVALID_PATH', 'message': 'Access denied.'})
    if not target.exists():
        raise HTTPException(status_code=404, detail={'error': 'DOCUMENT_NOT_FOUND', 'message': 'Document not found.'})
    return FileResponse(target)


@router.get('/{document_id}/mapping')
async def get_document_mapping(document_id: str, language: str | None = None) -> FileResponse:
    base_dir = Path(settings.generated_root).resolve()
    document_dir = (base_dir / document_id).resolve()
    if not str(document_dir).startswith(str(base_dir)):
        raise HTTPException(status_code=403, detail={'error': 'INVALID_PATH', 'message': 'Access denied.'})

    if language is not None:
        try:
            language = normalize_output_language(language)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={'error': 'UNSUPPORTED_LANGUAGE', 'message': str(exc)},
            ) from exc
        target = (document_dir / 'mappings' / f'mapping_{language}.json').resolve()
    else:
        target = (document_dir / 'land_record_mapping.json').resolve()

    if not target.exists():
        raise HTTPException(status_code=404, detail={'error': 'DOCUMENT_NOT_FOUND', 'message': 'Document not found.'})
    return FileResponse(target)


@router.get('/{document_id}/docx')
async def get_document_docx(document_id: str, language: str = 'en') -> FileResponse:
    base_dir = Path(settings.generated_root).resolve()
    document_dir = (base_dir / document_id).resolve()
    if not str(document_dir).startswith(str(base_dir)):
        raise HTTPException(status_code=403, detail={'error': 'INVALID_PATH', 'message': 'Access denied.'})

    try:
        output_language = normalize_output_language(language)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'error': 'UNSUPPORTED_LANGUAGE', 'message': str(exc)},
        ) from exc

    target = (document_dir / 'documents' / f'land_record_{output_language}.docx').resolve()
    if not target.exists():
        target = (document_dir / 'land_record.docx').resolve()
    if not target.exists():
        raise HTTPException(status_code=404, detail={'error': 'DOCUMENT_NOT_FOUND', 'message': 'Document not found.'})
    return FileResponse(target)


@router.get('/{document_id}/ocr')
async def get_document_ocr(document_id: str) -> FileResponse:
    base_dir = Path(settings.generated_root).resolve()
    target = (base_dir / document_id / 'extracted_text.txt').resolve()
    if not str(target).startswith(str(base_dir)):
        raise HTTPException(status_code=403, detail={'error': 'INVALID_PATH', 'message': 'Access denied.'})
    if not target.exists():
        raise HTTPException(status_code=404, detail={'error': 'DOCUMENT_NOT_FOUND', 'message': 'Document not found.'})
    return FileResponse(target)
