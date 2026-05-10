# Retailer Deduction Recovery — Handoff Log

Session-by-session state. Updated by /log mid-session and /wrap at
session end.

For durable choices, see DECISIONS.md.
For the current work arc, see PLAN.md.
For things that didn't work, see FAILURES.md.

---

## 2025-05-07 — Project initialized

**Started from:** New project setup. 95% confidence interview
completed in chat.

**Did:** Ran full project interview covering business case, domain
context (five compounding failures: visibility, root cause/process
gaps, evidence quality, evidence accessibility, timeliness),
deduction taxonomy, prospect profile (CEO who likes playing with
data, friend referral, Cinderhaven modeled on real prospect),
technology decisions (React + HTML, static JSON, Netlify), feature
list (ten features including Sankey flow, recovery simulation,
cost-to-dispute filter, post-audit risk exposure, origin point
clustering), and interaction design (connected views, zoom-on-click
Sankey, discoverable cost data). Created CLAUDE.md, DECISIONS.md,
HANDOFF.md, PLAN.md, FAILURES.md, and chat project instructions.
Nine initial decisions captured.

**State:** All workflow docs created and ready to copy into repo.
Repo exists on GitHub (retailer-deduction-recovery). No code yet.
First arc defined in PLAN.md: full build — data extension through
all ten features to deployed demo.

**Next:** Copy workflow files into repo. Begin first PLAN.md task:
research retailer-specific dispute processes, deadlines, portals,
and deduction codes.

---

## 2026-05-07 19:16

**What changed:** Added research/retailers/ notes for Walmart, Costco,
Whole Foods, UNFI, KeHE, Wegmans, Sprouts; checked off first Phase 1
task in PLAN.md.

**Why:** First Phase 1 task. Research grounds the deduction data
schema (next task) in real retailer behavior, with explicit
verification gaps so synthetic-data choices flag confirmed vs.
inferred.

**State:** Seven retailer research files committed (e9534ec) with
citations and verification gaps. whole-foods.md currently includes
Amazon Vendor Central context, but Cinderhaven sells into WFM
directly, not as a 1P Amazon vendor — that file needs Amazon scope
removed before it informs the schema.

**Next:** Trim Amazon Vendor Central content from whole-foods.md
(WFM-only scope); then design the deduction data schema (Phase 1
task 2).

---

## 2026-05-07 19:48

**What changed:** Designed deduction data schema (data/schema.md) —
13 new tables extending cinderhaven-data without replacing the base
chargebacks table; volume target $750K–$1.2M annualized.

**Why:** Phase 1 task 2. Schema feeds the next task (Python data
generation). Decisions and tradeoffs documented in data/schema.md
"Design choices" section.

**State:** Schema spec committed (0e7221a + 6664365). PLAN.md task 2
checked. whole-foods.md trimmed to WFM-only earlier (b8ae067). Base
`chargebacks` table preserved; new tables layer on with order-grain.
No code yet.

**Next:** Phase 1 task 3 — build Python scripts to extend the
cinderhaven-data SQLite database with the new tables. Start with
static seeds (retailers, retailer_rules, deduction_codes,
edi_requirements) before generating orders/shipments/deductions.

---

## 2026-05-07 20:33

**What changed:** End-to-end synthetic deduction dataset built —
orders/pack/ship/deductions/remittances/disputes/post-audit, ~$1.4M
deduction value, 8.6% recovery rate. Six of eight Phase 1 tasks now
complete.

**Why:** Phase 1 tasks 4, 5, 6 (deductions, disputes, pack/ship). Data
is the foundation for the React app's connected views; numbers had to
land in realistic ranges (3-5% of revenue, lots of handwritten
evidence, low recovery) before the demo would tell the right story.

