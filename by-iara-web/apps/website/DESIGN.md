# Public website design

The public website uses Apple's Human Interface Guidelines as its design reference,
adapted to the web and the existing brand. These are design decisions and acceptance
criteria, not a claim that every page has passed a complete accessibility audit.
Use HIG itself; do not use the Impeccable skill for this redesign.

## Identity and hierarchy

- Preserve primary rose `#C04D68` and the confirmed dark brown `#281219` from the shared theme.
- Preserve the original typography: Playfair Display for editorial headings and DM Sans for body copy, navigation and controls. Retain the larger responsive type sizes from the redesign.
- Keep a white content canvas, rose actions, quiet tinted groups, and brown sections/footer.
- Give booking one prominent action per step. Keep prices, variants and the summary available on small screens.
- Keep the home hero as a full video background at every width. Apply the original brown gradient wash across the entire media area using `.home-media::after`; do not restore a background on `.home-copy::before`.
- Use the light rose token `--byiara-color-rose-300` (`#EDA8B8`) for the hero eyebrow and next-available link, including its icon and interaction states.
- Keep packs copy before its media on mobile; adjacent copy/media columns are appropriate for that content on larger screens.
- Show only the G monogram in the mobile navigation layout; retain the full logo on desktop. Active navigation links must not have a filled background.
- Keep footer navigation compact: 2rem minimum link height with 0.125rem between links. Allow long labels to wrap naturally.
- Automatic discount banners show the benefit, eligibility and booking action, never the internal discount name (including accessible labels). Code-based offers still show the redeemable code. On mobile, align content left and place the dismiss control at the top right.

## Structure

`src/public-design.css` owns website-only layout, title, reading and control tokens.
`public-heading` is the reusable page-header style. Page CSS owns domain layouts.
Shared UI defaults remain compatible with the admin; button and select size tokens
let the public website opt into more generous touch targets.
The booking page opts into the shared stepper's `mobileLayout="labeled"` variant;
the admin retains the default compact layout.

The shared theme remains the source of brand primitives. Do not duplicate hex values
in page CSS. Keep translated labels in the existing message catalog.

## Interaction and accessibility

- Use at least 44px targets for primary controls, including navigation toggles, video controls and booking actions. Footer text links use the compact sizing above. Preserve text wrapping, visible focus, and active navigation semantics.
- A skip link leads to main content. Escape closes mobile navigation and restores focus.
- Header height is measured so anchors and booking steps clear navigation at enlarged text sizes.
- The video has explicit pause/play controls and responds to reduced motion and document visibility. Keep the hero in an isolated stacking context and the playback control below the navbar. Do not assume the current implementation pauses when the hero scrolls offscreen.
- No timed intro covers content. Scroll enhancements leave server-rendered content visible.
- Motion explains transitions: subtle section entrances, directional booking steps and control feedback.
- On mobile, show all four booking step labels in equal-width columns. Use a brief 220ms moving underline, subtle active-circle emphasis and a completion check. Reduced Motion removes movement and leaves completed checks visible; interaction must never wait for animation.
- Keep the mobile booking action bar fixed to the viewport bottom, including safe-area padding. Keep Continue/Back accessible while scrolling and reserve space so the bar does not obscure the final content.
- Reduced motion removes automatic movement; reduced transparency makes navigation opaque.
- Layout must handle 320px–1440px widths, Portuguese/English and 200% text enlargement.

## Apple references

- [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

## Verification

Run `pnpm exec nx build website`, `pnpm exec nx lint website`, and `pnpm exec nx test website`.
Run the website Playwright `hero-video` and `public-experience` tests for interaction regressions.
Use published content or local test fixtures to review service/guide detail pages; never publish QA content.

Check the hero overlay and playback control, mobile monogram, both promotion types,
all booking steps, the bottom action bar and footer wrapping at narrow widths.
Check motion with both normal and reduced-motion preferences.

## Remaining verification

Editorial heading rules now use Playfair Display, with a low-specificity default
for headings inside `.site-main`. Keep component overrides aligned with that default.
Recheck video autoplay/fallback behavior and text contrast against the
moving footage. Run final interaction and accessibility checks after the accumulated
changes; earlier checks do not certify later edits.
