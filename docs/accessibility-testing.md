# Accessibility testing

This document describes the automated accessibility gate in CI, what it
covers, and the manual checks it cannot replace.

## What's automated

Automated coverage lives under `e2e/accessibility/` and runs with
Playwright (`npm run test:e2e:a11y`), gated in CI by the `accessibility`
job in `.github/workflows/ci.yml`.

### Routes scanned

Every route currently shipped in `app/` is scanned (see
`e2e/accessibility/routes.ts`, the single place to add a new route):

- `/` — home
- `/how-it-works`
- `/faq`
- `/developers`
- `/issuers`
- `/privacy`
- `/terms`
- `/status`
- `/proofs/create` — the closest current analog to an authenticated
  flow: wallet connect (Freighter) + income payment selection + proof
  creation
- `/verify` — public proof verification by ID
- `/verify/credential` — public proof verification by uploaded credential
  JSON
- a 404 (error page)

**Not yet covered:** dedicated "payments", "proof history", and "proof
detail" pages do not exist in the app yet (`app/` has no such routes as of
this PR). They are intentionally left out of `routes.ts` rather than
faked. Once those pages ship, add one entry per route to
`e2e/accessibility/routes.ts` and they'll be scanned automatically by the
existing `scans.spec.ts` loop — no new harness work required.

### axe rules

`e2e/accessibility/fixtures/axe.ts` runs `@axe-core/playwright` with the
`wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa` tag sets (covers missing
accessible names, invalid ARIA usage, landmark/heading structure,
color-contrast, label associations, and similar). A test fails only on
violations with `critical` or `serious` impact; `minor`/`moderate`
findings are still recorded in the attached JSON report (and the HTML
report Playwright produces in CI) but don't fail the build, so the gate
stays actionable rather than noisy. Every failure message names the route,
the axe rule id, the impact level, and the specific DOM node(s) involved.

### Dynamic states

`e2e/accessibility/dynamic-states.spec.ts` drives real interactions
(mocked wallet via `fixtures/mock-freighter.ts`, mocked API via
`fixtures/mock-api.ts`) to scan states beyond the initial HTML:

- `/proofs/create`: wallet-connected state, payment-sync success, the
  in-progress "Creating signed minimum-income proof..." loading state, a
  failed proof-creation error state, and the completed success state.
- `/verify` and `/verify/credential`: the loading state, a valid-result
  success state, and validation-error states (empty input / invalid JSON).

### Keyboard interaction tests

`e2e/accessibility/keyboard.spec.ts` uses real `page.keyboard` automation
(not axe, which cannot verify actual tab order or key handling):

- **Skip link**: tabbing from a fresh page load reveals "Skip to main
  content" as the first focus stop, and activating it moves focus to
  `#main-content`.
- **Disclosures**: the FAQ accordion opens/closes with Enter/Space,
  `aria-expanded` toggles correctly, and focus stays on the trigger.
- **Form error announcements**: submitting invalid input on the verify,
  verify-credential, and proof-creation forms moves focus to a
  `role="alert"` region and the submitting control's `aria-describedby`
  points at it.
- **Focus restoration**: clearing the FAQ search restores focus to the
  search field, and disconnecting the wallet on `/proofs/create` restores
  focus to "Connect Freighter" — both fixed as part of this change, since
  neither previously restored focus and would otherwise drop keyboard
  users' focus to `<body>`.

**No current subject (harness ready, not faked):**

- **Nav menu / dropdown**: `components/layout/public-nav.tsx` has no
  dropdown or mobile-menu disclosure yet — nav links are simply hidden
  below the `md` breakpoint with no mobile alternative. This is a real gap
  worth its own follow-up (mobile users currently have no way to reach
  nav links other than the logo), but adding a mobile menu is a UI change
  outside the scope of "enforce accessibility checks in CI." Flagged here
  so it isn't missed.
- **Dialogs/modals**: none exist in the app yet. The moment one is added,
  a focus-trap / focus-return test belongs in `keyboard.spec.ts` next to
  the disclosure and focus-restoration tests already there.

### Viewports

Every spec runs under two Playwright projects (`playwright.config.ts`):
Desktop Chrome (1280x800) and Mobile Chrome (Pixel 5 emulation), so
contrast, spacing, and interaction assertions are checked at both sizes.

### Fixtures / determinism

- `fixtures/mock-api.ts` intercepts EarnProof API calls
  (`NEXT_PUBLIC_API_URL`) with `page.route` and returns fixed JSON
  fixtures, so payment lists, proof IDs, hashes, and dates never vary
  between runs.
- `fixtures/mock-freighter.ts` answers the Freighter extension's
  `window.postMessage` protocol directly (the extension isn't installed
  in the Playwright browser), so wallet connect/sign can be exercised
  deterministically without a real Freighter install. See the comment in
  that file for the exact message protocol this reverse-engineers from
  `@stellar/freighter-api`.

## What requires manual verification

Automation (axe + scripted keyboard interaction) cannot prove the
following. Review these periodically — after any significant UI change,
and at minimum before each release — using a real screen reader.

### Manual test checklist

Run with at least one of NVDA (Windows/Firefox or Chrome), VoiceOver
(macOS Safari), or JAWS (Windows).

1. **Announcement quality, not just presence.** axe confirms an
   accessible name exists; it can't judge whether the name is clear or
   redundant. Navigate every scanned route by screen reader and confirm:
   - Headings read in a sensible order and describe their section.
   - Buttons/links announce their purpose without needing surrounding
     context (e.g. "Connect Freighter", not "Button").
   - The FAQ accordion announces expanded/collapsed state and the
     question/answer relationship clearly when toggled.
2. **Reading order vs. DOM order.** Confirm the order content is
   announced in on `/proofs/create` (wallet → payments → proof form →
   feedback) and `/verify` (form → privacy notice → result panel)
   matches the visual reading order at both viewport sizes, especially
   after the CSS grid reflows on mobile.
3. **Live region behavior in practice.** `aria-live="assertive"` error
   regions and `aria-live="polite"` status regions are wired
   programmatically, but confirm by ear that:
   - The error is announced promptly without repeating itself.
   - Status updates ("Requesting Freighter wallet access...", "Payments
     synced.") don't talk over each other or get skipped when they change
     quickly.
4. **Alt text semantics.** The EarnProof logo `<Image>` uses `alt="EarnProof"`
   — confirm this (and any future imagery) describes purpose, not just
   appearance, and that purely decorative graphics (the FAQ chevron icon,
   status badges) stay `aria-hidden` and are correctly skipped.
5. **Cognitive load / plain-language clarity.** Read the proof-creation
   copy, error messages, and privacy notices aloud. Confirm:
   - Error messages describe what to do next, not just what failed.
   - Technical terms (credential hash, wallet hash, classification
     values) have enough surrounding context for a first-time user.
6. **Zoom / reflow.** Set browser zoom to 200% and confirm no content is
   clipped or requires horizontal scrolling on the scanned routes.
7. **Color contrast in context.** axe's `color-contrast` rule is included
   in the automated run, but spot-check text over gradients/borders
   (e.g. status badges, the cyan accent on dark backgrounds) visually,
   since axe can miss contrast issues on non-solid backgrounds.

Record findings from this checklist (route, issue, screen reader/browser
combo) as GitHub issues tagged `accessibility` so they can be triaged
against the automated gate above.
