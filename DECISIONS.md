# Retailer Deduction Recovery — Decisions Log

Permanent record of choices that should survive session turnover.
If a decision is reversed, strike it through and add the replacement
below — don't delete.

---

## Format

Each entry:
- **Date** — when decided
- **Decision** — one sentence, imperative voice
- **Why** — the reasoning, including what was tried and rejected
- **Scope** — what this applies to (file, chunk, deliverable, or "global")
- **Do not** — explicit anti-instructions, if any

---

## Architecture & Pipeline

### 2025-05-07 — Use React + HTML for the interactive frontend
- **Why:** The tool needs complex interactivity — Sankey with
  zoom-on-click, connected views that update on selection, triage
  workflows, causation tracing. Streamlit can't deliver the polished
  product feel a CEO expects. Shiny feels lacking for this scope.
  Power BI doesn't showcase custom build skills. A second React
  project in the portfolio is fine because the interaction model
  is different from the short-ship-cost project.
- **Scope:** global
- **Do not:** use Streamlit, Shiny, or Power BI for this project

### 2025-05-07 — Use static JSON export, no live backend
- **Why:** Data is synthetic and fixed. Interactivity is about
  exploring different views, not generating new queries. Static
  JSON deploys anywhere (Netlify, GitHub Pages), no server to
  maintain. Python pipeline generates SQLite → export script
  transforms to JSON → React consumes JSON.
- **Scope:** global — architecture
- **Do not:** build a backend API for V1

### ~~2025-05-07 — Deploy to Netlify~~ (superseded 2026-05-09)
- ~~**Why:** Consistent with existing portfolio deployment pattern.
  Static site, no server needed.~~
- ~~**Scope:** deployment~~
- Superseded by 2026-05-09 — Deploy to Cloudflare Pages instead of
  Netlify (below)

### 2025-05-07 — Consume cinderhaven-data repo as base, extend in this repo
- **Why:** Same pattern as other Cinderhaven portfolio projects.
  Pull the base database, extend with project-specific tables
  (deductions, disputes, EDI requirements, pack/ship records,
  retailer rules). Eventually fold extensions back into the main
  data repo.
- **Scope:** data pipeline
- **Do not:** modify the cinderhaven-data repo directly from this
  project

### 2026-05-07 — Layer on base `chargebacks` table; do not replace it
- **Why:** The base cinderhaven-data `chargebacks` table is shared
  across portfolio projects (short-ship-cost, others). Replacing it
  with this project's richer `deductions` table would break sibling
  projects that read it. Promoting `chargebacks` to a view derived
  from `deductions` was considered and rejected as too high-cost
  for V1 scope. The new `deductions` table aggregates to
  chargebacks-equivalent monthly totals; both can coexist.
- **Scope:** data pipeline — schema choice
- **Do not:** modify, drop, or restructure the base `chargebacks`
  table from this repo's pipeline. New deduction modeling goes
  into the new tables; the base stays untouched.

### 2026-05-07 — Single `selection` state in App.tsx is the wiring backbone
- **Why:** The whole app — Sankey, dropdown filter, deduction
  explorer, KPIs, and tables — derives its filtered view from one
  `selection: Selection | null` value lifted into App.tsx. Adding
  the explorer required zero changes to the Sankey or tables; the
  remaining 8 Phase 3 feature views (causation tracing, simulation,
  cost-to-dispute, dispute builder, timeline pressure, post-audit
  risk, retailer scorecard, origin clustering) plug into the same
  signal. Per-view local state was considered and rejected because
  cross-view synchronization (clicking the Sankey updates the
  dropdown, the explorer pivots, the tables filter) is a core
  product requirement, not an optional nicety.
- **Scope:** global — frontend architecture
- **Do not:** introduce per-view selection state or duplicate
  filter logic. New feature views read from `selection`, write via
  `setSelection`, and let App.tsx coordinate. Filter recomputation
  on the deductions array stays in App.tsx (`filteredDeductions`)
  so every consumer sees the same cohort.

### 2026-05-09 — Deploy to Cloudflare Pages instead of Netlify
- **Why:** Netlify's traffic-based billing creates DDoS cost exposure
  on a prospect-facing demo. Cloudflare Pages has no traffic-based
  billing, includes built-in DDoS protection, and supports the same
  static-site Git-deploy workflow. Supersedes 2025-05-07 Netlify
  decision.
- **Scope:** deployment
- **Do not:** use Netlify for this project

---

## Data & Schema

### 2025-05-07 — Model retailer-specific behaviors as realistically as possible
- **Why:** The prospect works with the same retailers in the
  Cinderhaven dataset (Walmart, Costco, Whole Foods, UNFI, KeHE,
  regional chains). Realistic dispute processes, deadlines, portal
  quirks, and deduction codes make the demo credible — the
  prospect should recognize their own retailers' behavior.
