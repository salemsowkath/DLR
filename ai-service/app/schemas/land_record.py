from typing import Any

from pydantic import BaseModel, Field


class FieldExtractionResult(BaseModel):
    value: str | None = None
    confidence: float = Field(default=0.0, ge=0, le=1)
    source_text: str | None = None
    method: str = 'rule'


class LandRecordExtractionRequest(BaseModel):
    text: str
    language: str = 'eng'


class LandRecordExtractionResponse(BaseModel):
    success: bool = True
    language: str
    extracted_fields: dict[str, dict[str, Any]]
    text_length: int = 0