**State:** `python scripts/build_deductions_db.py --force --full`
rebuilds the entire deduction-extended DB end-to-end. Counts: 5,838
orders / 30,127 lines / 5,838 pack_records / 5,838 shipments / 3,333
deductions (incl. 41 post-audit) / 553 remittances / 1,505 disputes /
3,303 dispute_evidence / 41 post_audit_claims. Cinderhaven-data base
tables untouched (90/902/12,507/386). Two Phase 1 tasks remain: JSON
export and dataset validation.

**Next:** Phase 1 task 7 — build the JSON export script that
transforms the SQLite extended DB into the static JSON files the
React app will consume. Then task 8 (validate) before Phase 2 (React
scaffold + Sankey).

---

## 2026-05-07 20:56

**What changed:** Phase 1 complete — JSON export and validator
landed. Three JSON files in data/json/ (summary, deductions,
retailers); 36-check validator passes clean.

**Why:** Closes out the data foundation. Phase 2 needs static JSON
to render against, and the validator gives confidence the
distributions are honest before the demo locks in.

**State:** All eight Phase 1 tasks checked off in PLAN.md. Running
`python scripts/build_deductions_db.py --full` end-to-end now also
exports JSON and runs the validator (36 PASS / 0 WARN / 0 FAIL).
Caught and fixed one bug — post_audit_claims was setting is_vague=1
on non-vague rows. Phase 2 untouched.

**Next:** Phase 2 task 1 — set up React project, build system, and
Netlify deploy config. Frontend will live in a `frontend/` (or
`app/`) subdirectory and consume data/json/ at build time.

---

## 2026-05-07 21:44

**What changed:** Phase 2 complete — Sankey 6-layer flow with
click-to-zoom, color-blind-safe outcome layer, and selection-state
architecture wired through KPIs and tables for connected views.

**Why:** Sankey is the demo's centerpiece. With the selection-state
architecture lifted into App.tsx, every Phase 3 feature view can
plug into the same filter signal without re-architecting.

**State:** Vite + React + TS scaffold under `frontend/`, dev server
runs from `npm run dev`, build passes, Netlify config at root. The
landing page renders 4 KPIs, the Sankey, and by_type / by_retailer
tables. Click any Sankey node or band → KPIs and both tables
recompute from the filtered cohort, the clicked path stays at full
opacity while everything else fades to ~4%. Outcome layer uses
hue-distinct colors so the four lost_* variants are
deuteranopia/protanopia-safe. Playwright screenshot scripts (default
+ clicked) live in `frontend/` for visual verification.

**Next:** Phase 3 task 1 — deduction explorer. Click a single
Sankey node or table row → drill-down panel showing one deduction
with all six layers (the deduction itself, visibility/pattern, root
cause, evidence quality, accessibility, timeliness) plus its order /
shipment / pack record / dispute chain.

---

## 2026-05-07 22:16

**What changed:** Phase 2 polish landed — Economist palette, serif
typography at 18/16/15px minimums, table split into retailer +
distributor, full-bleed Sankey with reversed teal gradient,
simplified outcome colors (red/green/gray), and a deduction-type
dropdown bidirectionally synced with the Sankey selection.

**Why:** Locked in the visual language and interaction pattern
before nine Phase 3 features inherit them. Cheaper to fix the
foundation now than to repaint nine views later.

**State:** Landing page is the centerpiece — KPIs, dropdown filter,
full-bleed Sankey with click-to-zoom, and three tables (by type,
by retailer, by distributor) all driven off a single `selection`
state. Hover and click both work; tables and KPIs recompute from the
filtered cohort. Playwright screenshot scripts in `frontend/`
(default, click, dropdown) verify behavior visually. Phase 3 not
started.

**Next:** Phase 3 task 1 — deduction explorer. Build a six-layer
drill-down view below the Sankey that surfaces, for the currently
selected cohort, the deduction itself / visibility-pattern / root
cause / evidence quality / accessibility / timeliness. Plugs into
the same `selection` state — no architectural change needed.

---

## 2026-05-07 22:40

