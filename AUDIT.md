# Project Audit

## Phase 1: Baseline Assessment
**Date:** 2026-05-16
**Project:** Retailer Deduction Recovery
**Previous audit:** 2026-05-15

### What Was Intended

An interactive React demo that makes retailer deduction losses
visible and actionable for a specialty food manufacturer (Cinderhaven
Provisions). Dual purpose: working demo for a specific prospect
introduction (friend referral, CEO who likes playing with data) and
portfolio showcase for future clients. The tool traces each deduction
through five compounding failures — no visibility, process gaps,
weak evidence, inaccessible records, and missed dispute windows —
showing what's recoverable, what's preventable, and what each
operational fix is worth.

### What Exists Today

A functionally complete React demo with 10 connected views organized
into 4 narrative chapters, deployed to Cloudflare Pages. Since the
last audit (2026-05-15), the primary recommendation — restructuring
from a flat 16-section scroll into narrative chapters — has been
implemented.

**10 views across 4 chapters:**

| Chapter | Name | Views |
|---------|------|-------|
| 1 | The Problem | Sankey flow + cohort table |
| 2 | Why This Happens | Explorer + causation trace + origin clustering |
| 3 | The Evidence Gap | Dispute builder + post-audit risk + retailer scorecard |
| 4 | What to Do About It | Recovery simulation + cost-to-dispute + timeline pressure |

All views share a single `selection` state — clicking in one view
updates all others. KPIs, filters, and cohort bar persist across
chapter switches. Cross-links (Trace, Filter) automatically switch
to the target chapter.

### Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React, TypeScript | 19.2.5, ~6.0.2 |
| Build | Vite | 8.0.10 |
| Visualization | d3 + d3-sankey | 7.9.0, 0.12.3 |
| Data pipeline | Python → SQLite → static JSON | |
| Deployment | Cloudflare Pages (wrangler) | 4.90.0 |
| Testing | Vitest + Testing Library | 4.1.6 |
| Verification | Playwright screenshot scripts (14) | 1.59.1 |

### Project Health Indicators

| Indicator | Status | Detail |
|-----------|--------|--------|
| Build | Pass | 307 KB JS + 45 KB CSS (gzip: 90 KB + 7 KB) |
| Tests | Pass | 14 tests in 2 files (5.0s) |
| TypeScript | Clean | No type errors |
| Dependencies | Current | 0 vulnerabilities, all major versions current |
| Activity | Active | 113 commits, 28 since last audit (2026-05-15) |
| Documentation | Excellent | CLAUDE.md, PLAN.md, HANDOFF.md, DECISIONS.md, FAILURES.md, AUDIT.md, data/schema.md, 7 retailer research files |

### Code Metrics

| Category | Files | Lines |
|----------|-------|-------|
| TypeScript/TSX (source) | 24 | 5,991 |
| CSS | 13 | 3,200 |
| Tests | 2 | 283 |
| Screenshot/verification scripts | 14 | 1,156 |
| **Total frontend** | **53** | **10,630** |

**Largest components (TSX lines):**

| File | Lines | Role |
|------|-------|------|
| CausationTraceView.tsx | 578 | Order lifecycle timeline |
| DisputeBuilderView.tsx | 564 | Evidence gap analysis |
| PostAuditRiskView.tsx | 482 | Clawback exposure model |
| RecoverySimulationView.tsx | 453 | Toggle-based what-if |
| ExplorerView.tsx | 439 | 6-card deduction drill-down |
| CostToDisputeView.tsx | 427 | Fight/marginal/write-off triage |
| OriginClusteringView.tsx | 397 | Warehouse/line/carrier clusters |
| TimelinePressureView.tsx | 376 | Deadline urgency buckets |
| RetailerScorecardView.tsx | 355 | Per-retailer comparison |
| SankeyView.tsx | 340 | d3-sankey 3-layer flow |
| App.tsx | 275 | State + layout (down from 609) |

### What Changed Since Last Audit

The previous audit (2026-05-15) found two critical UX problems —
flat scroll with no hierarchy and no narrative arc — hiding five
unique competitive capabilities. It recommended a 3-phase fix:
clear the path (A), narrative chapter structure (B), harden (C).

