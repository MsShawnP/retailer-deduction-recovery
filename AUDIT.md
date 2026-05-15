# Project Audit

## Phase 1: Baseline Assessment
**Date:** 2026-05-15
**Project:** Retailer Deduction Recovery

### What Was Intended

A tool that makes dirty data costs visible to a CEO — specifically,
what outgrown bootstrap processes are costing them in unrecovered
retailer deductions, what evidence is needed to successfully dispute,
and where they're lacking that evidence. Interactive and explorable,
not a static report.

### What Exists Today

A functionally complete React demo with 10 connected views on a
single page:

1. Sankey flow (3-layer: type → dispute readiness → outcome)
2. Deduction explorer (6-card drill-down)
3. Causation tracing (order timeline)
4. Recovery simulation (toggle fixes, watch dollars shift)
5. Cost-to-dispute profitability filter
6. Dispute builder (evidence gap analysis)
7. Timeline pressure (deadline urgency)
8. Post-audit risk exposure
9. Retailer scorecard
10. Root cause clustering by origin

All views share a single `selection` state — clicking in one view
updates all others. Data pipeline generates synthetic deductions for
a fictional ~$25M food manufacturer across 7 retailers.

**The owner's assessment:** It works, but it feels "busy" — like
it's asking the user to do too much.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Visualization | d3 + d3-sankey |
| Data pipeline | Python → Postgres → static JSON export |
| Deployment | Cloudflare Pages |
| Verification | Playwright screenshot scripts (14 scripts) |
| Testing | None (zero test files) |

### Project Health Indicators

- **Activity:** Active — last commit 2026-05-13, 94 total commits
- **Documentation:** Excellent — CLAUDE.md, PLAN.md, HANDOFF.md,
  DECISIONS.md, FAILURES.md, data/schema.md, 7 retailer research
  files. Well-maintained throughout the build.
- **Test coverage:** Zero. No unit, integration, or component tests.
  Playwright screenshot scripts serve as visual smoke tests but are
  not automated test suites.
- **Dependencies:** Current — React 19, Vite 8, TypeScript 6, no
  known vulnerabilities flagged.
- **Code size:** ~8,900 LOC in frontend/src across 10 view
  directories + shared types/data modules.

### Gap Analysis

**What was intended vs. what exists:**

The functional scope is delivered — all 10 features work and are
connected. The gap isn't missing features; it's information
architecture. The project was ideated with Claude Chat and Gemini
before the owner adopted a structured build workflow. That shows:

1. **No UX narrative.** Ten views on one scrolling page with no
   guided path. A data-curious CEO gets all ten tools at once
   instead of being led through a discovery sequence (see the
   problem → understand why → see what's fixable → decide what
   to do). The "busy" feeling is cognitive overload from equal
   visual weight on everything simultaneously.

2. **No information hierarchy.** Every view competes for attention.
   The Sankey is the intended entry point, but below it are 9
   peer-level sections with no progressive disclosure. There's no
   "start here, go deeper if you want" structure.

3. **No test coverage.** The 14 Playwright screenshot scripts
   verify visual appearance but aren't CI-integrated tests. A
   refactor to fix the "busy" problem (rearranging views, adding
   tabs/navigation, changing layout) has no safety net.

4. **Feature-complete but not story-complete.** The five
   compounding failures are the narrative backbone (per CLAUDE.md),
   but the UI doesn't walk the user through that sequence. The
   failures live in explorer cards and causation traces — they're
   present but not foregrounded.

5. **No user testing.** The "friend preview" task in PLAN.md is
   still unchecked. The "busy" assessment is the owner's intuition,
   not validated feedback — but it's a credible intuition given
   the information density.

### Audit Motivation

The project was ideated and built before the owner had a structured
workflow for scoping, building, and improving projects. The audit
applies that rigor retroactively. The core concern: the tool works
but feels busy — it's showing everything instead of guiding the
user through the story the data tells.

---

