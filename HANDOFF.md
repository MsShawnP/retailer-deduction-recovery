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