**Phase A (clear the path):** Complete.
- Removed 3 vestigial bottom tables
- Renamed sankey/data.ts → domain.ts
- Extracted App.tsx inline components (609 → 275 lines)

**Phase B (narrative chapters):** Complete.
- 4-chapter tab navigation (ChapterNav component)
- Views grouped into narrative sequence
- Cross-chapter links (trace/focus) auto-switch tabs
- Sankey dynamic viewBox height fix (barycenter reorder)
- Layout fixes for wide viewports (1600px content width)
- Cohort table column proportion fixes

**Phase C (harden):** Partially complete.
- Component tests added (14 tests, 2 files) — DONE
- Friend preview — NOT DONE
- Feedback incorporation — NOT DONE

### Gap Analysis

**What the last audit identified vs. where things stand:**

| Last Audit Finding | Severity | Status | Notes |
|---|---|---|---|
| Flat scroll, no hierarchy | Critical | Fixed | 4-chapter nav implemented |
| No narrative arc | Critical | Fixed | Chapters follow 5-failure story |
| Bottom tables redundant | Minor | Fixed | Deleted |
| sankey/data.ts misnamed | Minor | Fixed | Renamed to domain.ts |
| App.tsx monolith (609 LOC) | Important | Fixed | Down to 275 LOC |
| CSS duplication (~2,700 LOC) | Minor | Open | Now 3,200 LOC — grew with new components |
| No test coverage | Important | Partially fixed | 14 tests for nav; 0 for view components |
| Friend preview pending | — | Open | Still unchecked in PLAN.md |

**New observations:**

1. **Design system drift.** App.css uses an "Economist palette"
   (dark navy ink, cool grays, red accent) that diverges from the
   Lailara Design System defined in the parent CLAUDE.md (warm
   off-white background, Playfair Display + Source Sans 3 fonts,
   sequential teal palette). This is a deliberate choice documented
   in the Economist-style decisions, but it means this project
   can't be directly showcased as a Lailara portfolio piece without
   visual reconciliation.

2. **Screenshot scripts are dead weight.** 14 Playwright scripts
   (1,156 LOC) are developer verification artifacts, not automated
   tests. They require a running dev server, produce PNGs that are
   gitignored, and don't assert anything. The component tests added
   in Phase C partially replace their purpose.

3. **CSS is 35% of total code.** 3,200 lines across 13 files with
   significant pattern repetition (card layouts, tag styles, table
   formatting, responsive breakpoints). Each view reinvents similar
   patterns. The previous audit flagged this as "wait until chapter
   structure stabilizes" — it has now stabilized.

4. **Test coverage is thin.** 14 tests cover chapter navigation
   and selection state. Zero tests for: domain logic (domain.ts),
   KPI computation (computeKpis.ts), any of the 10 view components,
   data loading, or filtering logic.

5. **Phase A tasks remain unchecked in PLAN.md.** The Phase A work
   (remove tables, rename, extract) was completed and committed but
   the PLAN.md checkboxes weren't updated. Minor bookkeeping gap.

### Audit Motivation

The previous audit drove a successful chapter restructure. This
audit assesses the result: did the narrative fix land, what new
issues surfaced, and what's left before the demo is ready for the
friend preview (the last gate before prospect intro).

---

## Phase 2: Internal Review
**Date:** 2026-05-16
**Dimensions reviewed:** Code quality, Architecture, UX, CSS,
Accessibility, Performance

### Top Opportunities (by leverage)

| # | Finding | Dimension | Impact | Effort | Leverage | Severity |
|---|---------|-----------|--------|--------|----------|----------|
| 1 | WIN_PROB data discrepancy between simulation and cost views | Code | 5 | 1 | 5.00 | Critical |
| 2 | disputeReadinessFor uses new Date() — non-deterministic | Code | 4 | 1 | 4.00 | Important |
| 3 | Duplicated business logic across 3–4 view files | Arch | 4 | 2 | 2.00 | Important |
| 4 | Hardcoded TODAY date in 3 files | Code | 3 | 1 | 3.00 | Important |
| 5 | CSS duplication: ~550 lines across 13 files + spacing drift | CSS | 3 | 3 | 1.00 | Important |
| 6 | Accessibility: clickable elements without keyboard support | A11y | 4 | 2 | 2.00 | Important |
| 7 | Dead CSS and screenshot scripts (~1,230 LOC combined) | Arch | 2 | 1 | 2.00 | Minor |
| 8 | Missing useMemo + O(n²) in OriginClusteringView | Perf | 2 | 1 | 2.00 | Minor |
| 9 | 8+ hardcoded hex values should be CSS custom properties | CSS | 2 | 2 | 1.00 | Minor |
| 10 | No fetch validation on JSON data loading | Code | 2 | 2 | 1.00 | Minor |

