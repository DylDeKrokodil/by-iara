# By Iara Design System

This design system is the source of truth for By Iara — a therapeutic massage
studio in Braga — across its public website and admin app. One shared token
foundation serves a calm, trustworthy public brand and a dense, direct
operational product.

## Principles

- **Pink leads.** A bright camellia rose is the brand. It fills primary actions, marks active state, and drenches brand moments. It is not decoration held at arm's length.
- **Calm is structural.** Whitespace, a pure-white canvas, and readable type do the heavy lifting. The pink is loud so the layout doesn't have to be.
- **Tokens first.** Colors, spacing, type, radius, shadow, and motion come from `libs/shared/theme/src/styles/theme.css`. Never hard-code a hex in a component.
- **Semantic over raw.** Components use `--byiara-color-primary`, never `--byiara-color-rose-500`. Reach for a primitive only when defining the system itself.
- **Contrast is not optional.** Body text targets ≥4.5:1; large/bold text and non-text UI indicators target ≥3:1. Every pairing below is measured, not eyeballed.

## Color System

### Strategy: Committed

One saturated color — rose — carries the identity. The canvas is **pure white**
(`#ffffff`, no hidden warmth); the warmth comes from the pink fills and tints,
not from a tinted background. A single botanical green supports it. This is the
"pink bloom, green stem" of a camellia.

### The one rule that keeps pink readable

Bright rose (`#E73D6D`) is a **fill** color, not a **text** color. On white it
only reaches 3.97:1 — fine behind a bold button label, too weak for body text.

| Intent | Token | Why |
| --- | --- | --- |
| Fill a button / chip / active bar | `--byiara-color-primary` | Bright rose, white text on top (bold labels clear 3:1) |
| Pink **text**, links, or icons on white | `--byiara-color-primary-strong` | Deep rose, 7.57:1 — reads as small text |
| Hover / pressed on a pink fill | `--byiara-color-primary-hover` | Deeper rose, 5.35:1 with white |

If you are typing `color:` and the value is pink, it is almost always
`--byiara-color-primary-strong`, not `--byiara-color-primary`.

### Primitive palette

Raw ramp. Authored in OKLCH; the hex is what ships. **Do not use these in
components** — use the semantic tokens below.

| Token | Hex | OKLCH | Role |
| --- | --- | --- | --- |
| `--byiara-color-ink-950` | `#1E1616` | `0.21 0.014 14` | Body text, headings |
| `--byiara-color-ink-800` | `#352B2C` | `0.30 0.014 14` | Strong text |
| `--byiara-color-ink-700` | `#4E4545` | `0.40 0.013 14` | Secondary strong text |
| `--byiara-color-ink-600` | `#6A6161` | `0.50 0.012 14` | Muted text |
| `--byiara-color-ink-500` | `#7B7272` | `0.56 0.012 14` | Subtle text |
| `--byiara-color-ink-400` | `#A49C9D` | `0.70 0.009 14` | Disabled marks (non-text) |
| `--byiara-color-rose-50` | `#FDF4F5` | `0.975 0.010 10` | Whisper tint |
| `--byiara-color-rose-100` | `#FCE4E8` | `0.94 0.026 8` | Soft brand fill |
| `--byiara-color-rose-200` | `#FECCD3` | `0.89 0.058 8` | Soft border on tint |
| `--byiara-color-rose-300` | `#F9A6B5` | `0.81 0.10 8` | Decorative |
| `--byiara-color-rose-400` | `#F2718E` | `0.71 0.16 8` | Bright decorative |
| `--byiara-color-rose-500` | `#E73D6D` | `0.625 0.206 9` | **Primary fill** |
| `--byiara-color-rose-600` | `#D0115F` | `0.555 0.216 6` | Hover / focus |
| `--byiara-color-rose-700` | `#A7074B` | `0.47 0.185 6` | **Pink text on light** |
| `--byiara-color-rose-800` | `#7D0333` | `0.38 0.15 8` | Deep pink on tint |
| `--byiara-color-green-50` | `#E4F7ED` | `0.96 0.025 162` | Accent background |
| `--byiara-color-green-500` | `#126646` | `0.455 0.093 162` | Accent (eucalyptus) |
| `--byiara-color-white` | `#FFFFFF` | — | Canvas, on-primary text |

### Semantic tokens — the API

Use these in every component.

