#!/usr/bin/env bash

set -Eeuo pipefail
umask 027

readonly REPOSITORY_DIR='/opt/iara-gouveia'
readonly ENV_FILE='.env.production'
readonly COMPOSE_FILE='docker-compose.production.yml'
readonly LOCK_FILE='/tmp/by-iara-release-deploy.lock'

requested_sha="${SSH_ORIGINAL_COMMAND:-${1:-}}"
if [[ ! "$requested_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Expected one full Git commit SHA.' >&2
  exit 64
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo 'Another release deployment is already running.' >&2
  exit 75
fi

cd "$REPOSITORY_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Deployment stopped because the server checkout has local changes.' >&2
  exit 1
fi

git fetch --prune origin release

if ! git cat-file -e "${requested_sha}^{commit}" 2>/dev/null; then
  echo 'The requested commit is not available from origin.' >&2
  exit 1
fi

if ! git merge-base --is-ancestor "$requested_sha" origin/release; then
  echo 'The requested commit does not belong to the release branch.' >&2
  exit 1
fi

git switch release
git merge --ff-only "$requested_sha"

if [[ "$(git rev-parse HEAD)" != "$requested_sha" ]]; then
  echo 'The release checkout did not reach the requested commit.' >&2
  exit 1
fi

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  config --quiet

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d --build --remove-orphans

wait_for_url() {
  local name="$1"
  local url="$2"

  for _attempt in {1..30}; do
    if curl --fail --silent --show-error --output /dev/null "$url"; then
      echo "$name is healthy."
      return 0
    fi
    sleep 5
  done

  echo "$name did not become healthy in time." >&2
  return 1
}

wait_for_url 'Public website' 'https://iaragouveia.com/robots.txt'
wait_for_url 'API' 'https://api.iaragouveia.com/health'

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  ps

echo "Release ${requested_sha:0:7} deployed successfully."
