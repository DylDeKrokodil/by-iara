---
name: new-shared-component
description: Scaffold a new component in by-iara-web's shared/ui library, matching this repo's conventions (external css/html files, standalone, signal-based inputs/outputs, byiara- selector prefix, spec test, barrel export). Use when creating a reusable UI component, especially while migrating admin screens onto shared components.
---

# New Shared Component

Scaffolds a component under `libs/shared/ui/src/lib/<name>/` for by-iara-web.

## Steps

1. Generate via the Nx Angular generator (already defaults to standalone, external css/html, no `Component` suffix, and a spec file — no extra flags needed beyond the prefix):
   ```bash
   cd by-iara-web && npx nx g @nx/angular:component libs/shared/ui/src/lib/<name>/<name> --prefix=byiara
   ```
2. Match the patterns used in `libs/shared/ui/src/lib/button/` and `stepper/`:
   - signal-based `input()` / `output()`, not `@Input()` / `@Output()`
   - class name is PascalCase with no `Component` suffix (e.g. `Button`, `Stepper`)
   - selector `byiara-<name>`
3. Add the export to `libs/shared/ui/src/index.ts`:
   ```ts
   export * from './lib/<name>/<name>';
   ```
4. Write the `.spec.ts` following `button.spec.ts`'s pattern (`TestBed` + `provideRouter([])` if the component uses `routerLink`).
5. Verify with `pnpm nx test shared-ui`.
