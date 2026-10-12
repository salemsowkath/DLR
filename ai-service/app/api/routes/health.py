from fastapi import APIRouter, HTTPException

from app.core.database import connect_database

router = APIRouter(tags=['health'])


@router.get('/health')
async def health_check() -> dict:
    try:
        with connect_database() as connection:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1 AS healthy')
                row = cursor.fetchone()
                if not row or row.get('healthy') != 1:
                    raise RuntimeError('MySQL health query returned an unexpected result.')
    except Exception as exc:
        raise HTTPException(status_code=503, detail='MySQL persistence is unavailable.') from exc

    return {
        'success': True,
        'service': 'dlr-ai-service',
        'status': 'ok',
        'database': 'ok',
        'version': '0.1.0',
    }