| Token | Resolves to | Use for |
| --- | --- | --- |
| `--byiara-color-background` | `#FFFFFF` | Page / app background |
| `--byiara-color-surface` | `#FFFFFF` | Cards, panels, inputs, menus |
| `--byiara-color-surface-muted` | `#FBF5F5` | Secondary panels, table headers, empty states |
| `--byiara-color-surface-tinted` | rose-50 | Brand section washes, subtle hover tints |
| `--byiara-color-text` | ink-950 | Body text |
| `--byiara-color-text-muted` | ink-600 | Secondary text, metadata |
| `--byiara-color-text-subtle` | ink-500 | Low-priority text (never essential instructions) |
| `--byiara-color-primary` | rose-500 | Primary button/chip **fills**, active bars, brand drench |
| `--byiara-color-primary-hover` | rose-600 | Hover / pressed on a pink fill |
| `--byiara-color-primary-strong` | rose-700 | Pink **text**, links, icons on light surfaces |
| `--byiara-color-on-primary` | white | Text/icons on a `--primary` fill |
| `--byiara-color-primary-soft` | rose-100 | Selected rows, chips, quiet brand fills |
| `--byiara-color-primary-tint` | rose-50 | Alias of surface-tinted for brand emphasis |
| `--byiara-color-accent` | green-500 | Botanical accent — sparingly; text or fill |
| `--byiara-color-accent-soft` | green-50 | Accent background |
| `--byiara-color-on-accent` | white | Text/icons on an `--accent` fill |
| `--byiara-color-border` | `#E3DCDC` | Standard borders, dividers |
| `--byiara-color-border-subtle` | `#F1EBEB` | Quiet hairlines |
| `--byiara-color-border-strong` | `#908282` | Control boundaries that must meet 3:1 (inputs) |
| `--byiara-color-focus` | rose-600 | Keyboard focus ring (with `outline-offset`) |
| `--byiara-color-danger` | `#C92F33` | Errors, destructive actions |
| `--byiara-color-danger-hover` | `#A9131F` | Destructive hover / active |
| `--byiara-color-success` | `#2D7B44` | Success states |
| `--byiara-color-warning` | `#9A6922` | Warning states |
| `--byiara-color-info` | `#1F6CB0` | Informational states |

### Text-on-color

- Text on a **saturated fill** (`--primary`, `--accent`, `--danger`, `--success`, `--warning`, `--info`) is **white** (`--on-primary` / `--on-accent` / `--color-white`). This holds even where dark text technically passes — saturated fills read brighter than their luminance (Helmholtz-Kohlrausch), and dark text on them looks muddy.
- Text on a **soft tint** (`--primary-soft`, `--surface-tinted`, `--accent-soft`, `--surface-muted`) is **ink** (`--text`).
- White on `--primary` (3.97:1) is for **bold labels ≥14px only**. For pink text at any smaller size or normal weight, use `--primary-strong`.

### Verified contrast

Measured with WCAG 2.1 relative-luminance math.

| Pairing | Ratio | Verdict |
| --- | ---: | --- |
| Body `#1E1616` on white | 17.8:1 | AAA |
| Muted `#6A6161` on white | 6.0:1 | AA |
| Subtle `#7B7272` on white | 4.67:1 | AA |
| Pink text `#A7074B` on white | 7.57:1 | AAA |
| White on primary `#E73D6D` | 3.97:1 | Bold labels only (≥3:1) |
| White on primary-hover `#D0115F` | 5.35:1 | AA |
| Accent `#126646` ↔ white | 6.97:1 | AA |
| Danger `#C92F33` ↔ white | 5.33:1 | AA |
| Success `#2D7B44` on white | 5.21:1 | AA |
| Warning `#9A6922` on white | 4.75:1 | AA |
| Info `#1F6CB0` on white | 5.48:1 | AA |
| Body on soft/muted (rose-50 / rose-100 / surface-muted) | ≥14.7:1 | AAA |
| Border-strong `#908282` on white | 3.68:1 | Non-text ≥3:1 |

### Do / Don't

- **Do** fill primary actions with `--primary`; the whole product should read pink-forward.
- **Do** use `--primary-strong` for any pink text, link, or icon on a light surface.
- **Do** keep the canvas pure white; carry warmth with fills and `--surface-tinted`.
- **Do** pair every status color with a text label or icon, never color alone.
- **Don't** put small or normal-weight text in `--primary` on white (it fails 4.5:1).
- **Don't** reach for a primitive (`rose-500`, `ink-600`) in a component — use a semantic token.
- **Don't** tint the background toward warm "because the brand feels warm." White is the brand choice.
- **Don't** add a fourth or fifth brand color. Rose + green + ink is the whole set.

## Typography

Fonts:

- `Inter` is the default UI and body family.
- `Fraunces` is reserved for public website display moments (established brand identity).
- Admin labels, buttons, table headers, and form controls use `Inter`.

Scale:

| Token | Size | Use |
| --- | ---: | --- |
| `--byiara-font-size-xs` | 12px | Metadata, compact labels |
| `--byiara-font-size-sm` | 14px | Admin text, buttons, table cells |
| `--byiara-font-size-md` | 16px | Alias for base text |
| `--byiara-font-size-base` | 16px | Body text |
| `--byiara-font-size-lg` | 18px | Section headings, emphasized body |
| `--byiara-font-size-xl` | 20px | Small page headings |
| `--byiara-font-size-2xl` | 24px | Admin page headings |
| `--byiara-font-size-3xl` | 32px | Major page headings |
| `--byiara-font-size-4xl` | 44px | Website display headings |

Rules:

- Keep prose line length around 65-75 characters.
- Use fixed type sizes in admin; avoid fluid type for task UI.
- Use `text-wrap: balance` on website display headings when needed.
- Do not use display fonts for buttons, labels, data, or form controls.

## Spacing

| Token | Size | Use |
| --- | ---: | --- |
| `--byiara-space-3xs` | 2px | Fine offsets only |
| `--byiara-space-2xs` | 4px | Label/help text gaps |
| `--byiara-space-xs` | 8px | Compact controls, icon gaps |
| `--byiara-space-sm` | 12px | Form field internals, chip padding |
| `--byiara-space-md` | 16px | Default component spacing |
| `--byiara-space-lg` | 24px | Card padding, page header gaps |
| `--byiara-space-xl` | 32px | Major page regions |
| `--byiara-space-2xl` | 48px | Website section rhythm |
| `--byiara-space-3xl` | 64px | Large brand sections |

Spacing rules:

- Related items stay close; unrelated groups need at least one step more spacing.
- Admin pages should use `md`, `lg`, and `xl` most often.
- Website sections can use `2xl` and `3xl`, but only when the viewport still reveals the next section.
- Do not add one-off spacing unless a repeated pattern graduates into a token.

## Components

Every reusable component should support:

- Default, hover, focus-visible, active, disabled states.
- Loading and error states when the component performs async work.
- Keyboard operation with visible focus.
- Text labels or accessible names for icon-only controls.

Component rules:

- **Primary button**: `--byiara-color-primary` fill, `--byiara-color-on-primary` text, `--byiara-color-primary-hover` on hover.
- **Secondary button**: `--byiara-color-surface` fill, `--byiara-color-border`, `--byiara-color-text`; on hover, tint with `--surface-tinted` and shift text/border to the pink family.
- **Destructive button**: `--byiara-color-danger` / `--byiara-color-danger-hover`.
- **Inputs**: `--byiara-color-border` by default, `--byiara-color-border-strong` where a control boundary must meet 3:1, and `--byiara-color-primary` or `--byiara-color-danger` for state.
- **Selected / active**: `--byiara-color-primary` fill or `--byiara-color-primary-soft` background; active text uses `--primary-strong`.
- **Status chips**: combine color with text, never color alone.
- Cards use `--byiara-radius-lg` at most. Avoid nested cards; use full-width sections or simple layout groups.

## Motion

Motion tokens live in `theme.css`.

- Fast transitions: `--byiara-duration-fast` for hover and press feedback.
- Base transitions: `--byiara-duration-base` for component state.
- Slow transitions: `--byiara-duration-slow` for public website reveals only.
- Every animation must respect `prefers-reduced-motion`.
- Admin motion should communicate state, not decorate the page.

## Layering

| Token | Use |
| --- | --- |
| `--byiara-z-index-base` | Default stacking |
| `--byiara-z-index-raised` | Local raised content |
| `--byiara-z-index-dropdown` | Menus, popovers, select lists |
| `--byiara-z-index-sticky` | Sticky navigation or headers |
| `--byiara-z-index-overlay` | Backdrops and blocking overlays |
| `--byiara-z-index-modal` | Dialogs and confirmation modals |
| `--byiara-z-index-toast` | Toast notifications |
| `--byiara-z-index-tooltip` | Tooltips |

Do not use values like `999` or `9999`. If a layer conflict appears, fix the scale
or the stacking context instead of escalating the number.

## Adding to the system

Add a token only when the need is repeated or semantically important.

1. Add the primitive or semantic token in `libs/shared/theme/src/styles/theme.css`.
2. Expose semantic tokens in `libs/shared/theme/src/lib/theme.ts` if TypeScript consumers need them.
3. Document the token in the tables above with its intended use.
4. Check contrast before shipping any text, status, focus, or control boundary. Author colors in OKLCH.
5. Replace hard-coded colors in components with the new semantic token.

The living style guide lives at the website `/design-system` route — render it to
see the palette, components, and contrast pairings in the browser.

Recommended tools:

- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- OKLCH Color Picker: https://oklch.com/