**What changed:** Deduction explorer landed — 3-column 6-card
drill-down below the Sankey, with prev/next/random nav and
cause-specific prose for each root-cause variant.

**Why:** First Phase 3 feature done. The explorer turns "I see a
red band on the Sankey" into "I'm looking at deduction DED-X, here
is exactly what happened and why" without a context switch.

**State:** ExplorerView reads cohort from the same `selection`
state the Sankey/dropdown share. Cards 1-6 render the deduction
itself, peer-group context, root cause + prose, evidence quality
and missing items, accessibility + retrieval cost, and color-coded
timeliness with outcome. Cohort resets to top whenever the filter
changes. Verified via Playwright that filter → cohort → explorer
all stay in sync; zero console errors.

**Next:** Phase 3 task 2 — causation tracing. Pick a single order
from the explorer (or jump in independently) and walk its full
chain: PO → pack record → label decision → ship → BOL → receiving
→ deduction → dispute attempt → outcome. The explorer shows one
deduction's six layers in parallel; causation tracing shows one
order's life sequentially.

---

## 2026-05-07 22:43 — /wrap

**Started from:** Project just initialized, no code or data.

**Did:** Built end-to-end. Phase 1 (research, schema, generation
pipeline, JSON export, validator) → Phase 2 (Vite/React/TS scaffold,
d3-sankey 6-layer flow, click-to-zoom, Economist palette + serif
typography, dropdown filter, retailer/distributor table split,
selection-state architecture wiring KPIs and tables) → Phase 3 task 1
(deduction explorer with 3-col 6-card drill-down, prev/next/random
nav, root-cause prose).

**State:** Local DB rebuildable end-to-end via
`python scripts/build_deductions_db.py --full` (36 PASS / 0 FAIL).
React app at http://localhost:5173/: KPIs / dropdown / Sankey /
explorer / 3 tables, all driven off a single `selection` state.
Origin/master fast-forwarded with ~25 commits since init. Phases 1
and 2 done; Phase 3 task 1 done; 8 Phase 3 features remaining.

