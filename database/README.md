# DLR PostgreSQL + PostGIS schema

This directory contains the reproducible Phase 3D schema and synthetic seed records. The schema targets PostgreSQL 16+ with PostGIS 3.x. Applying it requires an existing database and privileges to create the PostGIS extension; it does not start, install, or connect to a database server.

## Create and initialize

Create the database and a local role using your PostgreSQL administrator. Provide the password through your local environment, not source control. Then apply the schema and synthetic seed:

```powershell
createdb -U postgres dlr_database
psql -d dlr_database -v ON_ERROR_STOP=1 -f database/schema.sql
psql -d dlr_database -v ON_ERROR_STOP=1 -f database/seed.sql
```

The schema requests the PostGIS extension. The database role applying it must have permission to create that extension; otherwise ask the database administrator to enable PostGIS first.

Verify the extension and spatial index:

```sql
SELECT PostGIS_Full_Version();
SELECT indexname FROM pg_indexes WHERE tablename = 'gis_parcels' AND indexdef ILIKE '%USING gist%';
```

The AI service also has an opt-in live smoke test, documented in `ai-service/README.md`; the normal test suite skips it unless explicitly enabled.

`schema.sql` is safe to apply to an empty database and is idempotent for its tables, sequence, extension, and indexes. It is a bootstrap schema, not an incremental migration framework; future schema changes should be added as ordered migration scripts. Copy the service `.env.example` files to local `.env` files, replace `CHANGE_ME`, and set `PERSISTENCE_BACKEND=postgres` only after the database is initialized.

## CRS and area safety

`gis_parcels.geometry` uses flexible `geometry(Geometry)` storage with a separate required `srid` and a constraint that the geometry SRID matches it. The write repository requires an explicit positive SRID and assigns only that declared SRID; it never transforms coordinates. Area is nullable and is not computed in SQL. The GIS engine remains the authority for safe projected-CRS area calculations. Geographic-coordinate area is unavailable and must retain `AREA_REQUIRES_PROJECTED_CRS`.

The seed data contains synthetic names and survey information only. User contact references are modeled as `email_hash` and `phone_token`; no Aadhaar field exists.
