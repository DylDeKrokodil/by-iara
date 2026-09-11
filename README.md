# Iara Gouveia

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

Run the admin dashboard in Docker with hot reload:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile web up --build admin
```

Open [http://localhost:4201](http://localhost:4201). The admin container runs the Angular dev server with the local frontend mounted into the container, so frontend changes update without rebuilding the Docker frontend image.

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

## Production deployment

The single-server production stack for a Hetzner CX33-class host is defined in
`docker-compose.production.yml`. It includes Caddy-managed HTTPS, private
application/database networking, resource limits, log rotation, PostgreSQL
backups, and first-run admin provisioning.

See [deploy/hetzner/README.md](deploy/hetzner/README.md) for DNS, server setup,
deployment, backup, and scaling instructions.

## Automatic promotions

Automatic promotions can allow unlimited uses or one use per customer. “First-time
customers only” is a separate eligibility rule: the booking email must have no
completed appointments. Both checks use the existing discount email identity,
including its alias normalization. A pending or confirmed single-use booking
reserves the offer; cancellation or rejection releases it, while completion (or
the existing no-show policy) consumes it.

The booking flow previews eligible pricing after email entry and submits
`expectedPriceCents`. The API rechecks pricing in the booking transaction and
returns `409` with code `PRICE_CHANGED` when review is needed. Automatic promotions
can use the shared website banner without a code. Existing automatic campaigns
migrate to unlimited use with no first-time restriction.