**Next:** Phase 3 task 2 — causation tracing. Sequential timeline
of one order: PO → pack → label decision → ship → BOL → receiving
→ deduction → dispute → outcome. Likely a new component (different
framing than the explorer's parallel cards); plug into the same
`selection` state. Source data already in JSON.

---

## 2026-05-08 11:24

**What changed:** Phase 3 task 2 — causation tracing landed.
`CausationTraceView` renders a chronological PO → pack → ship →
delivery → deduction → dispute → outcome timeline with severity-colored
markers; explorer gets a "Trace this order →" button that drives it.

**Why:** Second Phase 3 feature. The explorer surfaces one
deduction's six failure layers in parallel; the trace shows the same
order's story chronologically — what happened, in what sequence, and
where it broke down. Same connected-views wiring as the rest of the
app.

**State:** `tracedDeductionId` lifted into App.tsx alongside the
existing Sankey `selection` filter. ExplorerView's "Trace this order →"
button sets it; trace section auto-scrolls into view, runs its own
prev/next/random over the current cohort, resets when the cohort drops
the anchor. Standard chains render 7 timeline events with red/gold/green
dots and per-step failure flags; post-audit clawbacks get a parallel
3-event audit-period path. `frontend/screenshot-trace.mjs` verifies the
flow end to end — zero JS errors. Build passes (`npm run build`).
PLAN.md Phase 3 task 2 checked off in the same commit. 7 Phase 3
features remaining.

**Next:** Phase 3 task 3 — recovery simulation. Toggle operational
and administrative fixes (compliant labels, digital pack verification,
faster evidence retrieval, on-time dispute filing) on/off and watch
portfolio-wide recovery rate and dollar amounts shift in real time.
Plugs into the same `selection` cohort.

---

## 2026-05-08 11:42

**What changed:** Phase 3 task 3 — recovery simulation landed.
`RecoverySimulationView` presents five fix toggles with solo-impact
previews and a live current-vs-projected comparison panel against the
selection-filtered cohort.

**Why:** Third Phase 3 feature. Lets a CEO turn fixes on and off and
watch the portfolio shift in real time, so the cost of each gap
becomes discoverable through play instead of lectured.

**State:** Five toggles (compliant labels, digital pack verification,
systematic filing, deadline tracking, EDI/ASN compliance). Elimination
rules per toggle remove deductions upstream; evidence-quality-keyed
win-probability table (digital_complete 65% / digital_partial 35% /
handwritten 12% / none 5%) re-models surviving disputes whose path
actually changed — untouched disputes keep their actual recovered
amount. With all toggles on against the $1.33M portfolio: 1,650
deductions prevented, recovery rate 7.4% → 64.6%, net loss $1.23M →
$308K, $924K saved. Toggles are local view state; cohort comes from
App.tsx selection. `screenshot-sim.mjs` verifies behavior — zero JS
errors. Build passes. PLAN.md Phase 3 task 3 checked off. 6 Phase 3
features remaining.

**Next:** Phase 3 task 4 — cost-to-dispute profitability filter.
Compute per-deduction whether the labor cost of disputing exceeds the
expected recovery; surface the threshold, the deductions on each side
of it, and how the line moves as evidence quality and dispute method
change. Plugs into the same `selection` cohort.

---

## 2026-05-08 12:01

**What changed:** Phase 3 task 4 — cost-to-dispute profitability
filter landed. `CostToDisputeView` triages each unresolved deduction
into fight / marginal / write off using per-deduction expected
recovery against estimated labor cost.

**Why:** Fourth Phase 3 feature. The triage view answers the practical
"is this one worth my Tuesday afternoon?" question that turns a $1.4M
backlog into a stack a lean team can actually work.

**State:** Adjustable hourly-rate slider ($20–$100, default $42) and a
"project with digital evidence" toggle drive a live re-bucketing.
Win-probability table matches the simulation (digital_complete 65% /
digital_partial 35% / handwritten 12% / none 0% / past-deadline 0%);
labor hours by evidence quality (1.5 / 3 / 5 hr). Selectable bucket
cards drive a top-25 table sorted by EV (or by amount for write-offs)
with a "Trace →" cross-link to the causation view. Default $42/hr
across the portfolio: 110 fight ($160K, $33K expected for $13K labor),
27 marginal, 2,839 write-off ($1.04M unrecoverable); digital projection
flips this to 1,884 fight ($1.01M) / 616 write-off ($157K).
`screenshot-cost.mjs` verifies — zero JS errors. Build passes. PLAN.md
Phase 3 task 4 checked off. 5 Phase 3 features remaining.

**Next:** Phase 3 task 5 — dispute builder. Evidence-readiness view
showing what exists vs. what's needed for a single deduction, with a
mock dispute package preview (BOL / POD / packing list / promo
agreement / etc., flagged "have it" / "missing" / "lost"). Plugs into
the existing tracedDeductionId so the user can hop from triage to
dispute prep on one click.

---

## 2026-05-08 12:28

**What changed:** Phase 3 task 5 — dispute builder landed.
`DisputeBuilderView` assesses each required evidence item from the
retailer rules against Cinderhaven's actual records, scores per-
deduction readiness, and previews a mock dispute package.

**Why:** Fifth Phase 3 feature. Makes the "you don't have what you
need" problem concrete and retailer-specific — gap analysis driven
by the rules already encoded in `retailers.json`, not generic.

**State:** App.tsx now loads retailers.json alongside summary +
deductions. Per-requirement status of have_digital / have_paper /
inferable / missing produces ready / needs work / not disputable
buckets. Across the full portfolio: 334 ready / 1,533 needs work /
1,462 not disputable. Filter tabs, prev/next/random nav, two-column
requirements + mock package layout naming the retailer's portal.
Builder syncs to external `tracedDeductionId` so clicking "Trace →"
in the cost view also pivots the builder to that deduction (verified
via Playwright). "View causation trace →" cross-link pushes the
builder's current selection to the trace view. `screenshot-builder.mjs`
green; zero JS errors. Build passes. PLAN.md Phase 3 task 5 checked
off. 4 Phase 3 features remaining (timeline pressure, post-audit risk,
retailer scorecard, origin clustering).

**Next:** Phase 3 task 6 — timeline pressure view. Map each
unresolved deduction against its retailer-specific dispute deadline,
showing what's still in window, what's expiring inside the lean
team's realistic working capacity, and what's already past deadline
(auto-loss). Plugs into the same selection-filtered cohort.

---

## 2026-05-08 12:40

**What changed:** Phase 3 task 6 — timeline pressure view landed.
`TimelinePressureView` buckets unfiled, unresolved deductions by
days-to-deadline and pairs the result with an evidence-quality
cross-tab so the compounding story of the fifth failure shows up at
a glance.

**Why:** Sixth Phase 3 feature. Makes the timeliness compounding
failure concrete: a lean team running paper records loses winnable
deductions to the clock, and the dollars already gone are visible.

**State:** Five bucket tiles (Critical ≤7d / Expiring 8–30d / Active
>30d / Expired / No deadline) clickable to filter the urgent-list
table; days-to-deadline computed against TODAY (2026-05-31). Cross-
tab grid (bucket × digital/paper/missing) highlights compounding
cells (urgent + paper or missing) in red. Top-25 urgent list ordered
by days-remaining ascending, with Trace cross-link. Full-portfolio
read: 9 critical / 43 expiring / 438 active / 475 expired ($144K
already lost) / 860 no-deadline. `screenshot-pressure.mjs` green;
zero JS errors. Build passes. PLAN.md Phase 3 task 6 checked off.
3 Phase 3 features remaining (post-audit risk, retailer scorecard,
origin clustering).

**Next:** Phase 3 task 7 — post-audit risk exposure. Score each
deduction's vulnerability to a retroactive retailer-audit clawback
based on current evidence gaps. Surface dollar exposure by retailer,
deduction type, and evidence quality, and contrast against the
post-audit deductions already in the dataset.

---

## 2026-05-08 13:00

**What changed:** Phase 3 task 7 — post-audit risk exposure landed.
`PostAuditRiskView` runs an evidence-quality clawback model over
forward-looking deductions and pairs it with the 37 realized
post-audit claims already in the dataset.

**Why:** Seventh Phase 3 feature. Names the hidden threat — money
the supplier thought was settled — and ties the exposure number to
the same digital-pack lever the simulation surfaces.

**State:** Headline tile: $714K exposure (62.2% of $1.15M forward
portfolio); digital-evidence projection drops it to $115K, a $600K
reduction. Realized panel: 37 claims / $183K / avg 18.9-month
lookback / top auditor Audit Partners Limited at $87K. Retailer
breakdown merges forward exposure with realized claims — Walmart
$324K exposed, 14 historical claims already taken; UNFI $135K, 10
claims; KeHE $87K, 7 claims; Costco $35K, 6 claims; Whole Foods
$68K with no realized claims yet. Hardcoded retailer audit profiles
explain why. Evidence breakdown: $535K paper exposure, $174K missing
exposure, only $5K digital exposure. Trace cross-link on top-10
realized claims. `screenshot-audit.mjs` green; zero JS errors. Build
passes. PLAN.md Phase 3 task 7 checked off. 2 Phase 3 features
remaining (retailer scorecard, origin clustering).

**Next:** Phase 3 task 8 — retailer scorecard. Per-retailer view of
deduction patterns, dispute acceptance rates, deadline strictness,
deduction-type mix, and aggressiveness. Plugs into the same cohort.
Pull together the retailer-side numbers that have been ambient
across other views into one comparable scorecard.

---

## 2026-05-08 13:14

**What changed:** Phase 3 task 8 — retailer scorecard landed.
`RetailerScorecardView` renders per-retailer cards with net loss,
six metric tiles, and a behavioral profile; the per-card "Filter →"
button writes a new retailer-kind selection that drives the rest of
the app.

**Why:** Eighth Phase 3 feature. Pulls the retailer-side numbers
that were ambient across other views into one comparable scorecard
so Walmart-vs-UNFI-vs-KeHE differences read at a glance.

**State:** 10 cards in the full portfolio. Default-sort top three:
Walmart $557K / UNFI $227K / KeHE $159K. Sort selector toggles
net-loss / volume / recovery-rate. Selection union extended in
sankey/data.ts with `kind: "retailer"`; isOnSelectedPath and
selectionLabel updated; App.tsx looks up the retailer name for the
filter chip and special-cases the scorecard cohort so retailer
filters don't collapse the comparative view (other filter kinds
still rescope the cards — verified). screenshot-scorecard.mjs
green; zero JS errors. Build passes. PLAN.md Phase 3 task 8 checked
off. 1 Phase 3 feature remaining (origin clustering).

