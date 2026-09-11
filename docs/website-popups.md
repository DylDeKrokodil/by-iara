# Website popups

Manage messages under **Content → Website popups** in the admin app (`/popups`). Create and edit Portuguese and English copy, preview both languages, and enable or disable a message. Creation saves a disabled popup. Enabling asks for confirmation and replaces whichever popup is currently active. Saving changes to an active popup updates its content without changing publication state.

## Visitor experience

- A compact, non-modal panel appears after the page has rendered and the browser is idle. It never locks scrolling, traps focus, or hides the main content.
- The initial visit is eligible on home, service, pack and guide routes. Booking, legal and unknown routes do not fetch or show a popup. Navigation dismisses the panel for that page session.
- On mobile, the title and action appear first. A labelled disclosure reveals the message. Dismissal hides the popup for the current page only; an active popup appears again on the next eligible page load or refresh. No dismissal state is stored in the browser.
- Escape dismisses the popup. Focus returns to main content only when it was inside the dismissed panel. External focus is left alone; the panel hides if it would cover a newly focused control.
- Announcement text uses a polite status region. The panel is a named region, not an urgent alert or modal dialog. Controls have visible focus, comfortable targets, and localized labels. Reduced motion disables its entrance animation.
- Copy is rendered as text. The action can only point to an existing localized booking, service or pack page.

## Persistence and delivery

Flyway migration `V039__create_website_popups.sql` creates the content table and a singleton publication table. The singleton stores at most one popup ID; a database row update atomically replaces it even across concurrent requests. Disabling includes the target ID in the condition so a stale admin page cannot disable a different active popup. No popup is enabled or seeded by the migration.

Public `GET /api/popups/active` returns the active translated content or HTTP 204, with `Cache-Control: no-store`. Management endpoints under `/api/admin/popups` require existing admin authentication. The public response excludes the internal name.

The public component is a deferred browser enhancement: popup API work is excluded from SSR, and failures do not block page rendering. This follows Google’s guidance on avoiding intrusive interstitials; it is not a guarantee of search ranking.

The shared `AnnouncementCard` owns presentation, reused by the public feature and admin preview. Each app owns its API client and orchestration. Existing rose colors, Playfair Display and DM Sans remain the design foundation.

## References and verification

- [Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality)
- [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Google: Avoid intrusive interstitials](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials)

Backend `PopupApiTests` exercises creation, editing, authorization, validation, single-active publication, concurrent activation, and stale disabling against the migration schema in the test database. Website `welcome-popup.spec.ts` covers keyboard dismissal, redisplay after reload, localized actions, mobile layout/disclosure, reduced motion, route exclusions and API failure. Admin `popups.spec.ts` covers creating, previewing, editing, replacing and disabling. Browser checks use local test content, not published campaigns.

Automated semantics and keyboard checks do not replace a manual VoiceOver/NVDA pass.
