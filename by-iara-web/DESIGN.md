# Iara Gouveia Design System

This design system is the source of truth for Iara Gouveia across the public website
and admin app. The current direction replaces all previous botanical, clay, and
leaf rules with a true-white canvas, accessible rose primary color, Playfair
Display headings, and DM Sans body text.

The living style guide lives at the website `/design-system` route.

## Principles

- **True white is the room.** The primary brand surface is `#ffffff`, not beige,
  cream, stone, or tinted green.
- **Rose is the signature.** `#c04d68` is the brand primary and should be
  immediately visible in actions, selected states, and key accents.
- **Contrast stays honest.** White text on the original `#d4607a` is only
  `3.65:1`, so the primary was tuned to `#c04d68`, which reaches `4.66:1`
  with white.
- **Typography carries warmth.** Playfair Display is for headings and brand
  display moments. DM Sans is for body copy, controls, labels, tables, and
  admin UI.
- **Tokens scale the system.** Components use semantic tokens such as
  `--byiara-color-primary`, not raw primitive color names.

## Color System

### Strategy: Restrained Rose On True White

The physical scene is a visitor opening the site on a phone in a calm treatment
room or at home after work. The page should feel cared-for, bright, feminine,
and trustworthy without drifting into clinical spa stock or generic beige
wellness design.

Colors are authored in `libs/shared/theme/src/styles/theme.css`.

### Semantic Tokens

| Token                                 | Role                                            |
| ------------------------------------- | ----------------------------------------------- |
| `--byiara-color-background`           | True white page background                      |
| `--byiara-color-surface`              | Cards, panels, inputs, menus                    |
| `--byiara-color-surface-muted`        | Secondary panels and table headers              |
| `--byiara-color-surface-tinted`       | Soft rose-tinted support surfaces               |
| `--byiara-color-text`                 | Plum ink for body text and headings             |
| `--byiara-color-text-muted`           | Secondary copy and metadata                     |
| `--byiara-color-text-subtle`          | Low-priority helper text                        |
| `--byiara-color-primary`              | Accessible rose pink `#c04d68`                  |
| `--byiara-color-primary-hover`        | Stronger rose hover and pressed state           |
| `--byiara-color-primary-strong`       | Accessible rose text on white                   |
| `--byiara-color-primary-action`       | Button and selected-state fill, same as primary |
| `--byiara-color-primary-action-hover` | Darker hover state for action fills             |
| `--byiara-color-on-primary`           | White text/icons on primary fills               |
| `--byiara-color-primary-soft`         | Quiet selected states and callouts              |
| `--byiara-color-primary-tint`         | Pale rose surface tint                          |
| `--byiara-color-accent`               | Deep plum structure and active navigation       |
| `--byiara-color-accent-soft`          | Soft plum support surfaces                      |
| `--byiara-color-border`               | Standard dividers and component boundaries      |
| `--byiara-color-border-strong`        | Control boundaries that need stronger contrast  |
| `--byiara-color-focus`                | Keyboard focus ring                             |

### Verified Contrast

Measured against shipped sRGB equivalents.

| Pairing                                    |   Ratio | Verdict         |
| ------------------------------------------ | ------: | --------------- |
| Body `#281219` on white `#FFFFFF`          | 17.64:1 | AAA             |
| Muted `#574149` on white `#FFFFFF`         |  9.30:1 | AAA             |
| Rose strong `#8F2E47` on white `#FFFFFF`   |  7.93:1 | AAA             |
| White `#FFFFFF` on primary `#C04D68`       |  4.66:1 | AA              |
| White `#FFFFFF` on original rose `#D4607A` |  3.65:1 | Large text only |

## Typography

Fonts:

- `Playfair Display` is the heading and display family.
- `DM Sans` is the body, UI, admin, label, button, table, and form family.
- Both families are self-hosted from the shared theme library.

Rules:

- Body text starts at `1rem` with `--byiara-line-height-body: 1.6`.
- Long prose can use `--byiara-line-height-loose: 1.72`.
- Display headings use `--byiara-line-height-display: 1.04` and no negative
  letter spacing.
- Keep body measure around `54-68ch`; do not stretch paragraphs across desktop.
- Use `text-wrap: balance` on display headings and `text-wrap: pretty` on long
  prose where supported.
- Do not use Playfair Display for buttons, form labels, helper text, or data.

## Spacing And Layout

- Use the 4/8px spacing rhythm already encoded in `--byiara-space-*`.
- Adjacent touch targets need at least `8px` spacing.
- Interactive controls should be at least `44px` high.
- Section spacing should be generous: roughly `48-96px` depending on hierarchy.
- Internal component gaps should be tighter: `8px`, `12px`, `16px`, or `24px`.
- Prefer `gap` over margin choreography for sibling spacing.
- Use `minmax(0, 1fr)`, `min-w-0`, and responsive grids for scalable page
  layouts.

## Components

Every reusable component should support:

- default, hover, focus-visible, active, loading, and disabled states
- keyboard operation with visible focus
- text labels or accessible names for icon-only controls
- enough target size and spacing for touch
- semantic tokens for color, spacing, radius, and typography

Component rules:

- **Buttons:** `byiara-button` (`libs/shared/ui`) is the only button
  implementation for both apps. Renders a native `<button>`, or an `<a>` when
  `href`/`routerLink` is set — `(click)` on the host works either way, no
  output needed.
  - **Primary:** accessible rose `#c04d68` fill with white label; darker rose
    fill on hover.
  - **Secondary:** white surface with a visible boundary; rose tint on hover.
  - **Open:** transparent disclosure control with rose text and a down
    chevron; soft rose tint only on hover.
  - **Ghost:** transparent, danger-colored text for low-emphasis destructive
    actions; faint danger tint on hover.
  - **Danger:** filled danger color with white label, for high-emphasis
    destructive actions.
  - **Sizes:** `md` (default, 44px+ target) and `sm` (compact rows); `iconOnly`
    switches to a square footprint sized from `--byiara-size-icon-button-*`.
    Always pass `ariaLabel` with `iconOnly` — it sets both `aria-label` and a
    mouse-hover `title`, since there's no visible text to source either from.
  - **Full-width:** the host is `display: contents` (so it never fights a
    surrounding flex/grid parent's default sizing) and the real element reads
    `width: var(--byiara-button-width, auto)`. To stretch a button (e.g.
    stacked full-width on mobile), set `--byiara-button-width: 100%` on the
    `<byiara-button>` host from page CSS — don't add a `width` class directly,
    it can't reach the real element through `display: contents`.
  - **Disabled state:** true `disabled` attribute (or `aria-disabled` +
    `pointer-events: none` on the link form), `not-allowed` cursor, and reduced
    opacity.
  - **Loading state:** disabled during async work; composes `byiara-spinner`
    next to the label rather than replacing it (label text should already
    reflect the loading state, e.g. "Saving...").
- **Inputs:** `byiara-text-field` — visible label, quiet white surface, mauve
  border, plum focus, helper/error text near the field, disabled/readonly
  states, and a danger border + danger focus ring when `error` is set
  (driven by `aria-invalid`, not a separate class — pass the resolved
  message string, the component owns showing it).
- **Native inputs:** document text, email, password, tel, URL, search, textarea,
  number, range, color, date/time, month/week, and file examples on
  `/design-system` as native HTML reference — these stay native, there is no
  wrapper component for them.
- **Checkbox, radio, switch:** `byiara-checkbox`, `byiara-radio`, and
  `byiara-switch` (`libs/shared/ui`) replace raw styled native inputs.
  Checkbox and Switch are `ControlValueAccessor`s (bind with
  `[(ngModel)]`/`formControlName`, like `byiara-text-field`); Radio is not —
  a single radio doesn't own its group's value, so it exposes plain
  `checked`/`checkedChange` and the consuming form wires several radios to
  one control. Switch renders a real `role="switch"`.
- **Select menus:** native `<select>` is the fallback. Branded option styling
  uses a custom trigger plus listbox/options pattern so option rows can use our
  typography, spacing, hover, and selected states consistently.
- **Booking picker:** public day and time pickers use `byiara-selectable-tile`
  (`libs/shared/ui`) — large rounded radio tiles, soft rose borders, rose-tint
  selected states, and horizontal date scrolling on narrow screens. `shape`
  picks the layout: `square` for a date (weekday + day number, both
  caller-projected), `rect` for a flat time slot. This is the tile
  counterpart to `byiara-choice-chip`'s pill — same selection states, used
  for calendar/time-grid choices instead of pill/tag-style choices (which
  stay on `byiara-choice-chip`, e.g. the service-variant picker).
- **Alerts:** `byiara-alert` (`libs/shared/ui`) is for problems that need
  attention now — `role="alert"`, tone-tinted background and border
  (`danger`/`info`/`success`/`warning`), tone-colored text. Default tone is
  `danger` since that's almost every real usage today.
- **Empty states:** `byiara-empty-state` is neutral, not urgent — "there's
  nothing here yet." Dashed border by default (`dashed` can turn it off for
  transient loading text), `compact` for inline/list contexts. Project an
  action (typically a `byiara-button`) for "create your first X" states.
  Don't reach for Alert for this — Alert's `role="alert"` implies urgency an
  empty list doesn't have.
- **Selected state:** soft rose fill for high-emphasis choices; rose tint for
  lower emphasis.
- **Cards:** `byiara-card` (`libs/shared/ui`) is a generic bordered box —
  padding (`none`/`sm`/`md`/`lg`), a background variant (`default`/`muted`/
  `tinted`/`dashed`), and an optional `interactive` hover lift. It owns the
  box only; domain-specific cards (a KPI card, a request card with a status
  chip and actions) compose it via the `[card-header]`/`[card-footer]` slots
  rather than becoming new Card variants. Use `--byiara-radius-lg` at most,
  with borders before shadows. Avoid nested cards.
- **Page headers:** `byiara-page-header` (optional label + title + a projected
  `[page-header-action]`) is the standard for admin list, detail, and form pages.
  It owns responsive action alignment and spacing below the header so pages do
  not add one-off header margins.
  where the same markup was duplicated near-identically across five pages.
  Website's booking/catalog headers use a bigger, fluid hero-style title and
  aren't migrated onto this component — adopting them there would need a
  `size` input this component doesn't have yet.

- Motion should be gentle and purposeful.
- Button hover and press states use `140-220ms`.
- Avoid animating layout properties.
- Every animation must respect `prefers-reduced-motion`.

## Research Notes

The current rules are based on:

- Pimp My Type: desktop reading works well around 60-80 characters with roughly
  1.5-1.6 line height.
- Baymard Institute: long-form body text should stay near 50-75 characters per
  line.
- Material Design spacing: use baseline grids, keylines, padding, and
  incremental spacing for layout rhythm.
- Apple Human Interface Guidelines: buttons need enough visual and target
  spacing for comfortable selection.
- WCAG 2.2: normal text needs 4.5:1 contrast; large text and UI indicators need
  3:1.

## Adding To The System

Add a token only when the need is repeated or semantically important.

1. Add the primitive or semantic token in
   `libs/shared/theme/src/styles/theme.css`.
2. Expose it from `libs/shared/theme/src/lib/theme.ts` when TypeScript consumers
   need stable references.
3. Document the token here with intended use.
4. Check contrast before shipping text, status, focus, or control boundary
   changes.
5. Replace hard-coded component colors with semantic tokens.
