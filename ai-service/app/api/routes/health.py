from fastapi import APIRouter

router = APIRouter(tags=['health'])


@router.get('/health')
async def health_check() -> dict:
    return {
        'success': True,
        'service': 'dlr-ai-service',
        'status': 'ok',
        'version': '0.1.0',
    }
