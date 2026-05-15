# Retailer Deduction Recovery — Current Work Plan

The current arc of work. Updated when the arc changes, not every
session. For session-by-session state, see HANDOFF.md.

---

## Goal

Restructure the demo from a flat 16-section scroll into a
narrative-driven, chapter-based tool that guides a CEO through
the five compounding failures — revealing the unique diagnostic
capabilities that no commercial deduction platform offers.

## Why this arc, why now

The demo is functionally complete (10 views, all connected) but
the "busy" UX is hiding the competitive advantage. The audit
(AUDIT.md, 2026-05-15) found five features unique in a 15-tool
landscape: root cause tracing, evidence quality assessment,
recovery simulation, cost-to-dispute triage, and executive
visualization. A prospect CEO opening this cold sees 16 sections
and bounces before discovering any of it. The narrative refactor
is the highest-leverage move — fixing the UX IS the strategic
differentiation.

## Business question this arc answers

Same as the original: make visible the five compounding failures
and what each one costs. This arc changes HOW the answer is
delivered — from "here are 10 tools, go explore" to "here is
what's happening, and each screen shows you why it's getting
worse."

## Tasks

### Phase A: Clear the path (< 1 hour)

- [ ] Remove vestigial bottom tables — delete the 3 by-type /
      by-retailer / by-distributor tables from App.tsx (lines
      288–378). Data already visible in Sankey + scorecard. Zero
      information loss, instant noise reduction.
- [ ] Rename sankey/data.ts → domain.ts — this is the shared
      domain module (Selection, isOnSelectedPath, rootCauseFor,
      etc.) imported by 7+ views. Update all imports.
- [ ] Extract App.tsx inline components — pull Kpi, CohortBar,
      TimeRangeSelector, computeKpis, aggregateByType,
      aggregateByRetailer into separate files. Keeps App.tsx
      focused on layout and state before adding navigation.

### Phase B: Narrative chapter structure (main effort)

- [ ] Design chapter navigation component — tab bar or chapter
      nav below the persistent header (Sankey + KPIs + filters +
      cohort bar). One piece of state: activeChapter. Only the
      active chapter's views render. Simple, no React Router.
- [ ] Implement Chapter 1: The Problem — Sankey + KPIs + cohort
      table. "Here is the shape of your losses." This is the
      landing state.
- [ ] Implement Chapter 2: Why This Happens — Explorer + causation
      trace + origin clustering. "Each deduction traces back to a
      specific operational failure."
- [ ] Implement Chapter 3: The Evidence Gap — Dispute builder +
      post-audit risk + retailer scorecard. "You don't have what
      you need to win, and here's what that costs."
- [ ] Implement Chapter 4: What to Do About It — Recovery
      simulation + cost-to-dispute + timeline pressure. "These
      fixes, in this order, recover this much money."
- [ ] Wire cross-links to switch chapters — Trace →, Filter →,
      and other cross-view links navigate to the correct chapter
      when the target view lives in a different chapter. Same
      selection/trace state, just also sets activeChapter.
- [ ] Verify chapter navigation end-to-end — walk every cross-link,
      filter, and drill-down path. Confirm Sankey selection +
      chapter switching compose correctly. Screenshot verification.
- [ ] Responsive check — verify chapter nav works at iPad portrait
      (768), MacBook (1366), wide (1680).
- [ ] Deploy updated version to Cloudflare Pages.

### Phase C: Harden

- [ ] Add component tests for navigation state — chapter switching,
      cross-link chapter transitions, selection persistence across
      chapter changes.
- [ ] Friend preview — hand off for feedback.
- [ ] Incorporate feedback.

## Out of scope for this arc

- Live backend / API
- Client data upload functionality
- Real dispute submission workflows
- User authentication
- Mobile-first design (responsive is fine, not required)
- Adding new views — the problem is too many sections, not too few
- CSS consolidation — wait until chapter structure is stable
- React Router or URL-based routing — four chapters with local state
- Guided tour or onboarding overlay — the narrative structure should
  make the tool self-explanatory

## Definition of done for this arc

- [ ] Demo opens to Chapter 1 (The Problem) — Sankey + KPIs only
- [ ] CEO can navigate forward through 4 chapters that tell the
      five-failure story in sequence
- [ ] Cross-links between views switch chapters automatically
- [ ] Sankey, KPIs, filters, and cohort bar stay persistent across
      all chapters
- [ ] No view is lost — all 10 features are accessible, just
      organized into chapters instead of a flat scroll
- [ ] Responsive at iPad / MacBook / wide viewports
- [ ] Deployed to Cloudflare Pages
- [ ] Friend has previewed and given feedback
- [ ] Feedback incorporated

---

## Arc history

When an arc completes, archive its goal, completion date, and outcome
here. Then start a new arc above. Provides continuity without bloating
the active plan.

### Arc 1: Build the demo (2025-05-07 → 2026-05-13)
**Goal:** Build the extended synthetic dataset and deliver all ten
interactive features in a deployable React app consuming static JSON.
**Outcome:** Functionally complete. All 10 views built and connected,
synthetic dataset validated (3,333 deductions, $1.4M, 36 checks pass),
deployed to Cloudflare Pages. Friend preview still pending. Audit
(2026-05-15) found the demo has five unique capabilities in a 15-tool
competitive landscape — but the flat 16-section scroll hides them.
Arc 2 addresses this.