## Phase 2: Internal Review
**Date:** 2026-05-15
**Dimensions reviewed:** UX, Architecture

### Top Opportunities (by leverage)

| # | Finding | Dimension | Impact | Effort | Leverage | Severity |
|---|---------|-----------|--------|--------|----------|----------|
| 1 | 16 sections at equal weight on one scroll — no progressive disclosure | UX | 5 | 3 | 1.67 | Critical |
| 2 | No narrative structure guiding the CEO through the five failures | UX | 5 | 3 | 1.67 | Critical |
| 3 | Bottom tables (by-type, by-retailer, by-distributor) are redundant with Sankey + scorecard | UX | 3 | 1 | 3.00 | Minor |
| 4 | sankey/data.ts is the shared domain module but named as Sankey-specific | Arch | 2 | 1 | 2.00 | Minor |
| 5 | App.tsx is a 609-line monolith owning all state + 4 inline components | Arch | 3 | 2 | 1.50 | Important |
| 6 | CSS patterns duplicated across 11 view stylesheets (~2,700 lines total) | Arch | 2 | 3 | 0.67 | Minor |

### Detailed Findings

#### UX

**CRITICAL — Flat scroll with no information hierarchy**

App.tsx renders 16 sections in a single scroll:
KPIs → filter row → Sankey → cohort table → explorer → trace →
simulation → cost → builder → pressure → post-audit → scorecard →
origin → by-type table → by-retailer table → by-distributor table.

Every section has an h2 with equal visual weight. Section
descriptions are 15px soft-colored text that can't compete with
the bold data above and below them. A CEO opening this cold sees
all 16 sections simultaneously and has no guidance on where to
start or what matters.

This is the primary cause of the "busy" feeling.

**CRITICAL — No narrative arc matching the five failures**

The CLAUDE.md defines a clear narrative: visibility → process
gaps → evidence quality → evidence accessibility → timeliness,
where each failure compounds the next. The UI does not walk the
user through this sequence. Instead:

- The Sankey shows type → readiness → outcome (compressed)
- The explorer shows all 6 failure layers on a single deduction
- The remaining 8 views are ordered by build sequence, not story

The story IS in the data. But the UI presents it as "here are 10
tools, go explore" rather than "here is what's happening, and each
screen shows you why it's getting worse." The value is hidden
because the narrative structure isn't driving the layout.

A possible reframe: group views into chapters that match the
narrative. Chapter 1 (The Problem): Sankey + KPIs — the shape of
losses. Chapter 2 (Why): Explorer + causation + origin clustering
— what's causing this. Chapter 3 (Evidence Gaps): Builder +
post-audit + scorecard — what you need vs. what you have.
Chapter 4 (What to Do): Simulation + cost + pressure — the fix,
the economics, the urgency. Each chapter visible from a nav; only
the active chapter's views render below the Sankey. Cross-links
still work, they just also switch chapters.

**MINOR — Bottom tables are vestigial**

The by-type, by-retailer, and by-distributor tables at the bottom
of App.tsx (lines 288–378) were the original landing view before
the 10 feature views were built. They duplicate information
already visible in the Sankey (by type), retailer scorecard (by
retailer/distributor), and KPI row. Removing them shrinks the
scroll by 3 sections with zero information loss.

**MINOR — Cross-links create "choose your own adventure" fatigue**

Every view invites the user to jump elsewhere: Trace →, Filter →,
View causation trace →. This is architecturally excellent — the
shared selection model makes it work cleanly. But with all views
visible simultaneously, each cross-link is an interruption rather
than a guided transition. If views were grouped into chapters, the
same cross-links would feel like "go deeper" rather than "go
somewhere else."

#### Architecture

**GOOD — View components are cleanly isolated**

Each of the 11 views is a self-contained TSX + CSS pair in its
own directory. No view imports from another view. All
communication goes through App.tsx props (cohort, onTrace,
tracedDeductionId, selection). This means views can be
rearranged, hidden, grouped into tabs, or lazy-loaded without
breaking each other. The architecture supports the UX fix.

