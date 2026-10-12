# DLR MySQL 8.4 database

DLR uses the locally installed MySQL 8.4 Windows service:

- Service: `MySQL84`
- Host: `localhost`
- Port: `3306`
- Database: `dlr_database`

Docker, PostgreSQL, PostGIS, and SQLite are not part of the DLR runtime.

## Create and initialize

Start MySQL and apply the idempotent schema and role-only seed:

```powershell
net start MySQL84
Get-Content database/mysql_schema.sql -Raw | mysql -u root -p
Get-Content database/mysql_seed.sql -Raw | mysql -u root -p dlr_database
```

`mysql_schema.sql` uses `CREATE DATABASE IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS`. It does not drop, truncate, or delete application data. `mysql_seed.sql` only upserts the five role definitions; citizens, documents, land records, and identity records are created through application workflows.

## Verify

```sql
USE dlr_database;
SELECT DATABASE();
SELECT id, role_name FROM roles ORDER BY role_name;
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS land_records_count FROM land_records;
SELECT COUNT(*) AS documents_count FROM documents;
```

## Spatial data

GIS parcels use MySQL `GEOMETRY` storage with an explicit SRID column. The application requires a positive SRID and uses MySQL spatial functions for GeoJSON conversion and validity checks. Coordinate transformation and projected-CRS area calculations remain application responsibilities.
