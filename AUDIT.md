# Project Audit

## Phase 1: Baseline Assessment
**Date:** 2026-05-17
**Project:** Retailer Deduction Recovery
**Trigger:** Data source substantially changed (cinderhaven-data rebuilt);
need to verify all math and analysis still hold.

### What Changed in the Data

The upstream cinderhaven-data database was rebuilt. The export script
was re-run, producing new JSON files with these changes:

| Metric | Old | New | Change |
|--------|-----|-----|--------|
| Deductions count | 3,087 | 13,496 | +4.4x |
| Deductions dollar | $1.54M | $10.84M | +7.0x |
| Window | 23 months | 36 months | +56% |
| Orders | 5,838 | 11,634 | +2.0x |
| Order value | $31.4M | $66.3M | +2.1x |
| Recovery rate | 6.4% | 9.1% | +2.7pp |
| Labor hours | 5,910 | 25,914 | +4.4x |
| Disputes filed | 1,410 | 6,105 | +4.3x |
| Recovered | $98K | $988K | +10.1x |

**Type distribution shift:**

| Type | Old % of $ | New % of $ | Direction |
|------|-----------|-----------|-----------|
| promo_billback | 17.9% | 45.0% | Dominant |
| vague | 22.1% | 28.1% | Grew |
| spoilage | 8.2% | 12.9% | Grew |
| short_ship | 15.6% | 5.5% | Shrank |
| label_fine | 14.5% | 3.1% | Shrank |
| late_delivery | 7.5% | 1.8% | Shrank |
| damaged | 5.1% | 1.6% | Shrank |
| slotting | 7.8% | 1.5% | Shrank |
| pallet_fine | 1.3% | 0.5% | Shrank |

### Tech Stack (unchanged)

| Layer | Technology | Version |
|---|---|---|
| Frontend | React, TypeScript | 19.2.5, ~6.0.2 |
| Build | Vite | 8.0.10 |
| Visualization | d3 + d3-sankey | 7.9.0, 0.12.3 |
| Data pipeline | Python -> SQLite -> static JSON | |
| Deployment | Cloudflare Pages (wrangler) | 4.90.0 |
| Testing | Vitest + Testing Library | 4.1.6 |

### Project Health Indicators

| Indicator | Status | Detail |
|-----------|--------|--------|
| Build | Pass | TypeScript clean, Vite builds |
| Tests | Pass | 14 tests in 2 files (4.6s) |
| Dependencies | Current | 0 vulnerabilities |
| Activity | Active | 131 commits, last commit today |
| Documentation | Good but stale | README referenced old numbers (fixed) |

---

## Phase 2: Internal Review — Data Change Impact
**Date:** 2026-05-17
**Focus:** Does the React app produce correct output with the new data?

### Bugs Found and Fixed

#### BUG 1 (Fixed): FTE not annualized

**File:** App.tsx:112
**Was:** `kpiLaborHours / 2080` — divides total hours by one year's FTE
**Problem:** With 36-month window, showed ~12.5 FTE. Should be ~4.2 FTE/year.
The dollar KPI correctly annualizes (`dollar * 12 / months`), but FTE didn't.
**Fix:** `(kpiLaborHours * 12 / summary.window.months) / 2080`
**Impact:** KPI now shows ~4.2 FTE, consistent with "lean team" narrative.

#### BUG 2 (Fixed): README outdated numbers

**File:** README.md lines 20, 116
**Was:** "$1.33M backlog" and "~3,300 deductions"
**Fix:** Updated to "$10.8M" and "~13,500"

### Verified OK (No Changes Needed)

| Area | Why it's fine |
|------|--------------|
| Annualization formula (App.tsx:106) | Uses `window.months` dynamically |
| KPI aggregation (computeKpis.ts) | Purely data-driven, no hardcoded sizes |
| Evidence categorization (domain.ts) | Schema-driven, not count-dependent |
| Null guards for 810 orderless deductions | All views use optional chaining / null checks |
| formatDollars() | Handles $10M+ correctly ($X.XXM format) |
| DEMO_DATE (2026-05-31) | Still within data window (ends 2026-12-31) |
| WIN_PROB values | Forward-looking assumptions, not fitted to data |
| Sankey building | Dynamic from deduction array, no size assumptions |
| All 10 view components | Load and render without crashes |
| TypeScript | Zero type errors |
| Test suite | 14/14 pass |

