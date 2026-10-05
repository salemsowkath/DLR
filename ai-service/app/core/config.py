from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = 'dlr-ai-service'
    app_env: str = 'development'
    app_port: int = 8000
    log_level: str = 'INFO'
    persistence_backend: str = 'memory'
    database_url: str | None = None
    postgres_host: str | None = None
    postgres_port: int = 5432
    postgres_db: str | None = None
    postgres_user: str | None = None
    postgres_password: str | None = None
    tesseract_cmd: str | None = None
    ocr_max_file_size_mb: int = 10
    ocr_default_language: str = 'eng'
    generated_root: str = 'generated'
    gis_projected_crs: str | None = None
    gis_default_crs: str | None = None

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    @property
    def ocr_max_file_size_bytes(self) -> int:
        return self.ocr_max_file_size_mb * 1024 * 1024


settings = Settings()
