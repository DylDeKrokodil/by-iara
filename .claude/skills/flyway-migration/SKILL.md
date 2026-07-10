---
name: flyway-migration
description: Scaffold a new Flyway migration for by-iara-api following the project's versioning and SQL style conventions. Use when adding or changing database schema (new tables, columns, indexes, constraints).
---

# Flyway Migration

Creates a new versioned migration under `by-iara-api/src/main/resources/db/migration/`.

## Steps

1. Find the current highest version:
   ```bash
   ls by-iara-api/src/main/resources/db/migration/ | sort -V | tail -1
   ```
2. Create `V{next number, 3-digit zero-padded}__{snake_case_description}.sql` — e.g. `V009__add_reservation_notes_index.sql`.
3. Match the existing SQL conventions (see any file in that directory):
   - lowercase SQL keywords
   - `id uuid primary key default gen_random_uuid()`
   - `created_at` / `updated_at` as `timestamp with time zone not null default now()`
   - named constraints: `constraint <table>_<check_name> check (...)`
   - indexes named `idx_<table>_<column>`
4. This project uses jOOQ's runtime DSL (`DSL.table(name(...))`, `DSL.field(name(...))`) — there's no codegen step to run after a migration. If the migration adds columns a repository needs to read, add matching `field(name("..."))` constants in the relevant `Jooq*Repository.kt` in `by-iara-api/src/main/kotlin/com/byiara/api/*/infrastructure/persistence/`.
5. Never edit a migration file that's already committed to `main` — Flyway checksums applied migrations, so changing one breaks every environment that already ran it. Always add a new migration instead.
6. The migration applies automatically the next time the API starts against the docker-compose Postgres instance.