**GOOD — Single selection model is the right abstraction**

The `Selection` union type (node | link | retailer | cluster)
in sankey/data.ts with `isOnSelectedPath` as the universal
filter is a clean design. Every view gets the same filtered
cohort. Adding a navigation layer wouldn't change this — it
would just control which views are visible.

**IMPORTANT — App.tsx is a monolith**

App.tsx (609 lines) owns: data loading, selection state, date
range state, traced deduction state, focused deduction state,
KPI computation, by-type aggregation, by-retailer aggregation,
and 4 inline components (Kpi, CohortBar, TimeRangeSelector,
render logic for 3 bottom tables). This is manageable today but
would become the bottleneck for any navigation refactor. The
inline components and aggregation functions should be extracted
before adding routing or tab logic.

**MINOR — sankey/data.ts is misnamed**

sankey/data.ts (354 lines) is the shared domain module: Selection
type, isOnSelectedPath, rootCauseFor, evidenceQualityFor,
accessibilityFor, timelinessFor, disputeReadinessFor,
ORIGIN_DIMENSIONS, TYPE_LABELS, OUTCOME_COLORS. Seven of the 11
views import from it. The name says "Sankey data" but the content
says "domain logic." This isn't blocking but it misleads anyone
reading imports for the first time.

**MINOR — CSS duplication across views**

11 view CSS files total ~2,700 lines with repeated patterns:
card layouts, tag/pill styles, table formatting, empty-state
styling, responsive breakpoints. Each file reinvents similar
patterns. Not blocking, but a shared component library or CSS
utility classes would reduce drift if the visual language is
being tightened during the narrative refactor.

### Summary

The architecture is sound — isolated views, clean shared state,
no tangled imports. It's ready for the structural change the UX
needs. The UX problem is clear: 16 sections dumped on one scroll
with no narrative hierarchy. The story exists in the data and in
CLAUDE.md's five-failure framework; the UI just doesn't tell it.
The highest-leverage move is grouping views into narrative
chapters with progressive disclosure — and the architecture
already supports this without a rewrite.

---

## Phase 3: Landscape Scan
**Date:** 2026-05-15
**Category:** Retailer deduction management platforms for CPG/food
manufacturers

### Competitors / Similar Projects

| # | Name | Target | Description | Traction |
|---|------|--------|-------------|----------|
| 1 | HighRadius | Enterprise ($1B+) | End-to-end O2C deduction automation — portal harvesting from 100+ retailers, AI validity prediction, automated dispute routing | Market leader, 1,000+ enterprise customers |
| 2 | iNymbus | Mid-large (1,000+ claims/mo) | Cloud RPA bots that log into 50+ retailer portals, retrieve docs, assemble dispute packages, submit claims | $0.40–$0.70/claim; volume-focused |
| 3 | Vividly | Growth/mid-market ($5M–$200M) | TPM platform with deduction module — trade planning, deduction matching, dispute filing, managed service tier | Customers: Health-Ade, Quinn Snacks, Munk Pack |
| 4 | Glimpse | All CPG, optimized for emerging | AI-native deduction management — ingests remittances, categorizes, disputes, reconciles into QBO/NetSuite | YC-backed, $35M Series B (Mar 2026), 200+ brands, 14x YoY |
| 5 | Promomash / DeductionGenius | Small CPG ($2M+) | TPM suite with managed-service deduction recovery — categorize, validate, dispute on brand's behalf | Most transparent pricing: $349–$1,250/mo |
| 6 | Inmar / DeductionsLink | SMB CPG | SaaS collaboration platform — centralized intake, AI remittance parsing, cross-functional workflows, deadline alerting | Part of broader Inmar Intelligence suite |
| 7 | Vistex | Enterprise (SAP shops) | SAP-native revenue lifecycle platform — pricing, promotions, rebates, chargebacks, deductions | Gartner-reviewed, dominant in SAP ecosystem |
| 8 | RetailPath | Mid-large CPG | Autonomous agents for chargeback/deduction disputes with deep 3PL and retailer portal integration | 1-2 day onboarding (vs. 6-12 months for HighRadius) |
| 9 | CPGvision | Mid-large ($50M–$500M) | AI-forward TPM — promotion planning, deduction validation, scenario planning | ML-driven decision support |

