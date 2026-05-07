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
