# By Iara — Project Overview

> AI-oriented reference for the structure, stack, and conventions of this repository.
> For the product roadmap and domain plan, see [`PROJECT_PLAN.md`](../PROJECT_PLAN.md).

## 1. What this is

By Iara is a **booking platform for a massage business**. The MVP supports
browsing massage services, checking service area / availability, submitting
reservation requests, and letting admins manage reservations and business
settings.

It targets three deployment domains:

| Domain               | Surface          | Lives in        |
| -------------------- | ---------------- | --------------- |
| `by-iara.com`        | Public website   | `by-iara-web`   |
| `admin.by-iara.com`  | Admin dashboard  | `by-iara-web`   |
| `api.by-iara.com`    | Backend REST API | `by-iara-api`   |

## 2. Repository layout

```text
by-iara/
├── by-iara-web/          # Nx workspace — Angular frontends (website + admin)
├── by-iara-api/          # Spring Boot (Kotlin) REST API
├── bruno/                # Bruno HTTP collection for hitting the API
├── docker-compose.yml    # Postgres + API stack for local dev
├── PROJECT_PLAN.md       # Product/domain roadmap and design principles
├── README.md             # Quickstart commands
└── docs/                 # This documentation
```

The two main apps are independent codebases living side by side in one git repo
(monorepo by colocation, not by a shared build tool).

## 3. Backend — `by-iara-api`

A Spring Boot 4 service written in Kotlin, organised by **domain modules** with
a clean-architecture-style layering inside each module.

### Stack

- **Kotlin 2.3** on **Java 21** (toolchain pinned in `build.gradle.kts`)
- **Spring Boot 4.1** — Web MVC, Security, OAuth2 Resource Server, Actuator, Validation
- **jOOQ** for typed SQL access (no JPA/Hibernate)
- **Flyway** for database migrations
- **PostgreSQL 16** in production/dev; **H2** for tests
- **Gradle** (Kotlin DSL) with the wrapper (`./gradlew`)

### Package structure

Base package: `com.byiara.api`. Each domain module is split into the same layers:

```text
src/main/kotlin/com/byiara/api/
├── ByIaraApiApplication.kt        # Spring Boot entry point
├── auth/                          # Admin authentication domain
│   ├── api/                       # Controllers + request/response DTOs
│   │   ├── AdminAuthController.kt  # POST /login, GET /me
│   │   └── AuthExceptionHandler.kt# Maps domain errors -> HTTP responses
│   ├── application/               # Use cases / services
│   │   ├── AdminAuthService.kt     # Login orchestration
│   │   ├── AdminTokenIssuer.kt     # Issues signed JWTs
│   │   ├── PasswordVerifier.kt
│   ├── config/                    # Spring @Configuration beans
│   │   ├── SecurityConfig.kt       # Filter chain + route authorization
│   │   ├── JwtConfig.kt            # JWT encoder/decoder
│   │   ├── PasswordConfig.kt        # BCrypt encoder
│   │   └── AdminAuthProperties.kt   # Binds `by-iara.auth.*` props
│   ├── domain/                    # Pure domain model (no framework deps)
│   │   ├── AdminCredentials.kt, AdminIdentity.kt, AdminRole, ...
│   │   ├── AdminCredentialsRepository.kt  # Repository interface (port)
│   │   └── InvalidCredentialsException.kt
│   └── infrastructure/persistence/
│       └── JooqAdminCredentialsRepository.kt  # jOOQ adapter
└── health/                        # Health-check domain (same api/application/domain split)
    └── api/HealthController.kt     # GET /health
```

**Convention to follow when adding domains** (e.g. `reservation`, `massage`,
`customer`, `availability`): create a new package under `com.byiara.api` with the
same `api` / `application` / `domain` / `infrastructure` layering. Domain code
must not depend on Spring; infrastructure adapters implement the domain's
repository interfaces.

### Database & migrations

- Migrations live in `src/main/resources/db/migration/` and are named
  `V###__description.sql` (Flyway). Run automatically on startup.
- `V001__create_admin_users.sql` creates the `admin_users` table and seeds a
  local admin. **Every schema change must be a new migration** — never edit an
  applied one.

### Endpoints (current)

| Method | Path                     | Auth          | Purpose                         |
| ------ | ------------------------ | ------------- | ------------------------------- |
| GET    | `/health`                | public        | Liveness, returns `{status:UP}` |
| POST   | `/api/admin/auth/login`  | public        | Exchange credentials for a JWT  |
| GET    | `/api/admin/auth/me`     | Bearer (JWT)  | Current admin identity          |