### Feature Matrix

| Feature | This Project | HighRadius | iNymbus | Vividly | Glimpse | Promomash | Inmar | Vistex | RetailPath | CPGvision |
|---------|-------------|-----------|---------|---------|---------|-----------|-------|--------|------------|-----------|
| Deduction categorization by type | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Retailer-specific rules and codes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dispute deadline tracking | ✅ | ✅ | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ | ✅ |
| Reporting by retailer and type | ✅ | ✅ | ❌ | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ |
| Root cause tracing (operational → deduction) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ❌ |
| Evidence quality assessment | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Recovery simulation / "what if" modeling | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ❌ | 🟡 |
| Cost-to-dispute triage | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Evidence gap analysis per deduction | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Executive-facing visualization | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Retailer portal integration | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Automated dispute filing | ❌ | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 |
| ERP / accounting sync | ❌ | ✅ | 🟡 | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ |
| Live client data ingestion | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Managed service / human expert layer | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Landscape Position

#### Table Stakes (standard in category)

Every commercial platform has:
- Deduction categorization by type
- Retailer-specific rules
- Some form of dispute workflow
- ERP or accounting integration
- Retailer portal integration

This project has the first two but not the last three. That's
appropriate — it's a diagnostic/visualization demo, not an
operational tool. The missing table-stakes features are V2 scope,
not V1 gaps.

#### Where This Project Is Stronger

**Five features that zero commercial platforms offer:**

1. **Root cause tracing.** No platform connects an operational
   failure (wrong label → hand count → perceived short ship →
   deduction) back through the supply chain to the specific
   process breakdown. Platforms categorize deductions; this demo
   traces causation. RetailPath gets partial credit for multi-
   source visibility on compliance fines, but nobody does full
   order-to-deduction causation tracing.

2. **Evidence quality assessment.** Platforms collect and store
   evidence. None evaluate whether the evidence is strong enough
   to win a dispute, or flag weak evidence before the deadline
   passes. This demo scores every deduction's evidence quality
   and surfaces the gap between "what you have" and "what you
   need."

3. **Recovery simulation.** "If we fix our labeling, what happens
   to this deduction category?" has no commercial answer. Vistex
   and CPGvision offer scenario planning for trade promotions,
   not for operational fixes. This demo's five-toggle simulation
   answers that question directly.

4. **Cost-to-dispute triage.** No platform computes per-deduction
   ROI of disputing — amount × win probability − labor cost.
   This is a basic economic question that the entire category
   ignores.

5. **Executive-facing visualization.** Every reviewed platform is
   built for AR teams, finance teams, or trade teams. None
   produce exploratory, narrative-driven views for executives.
   This demo is the only tool in the landscape designed for a
   CEO to use directly.

#### Where This Project Is Weaker

- **No live data ingestion.** All competitors connect to real
  retailer portals and accounting systems. This demo uses
  synthetic data. (Appropriate for a prospect demo; would need
  to change for a product.)
- **No automated dispute filing.** The dispute builder shows
  evidence gaps but doesn't submit disputes. Most competitors
  make this their core value prop.
- **No managed service component.** The market is converging on
  software + human expert teams (Glimpse, Promomash, Vividly).
  This is a tool, not a service.
- **No ERP integration.** Table stakes in the category.

All four are explicitly out of scope for V1 and appropriate for
a demo. They're the gap between "diagnostic tool" and "product."

#### Unique Differentiators

The demo occupies a space that does not exist in the commercial
landscape: **diagnostic visualization that traces the
operational causes of deductions and models the financial impact
of fixing them.** Every commercial tool is built to process
deductions (categorize → dispute → recover). None are built to
explain why deductions happen and what operational changes would
prevent them.

