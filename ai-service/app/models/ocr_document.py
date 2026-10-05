from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class BoundingBox:
    left: int = 0
    top: int = 0
    width: int = 0
    height: int = 0

    def as_dict(self) -> dict[str, int]:
        return {
            'left': self.left,
            'top': self.top,
            'width': self.width,
            'height': self.height,
        }


@dataclass
class OCRWord:
    text: str
    confidence: float
    page: int = 1
    bbox: BoundingBox = field(default_factory=BoundingBox)
    block_num: int | None = None
    par_num: int | None = None
    line_num: int | None = None
    word_num: int | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            'text': self.text,
            'confidence': self.confidence,
            'page': self.page,
            'bbox': self.bbox.as_dict(),
            'block_num': self.block_num,
            'par_num': self.par_num,
            'line_num': self.line_num,
            'word_num': self.word_num,
        }


@dataclass
class OCRPage:
    page_number: int
    width: int = 0
    height: int = 0
    words: list[OCRWord] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            'page_number': self.page_number,
            'width': self.width,
            'height': self.height,
            'words': [word.as_dict() for word in self.words],
        }


@dataclass
class OCRDocument:
    document_id: str
    pages: list[OCRPage] = field(default_factory=list)
    language: str = 'eng'

    def as_dict(self) -> dict[str, Any]:
        return {
            'document_id': self.document_id,
            'language': self.language,
            'pages': [page.as_dict() for page in self.pages],
        }
