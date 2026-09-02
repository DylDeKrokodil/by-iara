# Deploying `release` to Hetzner

The current Hetzner server deploys the `release` branch from
`/opt/iara-gouveia`. The repository is owned by the `deploy` user, while Docker
commands can be run by the `deploy` user through its Docker group membership.

## Automatic deployments

Every push to `release` runs the web and API jobs in GitHub Actions. After both
jobs pass, the `deploy-release` job connects with a restricted SSH key and asks
the server to deploy that exact commit. The server-side command is installed at
`/usr/local/sbin/deploy-by-iara-release`; its versioned source is
`deploy/hetzner/deploy-release.sh`.

The GitHub `release` environment contains:

- variables `HETZNER_HOST` and `HETZNER_DEPLOY_USER`;
- secrets `HETZNER_SSH_PRIVATE_KEY` and `HETZNER_SSH_KNOWN_HOSTS`.

The SSH key is restricted in `~deploy/.ssh/authorized_keys` so it cannot open an
interactive shell or run arbitrary commands. Deployments use a lock, refuse a
dirty checkout, verify that the requested commit belongs to `origin/release`,
validate Compose, rebuild the stack, and check the public website and API.
It also validates the mounted Caddyfile and restarts Caddy so proxy or redirect
changes take effect even when Compose reuses the existing container.

Use the manual procedure below if GitHub Actions is unavailable or an operator
needs to inspect the server before deploying.

> The repository branching guide describes `main` as production. If the server
> is moved to `main` later, replace `release` with `main` in the Git commands
> below. Do not deploy an unmerged feature branch.

## 1. Confirm the release is ready

Before connecting to the server:

1. Merge the feature pull request into `release`.
2. Confirm the pull request's `web` and `api` CI checks passed.
3. Copy the short commit SHA from the latest `release` commit so you can verify
   that the same revision reaches the server.

## 2. Connect and inspect the server

```bash
ssh root@iaragouveia.com
cd /opt/iara-gouveia

sudo -u deploy git status --short
sudo -u deploy git branch --show-current
sudo -u deploy git rev-parse --short HEAD
```

Stop if `git status --short` prints anything. Those server-side changes need to
be understood and preserved before deployment.

## 3. Update the checked-out release

Run Git as `deploy` so files remain owned by the deployment account:

```bash
sudo -u deploy git fetch origin release
sudo -u deploy git switch release
sudo -u deploy git pull --ff-only origin release
sudo -u deploy git rev-parse --short HEAD
```

Confirm the final SHA matches the reviewed `release` commit.

## 4. Validate and deploy

Keep `.env.production` private. Validate it without printing its resolved
values, then rebuild and restart the stack:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  config --quiet

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d --build --remove-orphans
```

Compose recreates only services whose image or configuration changed. Database
and media volumes are retained.

## 5. Verify the deployment

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  ps

curl --fail --silent --show-error https://iaragouveia.com/robots.txt
curl --fail --silent --show-error https://api.iaragouveia.com/health
```

Every long-running service should report `healthy`. Also open the public site
and admin dashboard in a browser and verify the changed workflow.

If a service is unhealthy, inspect recent logs:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  logs --tail=200 website admin api caddy
```

## Roll back

Use the previously recorded good commit SHA. Rolling back application code does
not automatically reverse database migrations, so inspect migration changes
before proceeding.

```bash
sudo -u deploy git switch --detach PREVIOUS_GOOD_SHA

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d --build --remove-orphans
```

After the issue is corrected, return to the tracked branch and redeploy:

```bash
sudo -u deploy git switch release
sudo -u deploy git pull --ff-only origin release
```
