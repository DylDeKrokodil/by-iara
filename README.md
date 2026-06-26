# By Iara

## Web

The frontend lives in the Nx Angular workspace at [by-iara-web](/Users/dylan/Developer/by-iara/by-iara-web).

Run the public website locally:

```bash
cd by-iara-web
pnpm nx serve website --port=4200
```

Run the admin dashboard locally:

```bash
cd by-iara-web
pnpm nx serve admin --port=4201
```

Validate the workspace:

```bash
cd by-iara-web
pnpm nx run-many -t lint,test,build --projects=theme,website,admin
```

## API

Run the API locally:

```bash
cd by-iara-api
./gradlew bootRun
```

Run the API with PostgreSQL in Docker:

```bash
docker compose up --build
```

Run it in the background:

```bash
docker compose up --build -d
```

Stop the stack:

```bash
docker compose down
```

Health check:

```bash
curl http://localhost:8080/health
```

Admin login:

```bash
curl -X POST http://localhost:8080/api/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@by-iara.local","password":"ChangeMe123!"}'
```

The login response returns a signed JWT:

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresInSeconds": 3600
}
```

Use it for protected admin routes:

```bash
curl http://localhost:8080/api/admin/auth/me \
  -H "Authorization: Bearer <jwt>"
```

The Docker database seeds a local admin user:

- Email: `admin@by-iara.local`
- Password: `ChangeMe123!`

## Bruno

Open the [bruno](/Users/dylan/Developer/by-iara/bruno) collection in Bruno and select the `Local` environment.
