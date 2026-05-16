# Retailer Deduction Recovery — Failure Log

What was attempted that didn't work, why it didn't work, and what was
tried next.

Lower bar than DECISIONS.md — capture failures even when they didn't
produce a durable rule. The whole point: future-you (or future-Claude)
shouldn't re-attempt dead ends because the lesson got lost.

---

## Format

### YYYY-MM-DD — [One-line failure description]

**Attempted:** [What was tried]

**Why it didn't work:** [Concrete reason, not "it broke." If the
failure mode was technical, name the specific issue. If the failure
mode was scope or approach, name that.]

**What we tried instead:** [The next attempt, which may also have
failed and may have its own entry below]

**Status:** Resolved / open / abandoned

**Tags:** [keywords for future text-search — e.g., "rendering, pandoc,
quarto" or "scope, scrollytelling, decoration"]

---

## Entries

[New entries get added here, most recent at the top]

### 2026-05-15 — Relied on testing-library auto-cleanup in Vitest setup

**Attempted:** Wrote component tests assuming testing-library would clean
up DOM between tests (per its docs: "auto-cleanup if `afterEach` is
globally available"). Setup file only imported
`@testing-library/jest-dom/vitest`.

**Why it didn't work:** Each `render()` accumulated in the DOM; queries
like `getByText` found 4 matching buttons by the 4th test, throwing
"Found multiple elements" errors. Auto-cleanup did not fire despite
vitest having `afterEach` globally available.

**What we tried instead:** Added explicit `afterEach(cleanup)` to
`src/test-setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(cleanup);
```
Tests pass immediately after.

**Status:** Resolved.

**Tags:** vitest, react-testing-library, jest-dom, test-setup, jsdom

---

### 2026-05-15 — Trusted Ctrl+Shift+R to clear Cloudflare Pages cache

**Attempted:** When the user reported a deployed fix "still doesn't look
right," defaulted to "fix must be wrong, iterate again." Pushed multiple
follow-up code changes (proportional column widths, then equal widths)
based on screenshots that may have been showing cached CSS.

**Why it didn't work:** Cloudflare Pages CDN can serve stale CSS for
several minutes after a deploy. Even hard-refresh (Ctrl+Shift+R) doesn't
always force a fresh asset fetch — the cached `<link>` href resolves to
the cached bundle. The deployed CSS bundle hash was actually changing on
every push (verified via `Invoke-WebRequest`), but the user's browser
kept rendering the prior version.

**What we tried instead:** Verified the live bundle bytes contained the
expected CSS rule (`table-layout: fixed`, `width: 12.5%`) BEFORE deciding
to make further changes. Once the rule was confirmed on the wire,
suggested incognito window — which would have settled it three iterations
earlier.

**Status:** Resolved — pattern captured for future debugging.

**Tags:** deploy, caching, cloudflare-pages, cdn, ux-debugging, css