**Next:** Phase 3 task 9 — root-cause clustering by origin point.
Group deductions by warehouse / packing line / carrier / system
signal so the user can see which physical or operational origins
are generating the most deductions. Plugs into the existing cohort;
should expose the cluster as another selection kind so the rest of
the app can scope to one origin point.

---

## 2026-05-08 13:23

**What changed:** Phase 3 task 9 — origin clustering landed.
`OriginClusteringView` clusters the cohort across five operational
dimensions and ranks them by concentration so the user can see what
fixes are targeted vs. systemic. **Phase 3 is now complete — all 9
feature views are live.**

**Why:** Last Phase 3 feature. Root-cause clustering names the
operational origins; concentration scores tell the CEO whether the
problem is "mostly Line B" or systemic.

**State:** Default concentrations: Label decision 73.6% Generic,
Pack verification 59.7% paper-note, Evidence format 59.7% paper-note,
Carrier 21% top-of-7, Packer 21% top-of-8. Selection union extended
in sankey/data.ts with `kind: "cluster"` (dimension + value);
ORIGIN_DIMENSIONS is the single source of truth used by the view,
isOnSelectedPath, clusterValueFor, and selectionLabel. Per-cluster
Filter and Trace top → cross-links work; short_ship filter rescopes
concentration scores correctly (Generic jumps to 97.6%). Phase 4
(cross-view nav check, responsive review, Netlify deploy, friend
preview) is the entire remaining arc. `screenshot-origin.mjs` green;
zero JS errors. Build passes. PLAN.md Phase 3 task 9 checked off.

