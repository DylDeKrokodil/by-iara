# Hetzner production deployment

This deployment runs the public Angular SSR site, static Angular admin, Spring
Boot API, PostgreSQL, Caddy, and daily database backups on one CX33-class host.
Only ports 80 and 443 are published by Docker. PostgreSQL and application ports
remain private.

## 1. Provision the server

Create an Ubuntu 24.04 server in a nearby Hetzner EU region with:

- an SSH key (disable password SSH after verifying key access);
- a Hetzner firewall allowing TCP `22`, `80`, and `443`, plus UDP `443`;
- Hetzner backups enabled as an additional whole-server recovery layer;
- at least a CX33-class instance for comfortable build and runtime headroom.

Install Docker Engine and the Compose plugin using Docker's official Ubuntu
instructions. Add the deployment user to the `docker` group, then reconnect.

## 2. Configure DNS

Point these records at the server's public IP:

| Type | Name | Target |
| --- | --- | --- |
| A/AAAA | `@` | server IP |
| CNAME | `www` | `iaragouveia.com` |
| CNAME | `admin` | `iaragouveia.com` |
| CNAME | `api` | `iaragouveia.com` |

If Cloudflare proxying is enabled, use SSL/TLS mode **Full (strict)**. Caddy
obtains and renews the origin certificates automatically after DNS resolves.

Email MX, SPF, DKIM, and DMARC records are independent of these web records and
must be copied from the chosen mailbox and transactional-email providers.

## 3. Configure the application

Clone the repository on the server and create the private environment file:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
mkdir -p backups
chmod 700 backups
```

Generate independent secrets:

```bash
openssl rand -base64 36
openssl rand -base64 48
```

Use the results for `POSTGRES_PASSWORD` and `ADMIN_JWT_SECRET`, then replace all
remaining `CHANGE_ME` values. The mailbox password is not used here: `MAIL_*`
should contain credentials from the transactional provider such as Resend.

Uploaded media is stored in the `service_media` Docker volume mounted at
`/app/data/media`. This uses the server's existing disk and requires no separate
storage product. Keep Hetzner server backups enabled and periodically copy the
media volume off the server, because losing the server disk would otherwise
also lose the uploaded images.

The application also supports S3-compatible storage if it is needed later.
Switch `MEDIA_STORAGE_PROVIDER` to `s3` and configure the `MEDIA_S3_*` variables
before deploying that change.

Validate the resolved Compose model without exposing its output in logs:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
```

## 4. First deployment

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100
```

Visit `https://admin.iaragouveia.com`, sign in with `INITIAL_ADMIN_EMAIL` and
`INITIAL_ADMIN_PASSWORD`, and verify the public website and a test email.

After the first successful sign-in, edit `.env.production`:

```dotenv
INITIAL_ADMIN_ENABLED=false
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=
```

Apply that change with:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

The account stays in PostgreSQL, but the bootstrap password no longer remains in
the deployment environment or gets reapplied on every API restart.

## 5. Backups and restore drill

The backup container immediately creates a custom-format PostgreSQL dump and then
repeats every 24 hours. Local dumps are retained for 14 days by default:

```bash
ls -lh backups/
```

Server snapshots are not a substitute for an off-server database backup. Copy
`backups/` to encrypted object storage or another host daily. Regularly test a
restore into a separate database:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres \
  createdb -U by_iara by_iara_restore_test
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres \
  pg_restore -U by_iara -d by_iara_restore_test --clean --if-exists \
  /tmp/backup.dump
```

Copy the selected dump into the PostgreSQL container at `/tmp/backup.dump` before
the second command. Drop the test database after verifying its tables and row
counts.

## Routine deploys

Pull an explicitly reviewed revision, rebuild, and inspect health:

```bash
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Docker JSON logs rotate at 10 MB with three files per service. Use:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs -f --tail=100
```

## Scaling path

This layout keeps the edge and database networks separate so services can be
split later without changing public URLs. The first scaling step should be moving
PostgreSQL to a managed service with point-in-time recovery. Before scaling the
API across multiple servers, move media to the existing S3-compatible storage
adapter so every API instance has access to the same files.
