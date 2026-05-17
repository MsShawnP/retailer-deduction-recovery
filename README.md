# Retailer Deduction Recovery

An interactive tool that traces a specialty food manufacturer's
retailer deductions through five compounding operational failures
-- no visibility, process gaps, weak evidence, inaccessible records,
and missed dispute windows -- and shows what is recoverable, what is
preventable, and what each fix is worth.

**[View the live tool →](https://retailer-deduction-recovery.pages.dev)**

## What this is

Cinderhaven Provisions is a ~$25M specialty food brand selling through
Walmart, Costco, Whole Foods, UNFI, KeHE, and regional chains. The
company has outgrown its ability to manage retailer deductions at
scale. Staff is lean, disputes happen whenever someone can get to
them, and deductions are treated as a cost of doing business rather
than a fixable operational problem.

This tool takes a $10.8M backlog of unresolved deductions and makes
the problem visible. It traces each deduction from its type through
root cause, evidence quality, evidence accessibility, and dispute
timeliness to its outcome. Ten connected views let a user explore
the same data from different angles -- drill into a single deduction,
follow one order from pack to failed dispute, toggle operational
fixes and watch the portfolio shift, or compare retailer behaviour
side by side.

The dataset is synthetic but modelled on real retailer processes.
Walmart, Costco, Whole Foods, UNFI, and KeHE each have their own
dispute deadlines, portal workflows, deduction codes, and evidence
requirements.

## Features

All ten views share a single selection state. Click a Sankey band,
pick a deduction type from the dropdown, or filter by retailer --
every view updates from the same cohort.

| View | What it shows |
|---|---|
| Sankey flow | All deductions split by type, dispute readiness, and outcome; click to zoom |
| Deduction explorer | Six-card drill-down: the deduction, peer context, root cause, evidence quality, accessibility, timeliness |
| Causation trace | One order's chronological chain: PO, pack, ship, delivery, deduction, dispute, outcome |
| Recovery simulation | Toggle five operational fixes on/off; watch recovery rate shift from 7% to 65% |
| Cost-to-dispute triage | Per-deduction expected recovery vs. labour cost; fight / marginal / write-off buckets |
| Dispute builder | Evidence readiness per retailer's rules: what exists, what is missing, what is inferable |
| Timeline pressure | Deductions mapped against retailer-specific dispute deadlines; expired dollar exposure |
| Post-audit risk | Forward-looking clawback exposure ($714K) by retailer and evidence quality |
| Retailer scorecard | Per-retailer comparison: deduction volume, recovery rate, deadline strictness, patterns |
| Origin clustering | Deductions grouped by warehouse, packing line, carrier, and label decision |

## Tech stack

- **Frontend** -- React 19 (Vite), TypeScript, D3 + d3-sankey for
  the Sankey diagram, custom SVG/HTML for remaining views
- **Data pipeline** -- Python scripts generate a SQLite database of
  synthetic deduction data; a JSON export script transforms it into
  three static files the app consumes (summary, deductions, retailers)
- **Data source** -- extends the
  [cinderhaven-data](https://github.com/MsShawnP/cinderhaven-data)
  shared database with 13 deduction-specific tables
- **Hosting** -- Cloudflare Pages (static site, no backend)
- **Testing** -- Playwright screenshot scripts for visual verification

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

To regenerate the dataset from scratch, run the build pipeline in the
[cinderhaven-data](https://github.com/MsShawnP/cinderhaven-data)
repo, then:

```
python scripts/20_export_json.py
python scripts/21_validate_dataset.py
```

The validator runs 36 checks against the exported JSON to confirm
distributions and relationships are intact.

## Data notes

All data is synthetic. Cinderhaven Provisions is a fictional company.
Retailer dispute processes, deadlines, and deduction codes are
modelled on publicly documented policies but may not reflect current
terms. The dataset contains ~13,500 deductions ($10.8M) across nine
deduction types: short ship, labelling noncompliance, pallet
noncompliance, damaged product, late delivery, promo disputes,
vague/undecodable, spoilage, and slotting (negotiated,
non-disputable).

---

A [Lailara LLC](https://github.com/MsShawnP) portfolio piece.

## License

MIT -- see [LICENSE](LICENSE).