### Data Credibility Issues (Not Code Bugs — Data Pipeline Concerns)

These are problems with the narrative, not the app logic. The code
correctly renders whatever data it's given. The issue is whether the
data tells a believable story.

#### ISSUE 1: Deduction-to-revenue ratio unrealistic (16.4%)

- Annualized deductions: $3.6M/year
- Annualized order value: ~$22.1M/year (close to ~$25M stated)
- Deduction rate: 16.4%
- Industry norm: 1-3% for CPG, extreme cases 5-7%

At 16.4%, any prospect who knows the space will question the numbers.
The old data was plausible at 4.9%. This needs fixing in the upstream
data pipeline, not in the React app.

#### ISSUE 2: Promo billback now dominates (45% of dollars)

The demo's narrative is built around five operational failures (labels,
pack verification, evidence quality, accessibility, timeliness). But
promo disputes are funding-mechanism disagreements, not operational
failures at the warehouse level. With promo at 45%, the story has
shifted from "your operations are broken" to "you have a promo
management problem." The root cause for promo_billback is "Promo
program" — that's not about bad labels or missing evidence.

#### ISSUE 3: FTE-equivalent narrative tension

Annualized FTE is ~4.2, which is reasonable. But a company with $3.6M
in annual deductions and 4 people working on it is NOT ignoring the
problem — it's already staffed. The "lean team drowning" story worked
at $800K/year with 1.5 FTE. At $3.6M/year with 4.2 FTE, the narrative
needs to shift from "nobody's working on this" to "even with dedicated
staff, the approach is failing."

#### ISSUE 4: Top-25 display limits may hide too much

CostToDisputeView and TimelinePressureView cap their detail tables
at 25 rows. With 13,496 deductions, the "Fight" bucket in cost view
likely has 1000+ items. Top 25 may be insufficient. Not broken, but
worth reconsidering.

### Summary.json Internal Consistency: Verified

All aggregates were checked (sum, pct, annualized, recovery_rate)
and are correct. The `fte_equivalent` field in summary.json (12.46)
uses the same wrong formula as the old App.tsx code — it's total
hours / 2080, not annualized. This is an upstream export issue but
the React app now computes its own annualized FTE correctly.

---

## Phase 3: Landscape Scan
**Date:** 2026-05-17
**Status:** Skipped — competitive landscape unchanged from 2026-05-16
audit. No market-relevant changes in 1 day.

---

## Phase 4: Synthesis & Next Moves
**Date:** 2026-05-17

### What the Data Change Means

The React app is structurally sound. All math is dynamic; all null
paths are guarded; all formatting handles the new scale. The two
code bugs found (FTE annualization, README) are fixed.

The real issue is upstream: the data pipeline produced a dataset
that's narratively implausible (16.4% deduction rate, promo-heavy
distribution). This needs to be fixed in cinderhaven-data, not here.

### Ranked Next Moves

| # | Move | Owner | Why |
|---|------|-------|-----|
| 1 | Recalibrate deduction volume to 3-5% of revenue | Data pipeline | Credibility with prospects |
| 2 | Rebalance type distribution (reduce promo share) | Data pipeline | Narrative alignment |
| 3 | Fix `fte_equivalent` in export script | Data pipeline | Consistency with app display |
| 4 | Consider increasing top-N limits (25 -> 50) | Frontend | Better visibility at 13K+ scale |
| 5 | Review explorer prose for new type distribution | Frontend | Ensure narrative matches data |

### What NOT to Do

1. **Don't change the React code to compensate for data issues.**
   The app correctly renders what it's given. Fix the source.
2. **Don't hardcode any dataset-size assumptions.** The app being
   fully dynamic is its strength.
3. **Don't touch WIN_PROB or labor assumptions yet.** These are
   modeling choices independent of data volume. Revisit only if
   the output numbers feel wrong after the data is recalibrated.
