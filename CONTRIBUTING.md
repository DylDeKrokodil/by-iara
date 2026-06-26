# Contributing

## Branching model

Three tiers — code is created at the bottom and promoted upward. Branches are
cut from the tier above.

```
feature/* ──PR──▶ release ──PR──▶ main
 (local dev)      (testing)       (production)
```

| Branch       | Environment | Deploys to                |
| ------------ | ----------- | ------------------------- |
| `main`       | production  | by-iara.com / api / admin |
| `release`    | testing     | staging                   |
| `feature/*`  | local dev   | your machine              |

### Day-to-day flow

1. Branch off `release`:
   ```bash
   git switch release && git pull
   git switch -c feat/admin-reservations
   ```
2. Build locally (`docker compose --profile web up` or `pnpm nx serve admin`).
3. Open a PR into **`release`**. CI must pass. **Squash-merge**, then delete the
   branch. The PR title becomes the single commit on `release`.
4. When `release` is verified, open a PR `release` → **`main`**. Merge this one
   with a **regular merge commit (not squash)** so `main` and `release` stay in
   sync and keep merging cleanly.

### Branch names

`type/short-description`, lowercase, hyphenated:

```
feat/admin-reservations
fix/ssr-host-header
chore/ci-pipeline
refactor/admin-layout
docs/api-overview
```

### Hotfixes

For an urgent production bug:

1. Branch off `main`: `git switch -c fix/<bug> main`
2. PR into `main`, merge, deploy.
3. Merge `main` back into `release` so the fix isn't lost on the next promotion.

## Commit messages

Short, imperative titles (`Add admin login flow`). Keep the subject focused;
the squash-merge uses the PR title.

## CI

Every PR runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

- **web** — `pnpm nx run-many -t lint test build` for theme, website, admin
- **api** — `./gradlew test`

Both must pass before merge. Run them locally first:

```bash
cd by-iara-web && pnpm nx run-many -t lint test build --projects=theme,website,admin
cd by-iara-api && ./gradlew test
```
