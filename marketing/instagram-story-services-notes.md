# Instagram Story — Services & Prices

Output:

- `instagram-story-services.png` — ready-to-post 1080x1920 Instagram story (9:16).
- `instagram-story-services.svg` — editable source file. The official logo is **inlined** (self-contained).

Based on the client's existing "SERVIÇOS" price-list reference. Same soft, welcoming light style, rebuilt with the **official Iara Gouveia brand palette** from the theme tokens instead of the reference's dusty pinks.

Services & pricing (source of truth — from the client's reference image):

| Service | Duration | Price |
| --- | --- | --- |
| Relaxation massage | 45 min | 40 € |
| Relaxation massage | 60 min | 50 € |
| Lymphatic drainage | 45 min | 45 € |
| Lymphatic drainage | 60 min | 55 € |
| Deep tissue massage | 45 min | 50 € |
| Deep tissue massage | 60 min | 60 € |
| Sculpting massage | 45 min | 55 € |
| Sculpting massage | 60 min | 65 € |

Design choices applied:

- 9:16 layout at 1080x1920, matching the reference format.
- **Grouped by service type**: one card per service (4 total) instead of 8 repeated rows. Each card shows the name + icon once, with the two duration/price options (45 min / 60 min) as paired chips — removes the repetition of listing the same service twice.
- Brand palette via theme tokens: rose `#e11d74` (accent/title/icons), plum `#24111c` (text), `#755267` (muted), blush surfaces (`#fff5fa`, `#fce7f1`, `#fcc2db`).
- Fraunces display serif (fallback Georgia) for the title, service names, and prices; sans for durations — matches the brand type system.
- Clean cards: no icons. Each card is the service name plus two duration/price chips spanning the card width.
- Soft blurred palm-frond shadows echo the reference's spa ambience without using stock imagery.
- Plain rose divider lines (no heart glyph) under the logo, under the title, and at the footer.
- Title is Portuguese ("SERVIÇOS"); service names kept in English as in the reference. Easy to fully localize if needed.

Regenerating the PNG from the SVG:

- The SVG uses `feDropShadow` / `feGaussianBlur` filters and a nested `<svg>` logo, which macOS `qlmanage` and ImageMagick render incorrectly. Use a librsvg-backed renderer (e.g. `sharp`):
  - `sharp(svg, { density: 300 }).resize(1080, 1920, { fit: 'fill' }).png().toFile('instagram-story-services.png')`

Note:

- `instagram-post-price-list.*` in this folder used placeholder services/prices from an earlier draft (Targeted reset / Full back & shoulders / Complete session at €45/60/75) — that data is **not** the real menu. Update or remove those files to avoid confusion.