- **Scope:** synthetic data generation
- **Do not:** use generic "Retailer A / B / C" abstractions

### 2025-05-07 — Include vague/undecodable deductions in synthetic data
- **Why:** Real remittances often have incomplete detail — "promo
  -$4k" with no PO or time period, "Code 99: Miscellaneous."
  Part of the tool's value is showing how to decode these. Leaving
  them out makes the demo unrealistically clean.
- **Scope:** synthetic data generation

### 2026-05-10 — No Cinderhaven products require cold chain shipping
- **Why:** All 50 SKUs are shelf-stable (Artisan Sauces, Specialty
  Condiments, Pantry Staples). Spoilage deductions reference
  shelf-life expiration and heat exposure, not cold-chain rejection.
  Temperature logs are not relevant evidence for Cinderhaven
  shipments.
- **Scope:** synthetic data generation, explorer prose, deduction codes
- **Do not:** reference cold chain, reefer units, or temperature
  monitoring in Cinderhaven context

### 2026-05-09 — Add spoilage and slotting as deduction types
- **Why:** Both are real deduction types for a ~$25M food manufacturer.
  Slotting is a planned cost (pay-to-play shelf placement), not an
  operational failure, so routing it through root cause → evidence →
  dispute would be misleading. Spoilage is a genuine he-said-she-said
  about product condition at receiving and fits the failure model.
  Slotting enters the Sankey but branches off immediately into a
  terminal "negotiated costs — not disputable" node; spoilage flows
  through the full five failure layers like the other operational types.
- **Scope:** data pipeline + Sankey + all views that reference type lists
- **Do not:** route slotting through the five failure layers

---

## Visualization

### 2025-05-07 — Use Sankey flow as landing view with zoom-on-click
- **Why:** Full Sankey with six layers risks spaghetti. Show
  everything on landing for the big picture, then zoom into a
  single path when user clicks a branch. Solves readability while
  preserving the "see the whole problem" moment.
- **Scope:** main visualization
- **Do not:** show all six layers at full detail simultaneously

### 2025-05-07 — One tool with connected views, not separate pages
- **Why:** Connected views feel like a product. Separate pages feel
  like a report. Click a deduction → causation trace loads → one
  click to recovery simulation with that gap pre-selected. Data
  flows through the tool the way the problem flows through the
  business. More impressive for a CEO who likes exploring data.
- **Scope:** global — UI architecture
- **Do not:** build features as standalone pages with no cross-linking

### 2026-05-10 — Collapse Sankey from 6 layers to 3 (Type → Dispute readiness → Outcome)
- **Why:** 6-layer Sankey with 15+ types created unreadable band
  crossings in the middle layers (evidence → accessibility →
  timeliness). Multiple attempts at custom node sorting made it worse.
  Collapsing the middle three layers into a single "dispute readiness"
  score (ready to dispute / needs work / can't dispute / never
  assessed) eliminates the spaghetti while preserving the "shape of
  the problem" view. The five compounding failures still live in the
  explorer's 6 cards and the causation trace where they have room to
  breathe. Dispute readiness is a stronger business concept for a CEO
  than the technical decomposition — it answers "can I fight this?"
  directly.
- **Scope:** Sankey component, data flow
- **Do not:** reintroduce evidence/accessibility/timeliness as
  separate Sankey layers. Those details belong in the explorer and
  trace.

### 2026-05-10 — Pull slotting out of Sankey into a callout box
- **Why:** Slotting (~$120K) is a negotiated cost with one
  destination — it doesn't flow through the five failures and
  shouldn't be in the Sankey. A callout box above the chart handles
  it. Removing it also prevents slotting deductions from inflating
  Sankey-driven cohort filters (e.g., "Never filed" was showing
  $821K instead of $701K because slotting deductions were included).
- **Scope:** Sankey component, cohort filtering
- **Do not:** include slotting in Sankey-driven cohort selections

### 2025-05-07 — Cost of gaps is discoverable, not in-your-face
- **Why:** The prospect should discover the cost through exploration,
  not get lectured. Numbers are present in causation traces and
  simulations, but the headline is the story of what happened to
  the order, not a giant red banner saying "you lost $X."
- **Scope:** global — design tone
- **Do not:** lead with accusatory cost callouts

---

## Output Formats

[No entries yet]

---

## Writing & Voice

[No entries yet]

---

## Reversed / Superseded

When a decision is overturned:
1. Strike through the original entry above (don't delete)
2. Add a new entry below with the replacement decision
3. Note the link in both directions

This preserves the history of why something is the way it is.
