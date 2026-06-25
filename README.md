# Retailer Deduction Recovery

An interactive tool that traces a specialty food manufacturer's
retailer deductions through five compounding operational failures
-- no visibility, process gaps, weak evidence, inaccessible records,
and missed dispute windows -- and shows what is recoverable, what is
preventable, and what each fix is worth.

**Live:** https://deductions.lailarallc.com

## What this is

Cinderhaven Provisions is a ~$25M specialty food brand selling through
Walmart, Costco, Whole Foods, UNFI, KeHE, and regional chains. The
company has outgrown its ability to manage retailer deductions at
scale. Staff is lean, disputes happen whenever someone can get to
them, and deductions are treated as a cost of doing business rather
than a fixable operational problem.

This tool takes a $1.35M backlog across 16,917 deductions and makes
the problem visible. It traces each deduction from its type through
root cause, evidence quality, evidence accessibility, and dispute
timeliness to its outcome. Ten connected views let a user explore
the same data from different angles -- drill into a single deduction,
follow one order from pack to failed dispute, toggle operational
fixes and watch the portfolio shift, or compare retailer behaviour
side by side.

The dataset is synthetic but modelled on real retailer processes.
Walmart, Costco, Whole Foods, Sprouts, Kroger, Regional Group,
UNFI, KeHE, and DPI Northwest each have their own dispute deadlines,
portal workflows, deduction codes, and evidence requirements.
Cinderhaven sells across five product lines: Artisan
Sauces, Pantry Staples, Specialty Condiments, Dried Goods, and
Snack Bites.

## Features

The tool is organized into four narrative chapters that guide the
user through the five compounding failures: **The Problem** (Sankey
flow and KPIs), **Why This Happens** (explorer, causation trace,
origin clustering), **The Evidence Gap** (dispute builder, post-audit
risk, retailer scorecard), and **What to Do About It** (recovery
simulation, cost-to-dispute triage, timeline pressure).

All ten views share a single selection state. Click a Sankey band,
pick a deduction type from the dropdown, or filter by retailer --
every view updates from the same cohort. Cross-links between views
switch chapters automatically.

| View | What it shows |
|---|---|
| Sankey flow | All deductions split by type, dispute readiness, and outcome; click to zoom |
| Deduction explorer | Six-card drill-down: the deduction, peer context, root cause, evidence quality, accessibility, timeliness |
| Causation trace | One order's chronological chain: PO, pack, ship, delivery, deduction, dispute, outcome |
| Recovery simulation | Toggle five operational fixes on/off. Of the dollars actually contested, the win rate is ~42%; with five evidence-quality fixes, that rises to ~65%. |
| Cost-to-dispute triage | Per-deduction expected recovery vs. labour cost; fight / marginal / write-off buckets |
| Dispute builder | Evidence readiness per retailer's rules: what exists, what is missing, what is inferable |
| Timeline pressure | Deductions mapped against retailer-specific dispute deadlines; expired dollar exposure |
| Post-audit risk | Forward-looking clawback exposure by retailer and evidence quality, paired with realized post-audit claims |
| Retailer scorecard | Per-retailer comparison: deduction volume, recovery rate, deadline strictness, patterns |
| Origin clustering | Deductions grouped by warehouse, packing line, carrier, and label decision |

## Cinderhaven context

Built on the Cinderhaven synthetic dataset -- a ~$25M specialty food brand,
50 SKUs across 5 product lines and 6 contracted retailers. Data is synthetic;
methodology and deliverables are real.

## Data contract

**Canonical baseline:** 50 SKUs · 5 product lines (AS·PS·SC·DG·SB) · 6 retailers
(Walmart·Costco·Whole Foods·Sprouts·Kroger·Regional Group) · 3 distributors
(UNFI·KeHE·DPI Northwest)

All 9 trading partners are in scope. Shopify DTC is excluded (no deduction
process). Data window: January 2023 to January 2026 (36 months).

## Tech stack

- **Frontend** -- React 19 (Vite), TypeScript, D3 + d3-sankey for
  the Sankey diagram, custom SVG/HTML for remaining views
- **Data pipeline** -- Python export script reads Fly.io Postgres
  (cinderhaven-data-platform) via flyctl proxy and writes three
  static JSON files the app consumes (summary, deductions, retailers)
- **Data source** -- Fly.io Postgres (app `cinderhaven-db`),
  cinderhaven-data-platform dbt project
- **Hosting** -- Cloudflare Pages (static site, no backend)
- **Testing** -- Vitest + React Testing Library (59 unit tests
  covering domain logic, navigation state, and component rendering)

## Repository structure

```
data/               SQLite database and schema docs
research/           Retailer-specific deduction process notes
  retailers/        Per-retailer research (Walmart, Costco, WFM, UNFI, KeHE, etc.)
scripts/            Python pipeline: data generation, JSON export, validation
frontend/           React app (Vite)
  public/json/      Pre-built JSON consumed by the app (summary, deductions, retailers)
  src/
    sankey/         Sankey flow diagram and selection logic
    explorer/       Deduction explorer (6-card drill-down)
    causation/      Causation trace (order timeline)
    simulation/     Recovery simulation (fix toggles)
    cost/           Cost-to-dispute triage
    builder/        Dispute builder (evidence readiness)
    pressure/       Timeline pressure (deadline mapping)
    audit/          Post-audit risk exposure
    scorecard/      Retailer scorecard
    origin/         Origin clustering
```

## Run locally

```
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. The app loads JSON from
`frontend/public/json/`; no backend or database connection required.

To re-export JSON from Postgres:

```
flyctl proxy 5432:5432 -a cinderhaven-db
# in a separate terminal:
python scripts/20_export_json.py
python scripts/21_validate_dataset.py
```

## Data notes

All data is synthetic. Cinderhaven Provisions is a fictional company.
Retailer dispute processes, deadlines, and deduction codes are
modelled on publicly documented policies but may not reflect current
terms. The dataset contains 16,917 deductions ($1.35M) across nine
deduction types: short ship, labelling noncompliance, pallet
noncompliance, damaged product, late delivery, promo disputes,
pricing error, spoilage, and slotting (negotiated,
non-disputable). ~16% of deduction dollars are recovered
through disputes.

---

Built by [Lailara LLC](https://lailarallc.com) -- data hygiene and analytics
consulting for specialty food brands scaling into national retail.
