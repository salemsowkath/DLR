from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

AI_SERVICE_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = AI_SERVICE_ROOT.parent


class Settings(BaseSettings):
    app_name: str = 'dlr-ai-service'
    app_env: str = 'development'
    app_port: int = 8000
    log_level: str = 'INFO'
    persistence_backend: str = 'mysql'
    db_host: str | None = None
    db_port: int = 3306
    db_name: str | None = None
    db_user: str | None = None
    db_password: str | None = None
    tesseract_cmd: str | None = None
    ocr_max_file_size_mb: int = 10
    ocr_default_language: str = 'eng'
    generated_root: str = 'generated'
    gis_projected_crs: str | None = None
    gis_default_crs: str | None = None

    model_config = SettingsConfigDict(
        env_file=(str(PROJECT_ROOT / '.env'), str(AI_SERVICE_ROOT / '.env')),
        env_file_encoding='utf-8',
        extra='ignore',
    )

    @property
    def ocr_max_file_size_bytes(self) -> int:
        return self.ocr_max_file_size_mb * 1024 * 1024


settings = Settings()