This is the difference between "recover $X from your existing
deduction backlog" (what competitors sell) and "here is why
you're generating $X in deductions and what it costs to fix
each cause" (what this demo shows).

The five-failure framework (visibility → process gaps → evidence
quality → accessibility → timeliness) has no commercial
equivalent. It's a consulting insight delivered as an
interactive tool.

#### Category Trends

1. **Prevention over recovery.** The market is shifting from
   "recover what you lost" to "stop generating deductions."
   Promomash 2026 trends piece names this explicitly. This
   demo is already positioned here — the simulation and root
   cause views are prevention-focused.

2. **AI agents replacing RPA.** First-gen automation (iNymbus)
   used brittle portal bots; newer platforms (RetailPath,
   Glimpse) use adaptive AI agents. This doesn't affect the
   demo directly but signals where product development would
   head.

3. **Blended pricing models.** Glimpse's SaaS + commission
   model aligns vendor incentive with client outcome. Newer
   entrants are adopting this. Relevant if the demo becomes a
   product.

4. **The $5M–$50M segment is underserved.** HighRadius, Vistex,
   iNymbus, RetailPath all skew enterprise. Glimpse and
   Promomash are the only credible options for a ~$25M brand,
   and neither offers the diagnostic depth this demo has.

### Adjacent Category Scan

The deduction management space has no direct competitors for
what this demo does. Searching adjacent categories — data
storytelling, scenario simulation, consulting deliverables,
supply chain diagnostics — confirms the gap from a different
angle.

#### Data Storytelling Platforms

