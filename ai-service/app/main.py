from fastapi import FastAPI

from app.api.routes.documents import router as documents_router
from app.api.routes.extraction import router as extraction_router
from app.api.routes.gis import router as gis_router
from app.api.routes.health import router as health_router
from app.api.routes.ocr import router as ocr_router
from app.api.routes.review import router as review_router
from app.api.routes.validation import router as validation_router
from app.core.config import settings
from app.core.logging import configure_logging

configure_logging()

app = FastAPI(
    title='DLR AI Service',
    version='0.1.0',
    description='AI service for OCR, multilingual extraction, validation, and GIS foundation services.',
)

app.include_router(health_router)
app.include_router(ocr_router)
app.include_router(extraction_router)
app.include_router(documents_router)
app.include_router(validation_router)
app.include_router(review_router)
app.include_router(gis_router)


@app.get('/')
async def root() -> dict:
    return {
        'success': True,
        'service': settings.app_name,
        'status': 'ok',
        'environment': settings.app_env,
    }