**Next:** Phase 4 task 1 — cross-view navigation check. Walk every
filter / drill-down / trace cross-link end-to-end and verify the
state transitions remain coherent across all 9 feature views. List
any rough edges; fix what's worth fixing before the responsive
check.

---

## 2026-05-08 14:02

**What changed:** Phase 4 polish landed — three bug fixes (sort,
sticky cohort bar, time range filter) plus end-to-end cross-view
nav verification and responsive pass at iPad / laptop / wide.

**Why:** Get the demo presentable before Netlify deploy. The polish
items came from a visual review and the two existing PLAN tasks
gated on them.

**State:** Scorecard sort renamed Recovery rate → Worst recovery
(ASC) so the visible-reorder works (Green Basket Market top, not
Walmart). `CohortBar` replaces the conditional selection-chip —
sticky top:0, always-visible, shows combined filter + time range.
`TimeRangeSelector` added next to the type dropdown (6mo / 1yr /
All + custom from-to). filteredDeductions, kpiCount, byType,
byChannel all gated on "any active filter" so date-range-only
filters propagate. Combined Short-ship + Last 6 mo → 395 / $91K.
Origin tables wrapped in scroll containers and body overflow-x
hidden — iPad portrait was overflowing at 1094px, now matches
viewport. `screenshot-crossview.mjs` and `screenshot-responsive.mjs`
verify; zero JS errors. Build passes. PLAN.md Phase 4 tasks 1 and 2
checked off; task 3 (deploy) and task 4 (friend preview) remain.