### Detailed Findings

#### CRITICAL — WIN_PROB data discrepancy (two views disagree)

`RecoverySimulationView.tsx:32-37` defines win probability for
"none" evidence as 0.05 (5%). `CostToDisputeView.tsx:17-22`
defines the same constant as 0.0 (0%). These two views model the
same business question — "what's the expected recovery?" — and
give different answers for the same deduction. A CEO toggling
between Chapter 4's simulation and cost-to-dispute views will see
contradictory numbers.

**Fix:** Extract WIN_PROB into domain.ts as a single source of
truth. Decide whether "no evidence" means 5% or 0% and use one
value everywhere.

#### IMPORTANT — disputeReadinessFor is non-deterministic

`domain.ts:167-169` calls `new Date()` to compare against dispute
deadlines. This means the same deduction can produce different
Sankey paths, different readiness labels, and different cohort
memberships depending on when the code runs. If a deadline passes
during a user's session, the Sankey and all downstream views
silently shift. Every function that transitively calls
`disputeReadinessFor` (buildSankeyData, pathIds,
isOnSelectedPath) inherits this non-determinism.

**Fix:** Compute `now` once per render cycle in App.tsx and pass
it through, or pin it to a shared constant. The demo uses static
data — a stable reference date is more honest than a moving one.

#### IMPORTANT — Duplicated business logic across views

Three functions are independently re-implemented in multiple
view files:

- `readableOutcome` — CausationTraceView:565, ExplorerView:392,
  CohortTableView:36. Same outcome-label mapping, three copies.
- `evidenceCategoryFor` — TimelinePressureView:45,
  PostAuditRiskView:46. Same evidence categorization, two copies.
- `WIN_PROB` — RecoverySimulationView:32, CostToDisputeView:17.
  Same model constant, two copies with conflicting values.

Additionally, `RETAILER_PROFILE` (RetailerScorecardView:37) and
`AUDIT_PROFILE` (PostAuditRiskView:33) contain research-grounded
retailer behavioral data that lives in the view layer instead of
the domain or data layer. `HOURS_BY_QUALITY` and triage
thresholds in CostToDisputeView:27 are business-logic constants
embedded in a view file.

**Fix:** Extract all shared logic into domain.ts. Extract
retailer profiles into the retailers.json data pipeline or a
shared constants module.

#### IMPORTANT — Hardcoded demo date in 3 files

`ExplorerView.tsx:15`, `CostToDisputeView.tsx:12`, and
`TimelinePressureView.tsx:12-13` all define
`TODAY = new Date("2026-05-31")`. If the demo date shifts, three
files need manual updating. This also interacts with the
disputeReadinessFor non-determinism — that function uses
`new Date()` (real clock) while these views use a pinned date,
creating inconsistency.

**Fix:** Single shared `DEMO_DATE` constant in domain.ts. Use it
everywhere, including disputeReadinessFor.

#### IMPORTANT — CSS duplication (~550 lines) and drift

Across 13 CSS files, five major patterns are repeated:

| Pattern | Files | Duplicated LOC |
|---------|-------|----------------|
| Table styles (th, td, .num) | 7 | ~140 |
| Section container + h2 + subtitle + empty state | 9 | ~150 |
| Nav button group + header row | 5 | ~85 |
| Trace/action button | 5 | ~50 |
| Tab bar | 3 | ~45 |