| Tool | Overlap | What It Does Better | What It's Missing |
|------|---------|--------------------|--------------------|
| **Flourish** (flourish.studio) | Narrative sequencing, CEO-readable, embed-anywhere | Polished production quality, no-code authoring, responsive, mature CMS integration | No connected interactive views (clicking one chart doesn't filter another), no simulation mechanics, no domain model — it's a publishing tool, not an analytical one |
| **Observable** (observablehq.com) | Connected reactive views, D3 power, data exploration | Full JavaScript reactivity (change one input, everything downstream recalculates), strong dev community, 1M+ notebooks | Not a deliverable format for non-technical CEOs; requires technical literacy; no narrative arc baked in; building a full app requires Framework (separate product) |
| **Tableau Story Points** (tableau.com) | Guided narrative, executive-facing, enterprise-grade | Massive enterprise install base, IT-friendly, connects to live data | Story Points are linear slide sequences, not explorable branching narratives; no simulation; no root cause logic; Tableau Data Stories (auto-generated NLP narratives) retired Jan 2025 |

**Takeaway:** Data storytelling tools do narrative OR
interactivity, not both. Flourish tells stories but isn't
interactive. Observable is deeply interactive but isn't a
story. Tableau's attempt at combining both (Data Stories) was
retired. This demo does both — it's a narrative told through
interactive exploration.

#### Scenario Simulation Tools

| Tool | Overlap | What It Does Better | What It's Missing |
|------|---------|--------------------|--------------------|
| **Synario** (synario.com) | Toggle-on/toggle-off assumptions, board-room presentations | Financial model depth, professional scenario management, patented toggle mechanics | No operational domain model — only financial assumptions; can't model "fix label compliance" as a scenario lever; no root cause or evidence layer |
| **Causal / Lucanet** (causal.app) | Non-technical what-if scenarios, visual comparison | Plain-English formula syntax, multi-scenario comparison, CFO-grade output | Acquired by Lucanet 2024-25, losing simplicity; no operational inputs; no deduction domain; models financial abstractions, not supply chain reality |

**Takeaway:** Scenario tools model financial assumptions
("revenue grows 10%"). This demo models operational reality
("if we fix labeling, 73% of label fines go away and evidence
quality upgrades from handwritten to digital"). The toggle
mechanics look similar; the inputs are fundamentally different.
A CEO who sees Synario thinks "spreadsheet with better UI." A
CEO who sees this demo thinks "I can see what's broken and what
it costs to fix."

#### Consulting Firm Interactive Deliverables

McKinsey Solutions, BCG's FACET, and similar consulting-firm
tool products overlap on form factor: interactive diagnostic
tools delivered to C-suite audiences with scenario modeling and
operational benchmarking. They're credentialed, enterprise-
distributed, and backed by consulting relationships.

**What they do better:** Brand authority, live data integration,
industry benchmarking against peers.

**What they can't do:** These tools are licensed to large
enterprises via consulting engagements. A ~$25M specialty food
brand doesn't have the data infrastructure McKinsey assumes, the
budget for a consulting engagement, or the IT team to onboard
an enterprise diagnostic. This demo delivers the same form
factor — interactive diagnostic for a CEO — without requiring
any of that. It's a consulting-quality deliverable accessible
at a scale the consulting firms don't serve.

#### Cross-Domain Structural Analogs

Two domains have solved problems structurally identical to what
this demo does, just in different industries:

1. **Legal case preparation** (Relativity, Everlaw) — scores
   document completeness against claim requirements. The demo's
   evidence readiness view is the same pattern: "what do you
   have vs. what do you need" applied to deduction disputes
   instead of litigation discovery.

2. **Insurance claims triage** (Guidewire, Duck Creek) — routes
   claims by expected recovery minus processing cost. The demo's
   cost-to-dispute triage (amount × win probability − labor) is
   structurally identical. The difference: insurance tools bury
   this in a workflow engine; this demo makes it visible and
   explorable.

### Summary

Across 15 tools in 5 categories — deduction management,
data storytelling, scenario simulation, consulting
deliverables, and cross-domain analogs — no single tool
combines operational root cause narrative with executive-
facing simulation. Each adjacent category has one piece:

- Storytelling tools do narrative (Flourish, Tableau)
- Simulation tools do what-if (Synario, Causal)
- Deduction tools do processing (HighRadius, Glimpse)
- Consulting tools do diagnostics (McKinsey Solutions)

This demo does all four. The competitive moat isn't any one
feature — it's the combination of diagnosis + narrative +
simulation + executive accessibility in a domain where every
existing tool chose exactly one of those.

The "busy" UX problem is hiding this. A CEO who opens the
demo today sees 16 sections and bounces. If the UI guided
them through the story — see the problem, understand why,
see what's fixable, decide what to do — they'd see something
that doesn't exist anywhere else in the market.

---

## Phase 4: Differentiation & Next Moves
**Date:** 2026-05-15

### Cross-Reference Summary

The audit's central finding: **the #1 internal problem is
directly hiding the #1 competitive advantage.** Phase 2 found
that 16 flat sections with no narrative hierarchy creates the
"busy" feeling. Phase 3 found that this demo has five unique
capabilities no commercial platform offers — root cause tracing,
evidence quality assessment, recovery simulation, cost-to-dispute
triage, and executive-facing visualization. The combination of
diagnosis + narrative + simulation + executive accessibility is
the competitive moat. But a CEO who opens the demo today sees 16
sections and bounces before discovering any of it.

This is rare: the highest-leverage internal improvement IS the
strategic move. Adding a narrative chapter structure doesn't just
make the tool less busy — it reveals the unique story that no
competitor can tell. Every other move is either prep work that
enables this or a quick win that clears the path.

The architecture already supports the fix. Views are isolated,
the shared selection model works, no view imports another view.
The refactor is structural (add navigation, group views), not
architectural (no rewrites, no new state management).

### Ranked Next Moves

| # | Move | Category | Strategic | Internal | Effort | Score | Description |
|---|------|----------|-----------|----------|--------|-------|-------------|
| 1 | Remove vestigial bottom tables | Foundational | 1 | 3 | 1 | 4.0 | Delete the 3 redundant by-type / by-retailer / by-distributor tables. Zero information loss — data already in Sankey + scorecard. 5-minute noise reduction. |
| 2 | Narrative chapter structure | Leapfrog | 5 | 5 | 3 | 3.3 | Group views into 4 story chapters (The Problem → Why → Evidence Gaps → What to Do) with tab/chapter navigation. Only active chapter renders below the persistent Sankey + KPIs. Cross-links switch chapters. This is the move — it fixes the "busy" problem AND surfaces the unique capabilities in sequence. |
| 3 | Rename sankey/data.ts → domain.ts | Foundational | 0 | 2 | 1 | 2.0 | The shared domain module (Selection, isOnSelectedPath, rootCauseFor, etc.) is named as Sankey-specific but imported by 7+ views. Quick rename + import update. |
| 4 | Extract App.tsx inline components | Foundational | 0 | 3 | 2 | 1.5 | Pull Kpi, CohortBar, TimeRangeSelector, and aggregation functions out of App.tsx before adding navigation logic. Keeps the monolith from getting worse. |
| 5 | Add test coverage for refactored navigation | Foundational | 0 | 3 | 3 | 1.0 | After the chapter structure lands, add component tests for navigation state, chapter switching, cross-link behavior. Safety net for future changes. |

### Recommended Sequence

**Phase A — Clear the path (< 1 hour)**
1. Remove bottom tables (Move #1)
2. Rename sankey/data.ts → domain.ts (Move #3)
3. Extract App.tsx inline components (Move #4)

These three are independent, low-risk, and reduce noise before
the main refactor. Do them in one session.

**Phase B — Build the narrative (main effort)**
4. Narrative chapter structure (Move #2)

This is the primary deliverable. Suggested chapter mapping:

| Chapter | Name | Views | Story beat |
|---------|------|-------|------------|
| 1 | The Problem | Sankey + KPIs + cohort table | "Here is the shape of your losses" |
| 2 | Why This Happens | Explorer + causation trace + origin clustering | "Each deduction traces back to a specific operational failure" |
| 3 | The Evidence Gap | Dispute builder + post-audit risk + retailer scorecard | "You don't have what you need to win, and here's what that costs" |
| 4 | What to Do About It | Recovery simulation + cost-to-dispute + timeline pressure | "These fixes, in this order, recover this much money" |

The Sankey, KPIs, filter row, and cohort bar stay persistent
(always visible). Chapter navigation sits below them. Only the
active chapter's views render. Cross-links (Trace →, Filter →)
switch chapters when they point to a view in a different chapter.

No React Router needed — this is 4 tabs with local state, not
URL-based routing. The chapter index is one more piece of state
in App.tsx alongside selection, dateRange, and tracedDeductionId.

**Phase C — Harden (after chapter structure stabilizes)**
5. Add tests (Move #5)

### What NOT to Do

1. **Don't chase competitor features.** Portal integration,
   automated dispute filing, ERP sync — these are V2/product
   scope, not demo scope. Chasing them means competing where
   HighRadius and Glimpse are strongest. The demo's advantage is
   diagnostic depth, not operational automation. Don't dilute it.

2. **Don't add more views.** The problem is too many sections,
   not too few. Every new view added to a flat scroll makes the
   "busy" problem worse. If a new capability is needed, it should
   either replace an existing view or fit within a chapter that
   already has room.

3. **Don't do a CSS cleanup before the narrative refactor.** The
   chapter structure will change layout patterns. Cleaning up CSS
   duplication now means redoing it after the refactor. Wait until
   the new structure is stable.

4. **Don't over-engineer navigation.** Four chapters, one active
   at a time, local state in App.tsx. No React Router, no URL
   hash routing, no animation library. The simplest thing that
   works. Complexity can be added later if the demo becomes a
   product.

5. **Don't build a "guided tour" or onboarding overlay.** The
   narrative structure should make the tool self-explanatory. If
   the chapters are right, the CEO reads "The Problem" and clicks
   forward. A tour is a band-aid for a confusing UI; fix the UI.
