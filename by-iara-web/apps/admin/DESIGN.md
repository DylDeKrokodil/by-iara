# Admin interface · Apple HIG exploration

This branch explores an Apple HIG-inspired interface for the **admin application only**. The website, shared theme, authentication and business rules retain their existing behaviour. This is a web adaptation of the guidance, not an implementation of native Apple controls or Liquid Glass.

## Direction

A practitioner checks the next appointment between customers, using a laptop at the desk or a phone in the treatment room. Prioritise quick orientation, legible information, predictable controls and straightforward decisions.

- Use the platform system font with a fixed rem hierarchy. Page titles identify tasks; the workspace toolbar provides section context.
- Keep the brand primary and action fill exactly **#c04d68**. Reserve rose for active navigation, actions and selected states. Use neutral grouped backgrounds and white content surfaces.
- Use one persistent, searchable navigation hierarchy, retaining the existing collapsible group preferences. On phones, navigation becomes a drawer with an inert background, keyboard containment and Escape dismissal.
- Show the daily schedule first, with the next appointment identified by both text and a tinted background. Put pending requests beside the schedule, with date/time and review actions.
- Present weekly availability as a single grouped list with an adjacent editing form. Use segmented controls for views and sentence-case table headers.
- Keep controls at least 44px where practical, preserve visible keyboard focus and respect reduced motion, reduced transparency and increased contrast. Financial and date values use tabular numerals.

## Ownership

- `src/styles/admin-theme.css`: semantic token overrides, loaded only by the admin stylesheet. The exact primary color remains unchanged.
- `src/styles/admin-controls.css`: the admin appearance of existing shared UI components. Every rule is scoped to `.byiara-admin`, set on this app's body. Do not move these exploratory overrides into the public theme.
- `src/styles.css`: shared admin page patterns.
- `src/app/*`: page-specific composition and responsive layouts. API orchestration and domain models retain their current ownership.

The extra `:root .byiara-admin` scope gives these intentional app-level styles enough specificity to adapt Angular's encapsulated shared controls. When this direction is approved, consider promoting the stable appearance options into explicit shared component tokens. Keep the public design independent.

## Review and verification

Run from `by-iara-web`:

```sh
pnpm nx serve admin --host=127.0.0.1 --port=4401
pnpm nx build admin
pnpm nx test admin
pnpm nx lint admin
BASE_URL=http://127.0.0.1:4401 pnpm nx e2e admin-e2e -- --project=chromium --workers=2
```

The browser tests intercept API calls with local fixtures. They cover navigation search, mobile focus containment, service editor links, keyboard view switching, sign-in validation, and route overflow at 390, 834 and 1440px. No fixture data ships with the application or is written to the API. A provided `BASE_URL` uses the already-running server.

## Reference

- [Apple HIG: design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Apple HIG: typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Apple HIG: color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Apple HIG: layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple HIG: sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)
- [Apple HIG: accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
