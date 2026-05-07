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

### 2025-05-07 — Deploy to Netlify
- **Why:** Consistent with existing portfolio deployment pattern.
  Static site, no server needed.
- **Scope:** deployment

### 2025-05-07 — Consume cinderhaven-data repo as base, extend in this repo
- **Why:** Same pattern as other Cinderhaven portfolio projects.
  Pull the base database, extend with project-specific tables
  (deductions, disputes, EDI requirements, pack/ship records,
  retailer rules). Eventually fold extensions back into the main
  data repo.
- **Scope:** data pipeline
- **Do not:** modify the cinderhaven-data repo directly from this
  project

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
