from __future__ import annotations

from typing import Any

from app.core.config import Settings, settings


class DatabaseConfigurationError(RuntimeError):
    pass


def connect_database(config: Settings = settings, connector: Any = None) -> Any:
    if config.persistence_backend.strip().lower() != 'postgres':
        raise DatabaseConfigurationError('PostgreSQL persistence is not enabled; set PERSISTENCE_BACKEND=postgres explicitly.')

    connection_parameters: dict[str, Any]
    if config.database_url:
        connection_parameters = {'conninfo': config.database_url}
    else:
        if not config.postgres_host or not config.postgres_db or not config.postgres_user:
            raise DatabaseConfigurationError('Configure DATABASE_URL or PostgreSQL host, database, and user settings.')
        connection_parameters = {
            'host': config.postgres_host,
            'port': config.postgres_port,
            'dbname': config.postgres_db,
            'user': config.postgres_user,
        }
        if config.postgres_password:
            connection_parameters['password'] = config.postgres_password

    if connector is None:
        try:
            import psycopg
        except ImportError as exc:
            raise DatabaseConfigurationError('PostgreSQL persistence requires the psycopg driver; install ai-service requirements.') from exc
        connector = psycopg.connect
    return connector(**connection_parameters)
