from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator
from app.core.config import Settings, settings


class DatabaseConfigurationError(RuntimeError):
    pass


def connect_database(config: Settings = settings, connector: Any = None) -> Any:
    backend = config.persistence_backend.strip().lower()
    if backend != 'mysql':
        raise DatabaseConfigurationError('PERSISTENCE_BACKEND must be mysql.')

    connection_parameters: dict[str, Any]
    if not config.db_host or not config.db_name or not config.db_user or not config.db_password:
        raise DatabaseConfigurationError('Configure DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD settings.')
    connection_parameters = {
        'host': config.db_host,
        'port': config.db_port,
        'database': config.db_name,
        'user': config.db_user,
        'password': config.db_password,
    }

    if connector is None:
        try:
            import mysql.connector
        except ImportError as exc:
            raise DatabaseConfigurationError('MySQL persistence requires mysql-connector-python; install ai-service requirements.') from exc
        connector = mysql.connector.connect
    return MySQLConnection(connector(**connection_parameters))


class MySQLConnection:
    def __init__(self, connection: Any) -> None:
        self.connection = connection

    def __enter__(self) -> 'MySQLConnection':
        return self

    def __exit__(self, exc_type: Any, exc_value: Any, traceback: Any) -> None:
        self.connection.close()

    @contextmanager
    def transaction(self) -> Iterator[None]:
        self.connection.start_transaction()
        try:
            yield
        except Exception:
            self.connection.rollback()
            raise
        else:
            self.connection.commit()

    def cursor(self) -> Any:
        return self.connection.cursor(dictionary=True)