Copy-paste drift has created inconsistent spacing: td padding
appears as 9px/10px/6px across files; card padding as
16px/18px/14px; section margin-bottom as 18px/24px. Eight
recurring hex values (#F1F2F4, #eef0f2, #fafafa, #f5f6f7, etc.)
are used outside CSS custom properties.

**Fix:** Consolidate the top 5 patterns into shared classes in
App.css. Promote hardcoded hex values to CSS custom properties.
Estimated savings: ~465 lines.

#### IMPORTANT — Accessibility gaps on interactive elements

Two patterns lack keyboard accessibility:

1. **CohortTableView.tsx:120-143** — sortable `<th>` elements use
   `onClick` but have no `role="button"`, `tabIndex`,
   `onKeyDown`, or `aria-sort`. Screen readers and keyboard users
   cannot sort the table.

2. **SankeyView.tsx:264-315** — SVG `<rect>` and `<path>`
   elements use `onClick` for the core interaction model but have
   no `tabIndex`, `role="button"`, or `onKeyDown`. The Sankey is
   the primary entry point to the tool — if it's not keyboard
   accessible, the entire navigation model breaks for
   non-mouse users.

**Fix:** Add tabIndex, role, onKeyDown (Enter/Space), and
aria-label to interactive elements. Add aria-sort to sortable
table headers.

#### MINOR — Dead CSS and screenshot scripts (~1,230 LOC)

- `.selection-chip` and related selectors in App.css (lines
  234-285, ~52 LOC) — explicitly marked "Legacy alias" — dead.
- `.placeholder` in App.css (lines 156-175, ~20 LOC) — early
  scaffolding, likely unused with all views built.
- 14 screenshot scripts (1,156 LOC) — require manual dev server
  startup, produce gitignored PNGs, don't assert anything. The
  component tests in App.test.tsx and ChapterNav.test.tsx
  partially replace them.

**Fix:** Delete dead CSS. Delete or archive screenshot scripts
(keep 1-2 for visual regression if needed).

#### MINOR — Missing memoization + O(n²) computation

- `OriginClusteringView.tsx:313-316` — `totalDollars` is reduced
  inside a `.map()` loop, recomputing over the full cohort on
  every iteration. O(n²) for no reason.
- `ExplorerView.tsx:134-137` — peer calculations (filter + sort
  the full deduction array) run on every render without useMemo.
- `RetailerScorecardView.tsx:186` — `totalNetLoss` computed on
  every render without memoization.

Not user-visible at current data size (3,333 deductions) but
would become noticeable at 10x scale.

**Fix:** Hoist totalDollars above the map. Wrap peer and
totalNetLoss computations in useMemo.

#### MINOR — Hardcoded hex values outside CSS custom properties

12+ occurrences of `#F1F2F4` (th backgrounds), 10+ of `#eef0f2`
(td borders), plus `#fafafa`, `#f5f6f7`, `#fff5f5`, `#fafdf9`
scattered across 10 files. These should be `--th-bg`, `--td-rule`,
`--bg-muted`, `--bg-danger-light`, `--bg-success-light` custom
properties.

**Fix:** Add 5-6 new CSS custom properties in :root and replace
hardcoded values.

#### MINOR — No fetch response validation

`data.ts:3-19` — The three fetch calls return `res.json()` typed
as the expected interface with no runtime validation. Malformed
JSON or schema drift would produce runtime errors deep in the
component tree rather than a clean "bad data" message at the load
boundary.

**Fix:** Add basic shape validation (check required top-level
keys exist) in the load functions. Not worth a schema library for
static demo data.

### Additional Notes

**SankeyView receives unfiltered deductions (App.tsx:177).**
The Sankey always shows the full dataset; selections highlight
within it but date range filters have no visual effect on the
Sankey itself. This appears intentional (the Sankey is the
"shape of the whole problem") but could confuse a user who sets
a date range and expects the Sankey to narrow. If intentional,
the Sankey needs a visual indicator that it shows all data.

**filteredDeductions typing.** `filteredDeductions` can be `null`
when `deductions` is null. Every consumer uses
`filteredDeductions ?? deductions`, but both can be null. The
early return guard at App.tsx:99 prevents rendering, so this is
safe in practice but imprecise in types.

**App.tsx:106 division risk.** Annualized dollar computation
`kpiDollar * 12 / summary.window.months` would produce Infinity
if window.months is 0. Not possible with current static data but
a latent edge case.

### Summary

The chapter restructure landed cleanly — the architecture is
sound and the narrative improvement from the last audit is real.
The issues are now in the details: one data-discrepancy bug
(WIN_PROB), duplicated business logic across views, a
non-deterministic domain function, and CSS that grew organically
without consolidation. None of these are architectural — they're
cleanup work that reduces surface area before the friend preview.

The highest-leverage sequence:
1. Fix the WIN_PROB discrepancy (5 minutes, fixes a real bug)
2. Extract shared constants and functions into domain.ts
3. Pin DEMO_DATE and use it in disputeReadinessFor
4. Add keyboard accessibility to Sankey and sortable tables
5. CSS consolidation (biggest effort, biggest LOC reduction)

---

## Phase 3: Landscape Scan
**Date:** 2026-05-16
**Category:** Retailer deduction management platforms for CPG/food
manufacturers
**Method:** Update to May 2026-05-15 scan — focused on market
changes, new entrants, and adjacent category developments

### Market Changes Since Last Audit

The previous audit (2026-05-15) mapped 9 deduction management
platforms and 5 adjacent categories. One month later, the
competitive landscape has shifted in two ways that reinforce this
project's position:

**1. Glimpse raised $35M Series A (a16z, March 2026)**

Glimpse is now the best-funded pure-play deduction platform for
emerging/mid-market CPG, with ~$52M total raised and 200+ brands.
Claims: 91% dispute win rate, 3x dispute volume, 80% manual labor
reduction. Distribution broker partnerships (PLTFRM, PRESENCE)
extend reach. This is the most credible competitor for
Cinderhaven's segment (~$25M revenue).

However: Glimpse's product is recovery throughput — AI ingests
remittances, categorizes, disputes, reconciles. **No root cause
analysis, evidence quality scoring, or executive visualization
confirmed in any announcement.** The Series A press release named
no new diagnostic features. Glimpse answers "recover what you
lost," not "why are you generating losses."

**2. HighRadius added agentic AI features**

Three 2026 additions: Claims Backup Automation Agent (auto-
harvests PODs and BOLs from 100+ retailer portals), Deductions
Auto-Coding Engine (standardizes reason codes across retailers),
and AI Deductions Validity Predictor (scores 20+ variables against
12 months of resolution history to predict dispute outcome).

The Validity Predictor is the closest thing in the market to
evidence quality scoring — but it is a triage likelihood score
("will this dispute win?"), not a gap analysis ("what evidence
exists vs. what's needed and what's the cost of each gap"). It's
also enterprise-only — irrelevant for Cinderhaven's segment.

**3. "Prevention over recovery" is talked about, not built**

The Promomash 2026 trends piece and the UpClear CPG Deduction
Practices Benchmark Report both explicitly name the shift from
recovery to prevention. The UpClear benchmark found 60% of brands
recover less than half of what they dispute. Field sales
accountability gaps are identified as a structural root cause
visibility failure.

But no vendor has built the prevention tool. The market framing
is "you should do prevention" — the product gap is "here is
exactly what's causing your deductions and what each fix is
worth." This project fills that gap.

**4. No new entrant for $5M-$50M segment**

No new deduction management startup targeting the $5M-$50M
revenue band was found in 2025-2026 beyond Glimpse. The segment
remains underserved by purpose-built tooling relative to
enterprise (HighRadius, Vistex) and budget-service (Promomash).

### Updated Competitor Matrix

| Competitor | Segment | 2026 Change | Root Cause | Evidence Quality | Simulation | Exec Viz |
|---|---|---|---|---|---|---|
| **Glimpse** | $5M-$200M | $35M raise, 200+ brands | No | No | No | No |
| **HighRadius** | $1B+ | Agentic AI (validity predictor) | No | Partial (triage score) | No | No |
| **RetailPath** | Mid-large | 3PL/EDI agent focus | Partial (compliance) | No | No | No |
| **Promomash** | $2M+ | "Prevention" content marketing | No | No | No | No |
| **iNymbus** | 1K+ claims/mo | RPA, no change | No | No | No | No |
| **Vividly** | $5M-$200M | TPM with deduction bolt-on | No | No | No | No |
| **This project** | Demo/prospect | Chapter nav restructure | Yes | Yes | Yes | Yes |

### Adjacent Category Update

| Category | Key Development | Relevance |
|---|---|---|
| **Compliance gap analysis** (Relyance AI, Sprinto, TrustCloud) | Pattern well-established: score requirements against evidence, show readiness %. Same UX pattern as the dispute builder. | Validates the evidence-scoring mental model — operations-adjacent audiences will find it familiar. |
| **Executive analytics** (ThoughtSpot Spotter 3, March 2026) | Agentic analytics — AI reasons through business questions, validates its own output. Enterprise BI, not pre-built demos. | Structurally different (requires enterprise data infrastructure). No overlap with prospect-specific curated demos. |
| **Interactive product demos** (Walnut, Navattic) | Platforms that let sales teams swap in prospect-specific data. | Structural similarity (pre-loaded data, self-guided exploration) but these show a vendor's product, not the prospect's own problem. |
| **Sankey in finance** (SankeyArt Power BI visual) | Certified for income statement / P&L visualization. Reporting, not diagnostic. | No one uses Sankey as a compounding-failure diagnostic for executive audiences. |
| **AI consulting deliverables** (McKinsey, BCG, PwC) | Internal AI platforms (McKinsey's Agents-at-Scale, PwC's Agent OS) but these are efficiency tools, not client-facing diagnostics. BCG reported 25% of $14.4B revenue from AI-related work. | No public-facing AI-generated interactive diagnostic product from any major consulting firm. The category remains a gap. |

### Landscape Position (Updated)

The five unique capabilities identified in the previous audit
remain unmatched:

1. **Root cause tracing** — still zero competitors
2. **Evidence quality assessment** — HighRadius added a validity
   predictor (triage score), but it's not gap analysis and it's
   enterprise-only. Still no competitor for the "what exists vs.
   what's needed" view.
3. **Recovery simulation** — still zero competitors
4. **Cost-to-dispute triage** — still zero competitors
5. **Executive-facing visualization** — still zero competitors

Glimpse's $35M raise and 200+ brands validate the market but
don't touch the diagnostic space. The fundraising narrative is
"recover money faster" — the same recovery-throughput positioning
as every other platform. This project's narrative is "here is why
you're generating losses and what it costs to fix each cause."
These are complementary, not competitive — the diagnostic demo
could lead a prospect to buy Glimpse for recovery operations
while hiring the demo's creator for the diagnostic consulting.

### Category Trends (Updated)

1. **Prevention talked, not built.** The Promomash and UpClear
   2026 reports both name prevention as the future. No vendor has
   shipped it. This project is the only tool that models
   prevention economics (recovery simulation, cost-to-dispute).

2. **Agentic AI is the new RPA.** HighRadius and RetailPath are
   replacing brittle portal bots with adaptive agents. Relevant
   for V2/product scope, not for the diagnostic demo.

3. **$5M-$50M segment still underserved.** Glimpse is the only
   credible funded option. Promomash is the budget alternative.
   Neither offers diagnostics. A CEO in this segment has no tool
   that explains why deductions happen — only tools that process
   them after they happen.

4. **Evidence-scoring UX is validated in adjacent categories.**
   Compliance tools (Relyance, Sprinto) have proven that
   requirement-vs-evidence scoring is an intuitive pattern. The
   dispute builder uses the same mental model, so prospects won't
   need to learn a new interaction paradigm.

---

## Phase 4: Synthesis & Next Moves
**Date:** 2026-05-16

### Cross-Reference Summary

The central finding from the last audit — the #1 internal problem
is hiding the #1 competitive advantage — has been fixed. The
chapter restructure successfully surfaces the five unique
capabilities in narrative sequence. The competitive position is
stronger than a month ago: Glimpse's $35M raise validates the
market, HighRadius's AI additions confirm the direction, and
nobody has built the prevention/diagnostic tool this demo is.

The remaining internal issues are detail-level, not structural.
But two of them directly threaten the demo's credibility with a
data-curious CEO:

1. **WIN_PROB discrepancy** — Chapters 4's simulation and cost
   views give different answers for the same deductions. A CEO
   who toggles between them sees contradictory numbers. This
   undermines the "here is what each fix is worth" promise that
   makes Chapter 4 the payoff of the whole narrative.

2. **Non-deterministic dates** — `disputeReadinessFor` uses the
   real clock while three views pin to 2026-05-31. The Sankey
   and the explorer can disagree on whether a deduction is past
   deadline. For a CEO clicking through, inconsistency = distrust.

Everything else is polish: CSS consolidation for visual
consistency, dead code removal for a clean repo, accessibility
for portfolio use, and test coverage for maintainability.

### Strategic Framing

The demo is one gate away from its purpose: friend preview →
prospect intro. The friend preview tests whether a cold viewer
can navigate the chapters, discover the five-failure story, and
arrive at "I need this" without a walkthrough. The remaining work
should optimize for that moment, not for long-term maintainability.

That means:
- Fix data bugs that would make a CEO distrust the numbers
- Remove visual noise that makes the demo feel unfinished
- Don't start a CSS rewrite before the friend sees it — spacing
  drift is invisible to non-designers
- Don't add more tests — the feature set is frozen

### Ranked Next Moves

| # | Move | Category | Why Now | Effort | Risk if Skipped |
|---|------|----------|---------|--------|-----------------|
| 1 | Fix WIN_PROB discrepancy | Bug fix | CEO sees contradictory numbers in Ch4 | 5 min | High — kills credibility |
| 2 | Pin DEMO_DATE everywhere | Bug fix | Sankey and views disagree on deadlines | 15 min | Medium — subtle but discoverable |
| 3 | Extract shared logic to domain.ts | Cleanup | Prevents more data discrepancies; readableOutcome, evidenceCategoryFor, WIN_PROB | 30 min | Low now, high if any constant changes |
| 4 | Delete dead code | Cleanup | Legacy CSS (~72 LOC) + screenshot scripts (~1,156 LOC). Noise in the repo. | 10 min | None for demo; repo feels unfinished |
| 5 | Friend preview | Gate | The whole point. Every other move is prep for this. | External | Prospect intro stays blocked |
| 6 | CSS custom properties for hardcoded hex values | Polish | Promotes 8+ repeated hex values to :root vars | 30 min | Visual drift continues |
| 7 | CSS pattern consolidation | Polish | ~465 LOC reduction, consistent spacing | 2 hrs | Demo works fine; code stays messy |
| 8 | Keyboard accessibility (Sankey + tables) | A11y | Needed for portfolio showcase, not for prospect demo | 1 hr | No impact on prospect intro |
| 9 | Domain logic tests | Testing | Cover disputeReadinessFor, buildSankeyData, isOnSelectedPath, computeKpis | 1 hr | No safety net for future changes |
| 10 | Missing useMemo + O(n²) fix | Perf | OriginClusteringView + ExplorerView + RetailerScorecardView | 15 min | Invisible at current data size |

### Recommended Sequence

**Before friend preview (< 1 hour total):**
1. Fix WIN_PROB (Move #1) — 5 min
2. Pin DEMO_DATE (Move #2) — 15 min
3. Extract shared logic (Move #3) — 30 min
4. Delete dead code (Move #4) — 10 min

These four moves fix the two data bugs, eliminate the duplication
that caused them, and clean the repo. After this, the demo is
friend-preview-ready.

**Friend preview (Move #5):** Hand off the live URL. Capture
feedback. Decide what needs fixing before prospect intro.

**After friend feedback (prioritize based on what they say):**
6–10 are polish. Do them if the friend says the demo feels rough,
or if the project becomes a portfolio showcase. Don't do them
preemptively — the friend's reaction determines what matters.

### What NOT to Do

1. **Don't start CSS consolidation before the friend preview.**
   Spacing drift is invisible to non-designers. A CEO won't
   notice 9px vs 10px padding. If the friend flags visual
   inconsistency, consolidate then.

2. **Don't add more features.** The competitive advantage is the
   combination of five capabilities, not the number of views. The
   chapter structure now surfaces them clearly. Adding views makes
   the "busy" problem come back.

3. **Don't optimize performance.** The O(n²) and missing useMemo
   are invisible at 3,333 deductions. Only matters if the dataset
   grows 10x, which is V2 scope.

4. **Don't build accessibility before the prospect intro.** The
   prospect will use a mouse. Accessibility matters for portfolio
   use and is the right thing to do, but it's not the gate.

5. **Don't write more tests before the friend preview.** The
   feature set is frozen. Tests protect against regressions from
   changes — if you're not changing anything, you don't need more
   tests. Write them after friend feedback when you know what
   you'll be changing.

### PLAN.md Updates

Phase A tasks should be checked off (completed but unchecked).
A new Phase D (pre-preview cleanup) should be added between
Phase C's tests and the friend preview, containing Moves #1-4.
