from __future__ import annotations

from typing import Iterator

import fitz
from PIL import Image


def render_pdf_pages(pdf_bytes: bytes) -> list[tuple[int, Image.Image]]:
    """Render each PDF page to a PIL image without saving files to disk."""
    document = fitz.open(stream=pdf_bytes, filetype='pdf')
    pages: list[tuple[int, Image.Image]] = []

    try:
        for page_number in range(document.page_count):
            page = document[page_number]
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = Image.frombytes('RGB', [pixmap.width, pixmap.height], pixmap.samples)
            pages.append((page_number + 1, image))
    finally:
        document.close()

    return pages