Security rules (`SecurityConfig.kt`): stateless, CSRF disabled, `/health` and
the login route are public, everything under `/api/admin/**` requires a valid
JWT, and any other request is denied. Auth uses the OAuth2 resource-server with
self-issued HS256 JWTs containing `email` and `role` claims.

### Configuration

`application.properties` reads everything from environment variables with local
defaults:

| Env var                  | Default                          | Purpose                |
| ------------------------ | -------------------------------- | ---------------------- |
| `DATABASE_URL`           | `jdbc:postgresql://localhost:5432/by_iara` | JDBC URL     |
| `DATABASE_USERNAME`      | `by_iara`                        | DB user                |
| `DATABASE_PASSWORD`      | `by_iara`                        | DB password            |
| `ADMIN_TOKEN_TTL_SECONDS`| `3600`                           | JWT lifetime           |
| `ADMIN_JWT_ISSUER`       | `by-iara-api`                    | JWT `iss` claim        |
| `ADMIN_JWT_SECRET`       | local dev secret (≥32 bytes)     | HS256 signing key      |

### Running the API

```bash
cd by-iara-api
./gradlew bootRun        # needs a Postgres on localhost:5432
./gradlew test           # run tests (uses H2)
./gradlew bootJar        # build runnable jar
```

Seeded local admin: `admin@by-iara.local` / `ChangeMe123!`.

## 4. Frontend — `by-iara-web`

An **Nx 23 workspace** containing two standalone **Angular 21** applications that
share a theme library. Uses **pnpm** and **vitest** (unit) + **Playwright** (e2e).

### Workspace structure

```text
by-iara-web/
├── apps/
│   ├── website/        # Public site — Angular with SSR (server.ts, main.server.ts)
│   ├── website-e2e/    # Playwright e2e for website
│   ├── admin/          # Admin dashboard — Angular SPA (client-only)
│   └── admin-e2e/      # Playwright e2e for admin
├── libs/
│   └── shared/
│       └── theme/      # Shared CSS theme library (imported by both apps)
├── nx.json             # Nx targets, plugins, generators
├── package.json        # Dependencies (Angular 21, Nx 23)
└── pnpm-workspace.yaml
```

Key differences between the two apps:

- **website** is server-rendered (SSR via `@angular/ssr` + Express). Build
  `outputMode: server`.
- **admin** is a plain client-side SPA.
- Both apply the prefix `byiara`, pull in `libs/shared/theme/src/styles/theme.css`,
  and declare an `implicitDependency` on the `theme` lib.
- Nx tags scope the projects: website = `scope:public`, admin = `scope:admin`.

Routes (`apps/*/src/app/app.routes.ts`) are currently empty — the apps are
scaffolded and ready for feature routes.

### Running the frontends

```bash
cd by-iara-web
pnpm nx serve website --port=4200    # public site
pnpm nx serve admin   --port=4201    # admin dashboard

# Validate everything
pnpm nx run-many -t lint,test,build --projects=theme,website,admin
```

## 5. Local development with Docker

`docker-compose.yml` brings up Postgres + the API together:

```bash
docker compose up --build        # foreground
docker compose up --build -d     # background
docker compose down              # stop
```

- `postgres` — Postgres 16 with a healthcheck and a named volume for data.
- `api` — built from `by-iara-api/Dockerfile` (multi-stage: Gradle build →
  JRE runtime), waits for Postgres to be healthy, exposes `:8080`.

Health check once up: `curl http://localhost:8080/health`.

## 6. API testing — `bruno/`

A [Bruno](https://www.usebruno.com/) collection with three requests: `Health`,
`Admin Login` (saves the returned `accessToken` to an env var), and `Admin Me`
(uses that token). Open the collection in Bruno and select the **Local**
environment (`bruno/environments/Local.bru`).

## 7. Conventions cheat-sheet (for AI edits)

- **Backend domains** follow `api` / `application` / `domain` / `infrastructure`
  layering; keep `domain` framework-free and access the DB through jOOQ adapters
  that implement domain repository interfaces.
- **DB changes** are always new Flyway `V###__*.sql` migrations.
- **Public vs admin** API surfaces are separated by route (`/api/admin/**`),
  authorization, validation, and response models — keep them distinct.
- **Frontend** apps are separate Angular projects; shared UI/theme goes in
  `libs/shared/`. Use Nx targets (`serve`, `build`, `lint`, `test`, `e2e`).
- **Secrets/config** come from environment variables with safe local defaults.
- Prefer small, well-structured modules over premature abstraction
  (see `PROJECT_PLAN.md` §2).
```
