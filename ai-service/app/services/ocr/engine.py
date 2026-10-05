from __future__ import annotations

import os
import shutil
from io import BytesIO
from statistics import mean
from typing import Any

import pytesseract
from PIL import Image
from pytesseract import Output

from app.core.config import settings
from app.services.ocr.languages import normalize_language
from app.services.ocr.pdf import render_pdf_pages
from app.services.ocr.preprocessing import preprocess_image


class OCRConfigError(RuntimeError):
    """Raised when the OCR runtime is not configured correctly."""


class OCRProcessingError(RuntimeError):
    """Raised when OCR fails for a valid document."""


class OCRService:
    WINDOWS_CANDIDATES = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    ]

    @staticmethod
    def resolve_tesseract_cmd() -> str:
        configured = os.getenv('TESSERACT_CMD', '').strip()
        if configured:
            if os.path.exists(configured):
                return configured
            raise OCRConfigError(
                f'Tesseract executable configured at {configured!r} does not exist. '
                'Update TESSERACT_CMD or install Tesseract OCR.'
            )

        resolved = shutil.which('tesseract')
        if resolved:
            return resolved

        for candidate in OCRService.WINDOWS_CANDIDATES:
            if os.path.exists(candidate):
                return candidate

        raise OCRConfigError(
            'Tesseract OCR executable not found. Set TESSERACT_CMD or install Tesseract OCR ' 
            'and verify it is on PATH.'
        )

    def __init__(self, app_settings: Any) -> None:
        self.settings = app_settings
        try:
            self.tesseract_cmd = self.resolve_tesseract_cmd()
        except OCRConfigError:
            self.tesseract_cmd = None
        if self.tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd

    def _ensure_tesseract(self) -> None:
        if self.tesseract_cmd is None:
            self.tesseract_cmd = self.resolve_tesseract_cmd()
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd

    def _ocr_single_image(self, image: Image.Image, language: str) -> dict[str, Any]:
        self._ensure_tesseract()
        processed = preprocess_image(image)
        config = f'--psm 6 --oem 3 -l {language}'
        data = pytesseract.image_to_data(processed, config=config, output_type=Output.DICT)

        words: list[dict[str, Any]] = []
        lines: dict[tuple[int, int, int], list[dict[str, Any]]] = {}
        valid_confidences: list[float] = []

        for index, token in enumerate(data.get('text', [])):
            text = str(token).strip()
            if not text:
                continue

            confidence_raw = data.get('conf', [])[index] if index < len(data.get('conf', [])) else ''
            try:
                confidence = float(confidence_raw)
            except (TypeError, ValueError):
                confidence = 0.0

            if confidence < 0:
                confidence = 0.0
            valid_confidences.append(confidence)

            word = {
                'text': text,
                'confidence': round(confidence, 2),
                'bbox': {
                    'left': int(data.get('left', [0])[index]) if index < len(data.get('left', [])) else 0,
                    'top': int(data.get('top', [0])[index]) if index < len(data.get('top', [])) else 0,
                    'width': int(data.get('width', [0])[index]) if index < len(data.get('width', [])) else 0,
                    'height': int(data.get('height', [0])[index]) if index < len(data.get('height', [])) else 0,
                },
                'block_num': int(data.get('block_num', [0])[index]) if index < len(data.get('block_num', [])) else 0,
                'par_num': int(data.get('par_num', [0])[index]) if index < len(data.get('par_num', [])) else 0,
                'line_num': int(data.get('line_num', [0])[index]) if index < len(data.get('line_num', [])) else 0,
                'word_num': int(data.get('word_num', [0])[index]) if index < len(data.get('word_num', [])) else 0,
            }
            words.append(word)
            key = (word['block_num'], word['par_num'], word['line_num'])
            lines.setdefault(key, []).append(word)

        ordered_lines = []
        for key in sorted(lines.keys()):
            ordered_words = sorted(lines[key], key=lambda item: item['word_num'])
            ordered_lines.append(' '.join(word['text'] for word in ordered_words))

        page_text = '\n'.join(ordered_lines).strip()
        page_confidence = round(mean(valid_confidences), 2) if valid_confidences else 0.0

        return {
            'text': page_text,
            'confidence': page_confidence,
            'width': processed.width,
            'height': processed.height,
            'words': words,
        }

    def extract_document(
        self,
        file_bytes: bytes,
        *,
        filename: str,
        language: str,
        document_type: str,
    ) -> dict[str, Any]:
        result = self.extract_document_with_coordinates(
            file_bytes,
            filename=filename,
            language=language,
            document_type=document_type,
        )
        for page in result['pages']:
            page.pop('words', None)
        return result

    def extract_document_with_coordinates(
        self,
        file_bytes: bytes,
        *,
        filename: str,
        language: str,
        document_type: str,
    ) -> dict[str, Any]:
        normalized_language = normalize_language(language, self.settings.ocr_default_language)

        if document_type == 'pdf':
            pages: list[dict[str, Any]] = []
            try:
                rendered_pages = render_pdf_pages(file_bytes)
            except Exception as exc:  # pragma: no cover - integration boundary
                raise OCRProcessingError('PDF processing failed.') from exc

            for page_number, image in rendered_pages:
                page_result = self._ocr_single_image(image, normalized_language)
                pages.append({
                    'page_number': page_number,
                    'text': page_result['text'],
                    'confidence': page_result['confidence'],
                    'width': page_result['width'],
                    'height': page_result['height'],
                    'words': page_result['words'],
                })

            if not pages:
                raise OCRProcessingError('No pages were extracted from the PDF.')

            overall_confidence = round(mean(page['confidence'] for page in pages), 2) if pages else 0.0
            return {
                'success': True,
                'service': self.settings.app_name,
                'operation': 'ocr',
                'filename': filename,
                'language': normalized_language,
                'document_type': 'pdf',
                'page_count': len(pages),
                'overall_confidence': overall_confidence,
                'pages': pages,
            }

        try:
            image = Image.open(BytesIO(file_bytes))
            image.load()
        except Exception as exc:  # pragma: no cover - integration boundary
            raise OCRProcessingError('Image could not be decoded.') from exc

        page_result = self._ocr_single_image(image, normalized_language)
        response = {
            'success': True,
            'service': self.settings.app_name,
            'operation': 'ocr',
            'filename': filename,
            'language': normalized_language,
            'document_type': 'image',
            'page_count': 1,
            'overall_confidence': page_result['confidence'],
            'pages': [{
                'page_number': 1,
                'text': page_result['text'],
                'confidence': page_result['confidence'],
                'width': page_result['width'],
                'height': page_result['height'],
                'words': page_result['words'],
            }],
        }
        return response


ocr_service = OCRService(settings)
