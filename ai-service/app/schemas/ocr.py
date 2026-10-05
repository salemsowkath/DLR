from pydantic import BaseModel, Field


class OCRPageResult(BaseModel):
    page_number: int = Field(..., ge=1)
    text: str
    confidence: float = Field(..., ge=0, le=100)


class OCRExtractionResponse(BaseModel):
    success: bool = True
    service: str
    operation: str = 'ocr'
    filename: str
    language: str
    document_type: str
    page_count: int = Field(..., ge=1)
    overall_confidence: float = Field(..., ge=0, le=100)
    pages: list[OCRPageResult]