**Next:** Phase 4 task 3 — deploy to Netlify. The Netlify config is
already in place (root netlify.toml points the build at
frontend/dist/); confirm `netlify deploy --prod` works against the
linked site, then capture the live URL for the friend preview hand-
off.

---

## 2026-05-08 15:56

**What changed:** Phase 4 task 3 — deployed to Netlify, live at
**https://retailer-deduction-recovery.netlify.app/**. Plus a Sankey
label-contrast fix riding along — dollar amounts on the darker teal
bands now meet WCAG AA contrast.

**Why:** Demo URL ready for friend preview / prospect intro. The
contrast bug surfaced during visual review of the live site —
darkest-teal-band labels had ~2.5 contrast ratio against the gray
ink-faint fill, which is unreadable.

**State:** SankeyView picks each node label's fill by WCAG contrast-
ratio comparison: relative luminance of the band color
(LAYER_COLORS[node.layer]) is computed, then dark-ink vs. white is
chosen by whichever scores higher contrast. Verified per layer via
`verify-sankey-contrast.mjs`: layers 0–2 use ink, layers 3–4 use
white, layer 5 sits in the right margin on white panel and stays
ink. The naive luminance > 0.5 heuristic mis-classifies the medium
teals — confirmed and rejected during testing. Live site bundle
hash matched the local build at deploy time. Build passes. PLAN.md
Phase 4 task 3 checked off with the URL embedded.

**Next:** Phase 4 task 4 — hand off the live URL to friend for
preview, capture feedback, and decide what (if anything) needs
fixing before the prospect intro. After that the original arc is
done.

---

## 2026-05-10 — /wrap

**Started from:** Phase 4 task 3 done (deployed to Cloudflare Pages).
All 9 Phase 3 features and Phase 4 tasks 1–3 complete.

**Did:**

- Migrated deduction pipeline from this repo to cinderhaven-data
  (canonical dataset). This repo now copies the built DB and runs
  only JSON export + demo-specific validator.
- Collapsed Sankey from 6 layers to 3 (Type → Dispute readiness →
  Outcome). New `disputeReadinessFor()` scoring function with five
  buckets: Disputed — won, Disputed — lost, Ready to dispute, Needs
  work, Can't dispute, Never assessed. All custom nodeSort logic
  removed. SVG height 1200→700.
- Pulled slotting out of Sankey into callout box above the chart.
  Slotting excluded from Sankey-driven cohort filters.
- Fixed dispute readiness classification — resolved disputes now
  classify by actual outcome (won→"Disputed — won", lost→"Disputed
  — lost") instead of re-scoring on current evidence state.
- Fixed KPI consistency — "Total deductions" headline now matches
  Sankey window totals; annualized figure moved to subtitle.
- Fixed labor KPI — shows "from N filed" or "no disputes filed in
  this cohort" instead of misleading FTE figure on undisputed cohorts.
- Fixed cold-chain references — all 90 SKUs are shelf-stable (sauces,
  condiments, pantry staples). "Temperature abuse in transit" →
  "Heat exposure in transit". Explorer prose rewritten. Costco SPL
  code updated in cinderhaven-data.
- CSS fixes: section intro text width, Sankey label contrast (white
  halo knockout), italic text width, always-show node labels.
- Full data rebuild with updated spoilage templates. Validator: 37
  PASS / 2 WARN / 0 FAIL. Frontend builds clean.

**State:** All changes on branch `claude/determined-keller-c1455e`,
committed and pushed. Needs merge to master and Cloudflare Pages
redeploy. 3,087 deductions / $1.54M total / $802K annualized.

**Next:** Merge to master, redeploy to Cloudflare Pages, then Phase 4
task 4 (friend preview).

---
