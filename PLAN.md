# Retailer Deduction Recovery — Current Work Plan

The current arc of work. Updated when the arc changes, not every
session. For session-by-session state, see HANDOFF.md.

---

## Goal

Build the extended synthetic dataset and deliver all ten interactive
features in a deployable React app consuming static JSON.

## Why this arc, why now

Friend is ready to make the introduction. The sooner a working demo
exists, the sooner friend can preview it, give feedback, and
recommend to the prospect. Two-week target window.

## Business question this arc answers

Cinderhaven has outgrown its ability to manage retailer deductions.
This project makes visible the five compounding failures and shows
what each one is costing them and what it takes to fix it.

## Tasks

Work in vertical slices — data → export → React component → connected
views for each feature before moving to the next.

### Phase 1: Data foundation

- [x] Research retailer-specific dispute processes, deadlines, portals,
      and deduction codes for Walmart, Costco, Whole Foods, UNFI, KeHE,
      and representative regional chains
      (Wegmans, Sprouts) — see `research/retailers/`
- [x] Design deduction data schema — deduction records, EDI
      requirements, pack/ship records, dispute records, retailer
      rules, remittance data (including vague/undecodable entries)
      — see `data/schema.md`
- [x] Build Python scripts to extend the cinderhaven-data SQLite
      database with deduction-specific tables — schema DDL + static
      seeds (retailers, retailer_rules, deduction_codes,
      edi_requirements) via `scripts/build_deductions_db.py`. Dynamic
      generators (orders, deductions, disputes, etc.) are the next
      tasks below.
- [x] Generate synthetic deduction data — realistic mix of types
      (short ship, labeling fines, pallet noncompliance, promo
      disputes, damaged product, late delivery, vague codes) — 3,333
      deductions, $1.4M including post-audit claims, distribution
      across all 7 types
- [x] Generate synthetic dispute data — timelines, evidence submitted
      (handwritten notes vs. digital records), outcomes, missed
      deadlines — 1,505 disputes (45% file rate), $99K recovered
      (8.6%), 75% handwritten-only evidence
- [x] Generate synthetic pack/ship records — what was actually picked,
      packed, and labeled per order — 5,838 pack_records and 5,838
      shipments, encoding generic-label / paper-only / lost-evidence
      reality
- [x] Build JSON export script — transform SQLite into the JSON
      structures the React app needs — `scripts/20_export_json.py`
      writes summary.json (5KB), deductions.json (4.8MB compact,
      3,333 denormalized records), retailers.json (47KB)
- [x] Validate synthetic data — deduction volumes and dollar amounts
      feel realistic for a ~$25M manufacturer — `scripts/21_validate_dataset.py`
      runs 36 checks (row counts, FK integrity, design conventions,
      $/recovery targets, channel split, type mix, JSON parity);
      36 PASS / 0 WARN / 0 FAIL on current dataset

### Phase 2: React app scaffold + Sankey

- [x] Set up React project, build system, Netlify deployment config —
      Vite + React + TypeScript scaffold under `frontend/`, JSON
      export now lands at `frontend/public/json/`, root `netlify.toml`
      points the build at `frontend/dist/`. Minimal landing page
      renders KPIs, by-type, and by-retailer tables from summary.json.
      Build passes; runtime data fetches verified via dev server.
- [x] Build Sankey flow — full deduction view on landing, all branch
      points (type → root cause → evidence quality → accessibility →
      timeliness → outcome) — d3-sankey rendering 41 nodes, $1.33M
      total flow, hue-distinct outcome layer
- [x] Implement zoom-on-click — user clicks a node or link, that
      path stays at full opacity and the rest dims to ~4% (context
      preserved, not removed)
- [x] Connect Sankey branches to downstream views — selection state
      lifted to App.tsx; KPIs, by_type, and by_retailer tables
      recompute from the filtered subset. Phase 3 feature views
      will plug into the same selection state.

### Phase 3: Feature views (vertical slices)

- [x] Deduction explorer — six-layer drill-down for individual
      deductions (the deduction, visibility/pattern, root cause,
      evidence quality, accessibility, timeliness) — `ExplorerView`
      reads from `selection` state, sorts cohort by amount, prev /
      next / random nav. 3-column card grid with red-numbered
      headers and color-coded timeliness.
- [x] Causation tracing — follow a single order from label → short
      count → deduction → failed dispute, end to end — `CausationTraceView`
      reads `tracedDeductionId` from App.tsx (set from explorer's "Trace
      this order" button), renders a chronological timeline of PO → pack
      & label → ship → delivery → deduction → dispute → outcome with
      severity-colored markers (red/gold/green) and per-step failure
      flags. Post-audit claims get a parallel audit-period path. Cohort
      nav (prev/next/random) on the trace itself.
- [x] Recovery simulation — toggle operational and administrative
      fixes on/off, watch portfolio-wide recovery rate and dollar
      amounts shift in real time — `RecoverySimulationView` runs
      against the `selection`-filtered cohort, five toggles
      (compliant labels, digital pack verification, systematic
      filing, deadline tracking, EDI/ASN compliance) drive an
      evidence-quality-calibrated win-probability model
      (digital_complete 65% / digital_partial 35% / handwritten 12%
      / none 5%). Per-toggle solo-impact previews and a current-vs-
      projected comparison panel update live.
- [x] Cost-to-dispute profitability filter — calculate whether a
      deduction is worth fighting given labor cost to gather evidence
      and dispute — `CostToDisputeView` runs against the
      selection-filtered cohort with an adjustable hourly-rate slider
      ($20–$100) and a "project with digital evidence" toggle. Three
      buckets (fight / marginal / write off) computed per deduction
      from amount × win-prob (digital_complete 65% / digital_partial
      35% / handwritten 12% / none 0% / past-deadline 0%) minus
      labor (hours by evidence quality × rate). Selectable bucket
      cards drive a sortable top-25 table with a cross-link to the
      causation trace.
- [x] Dispute builder — evidence readiness view showing what exists
      vs. what's needed for each deduction, mock dispute package —
      `DisputeBuilderView` reads retailer rules from `retailers.json`,
      assesses each required evidence item against dispute.evidence /
      pack_record / shipment chain, scores each deduction as ready /
      needs work / not disputable. Filter tabs by readiness, prev/
      next/random nav, two-column layout (requirements gap analysis +
      mock dispute package), cross-link "View causation trace →" that
      drives `tracedDeductionId`. Builder syncs to that anchor when
      set externally so explorer/cost-view entries land on the same
      deduction.
- [x] Timeline pressure view — deductions mapped against
      retailer-specific dispute deadlines, showing what's still
      in window, what's expiring, what's already dead —
      `TimelinePressureView` filters the cohort to unfiled +
      unresolved, computes days-to-deadline against TODAY
      (2026-05-31), and buckets each (Critical ≤7d / Expiring 8–30d
      / Active >30d / Expired / No deadline) with count + dollar
      tiles. A pressure × evidence-quality cross-tab tells the
      compounding story (urgent + paper/missing cells highlighted
      red). Selectable bucket cards drive a top-25 urgent-first
      table with a Trace cross-link.
- [x] Post-audit risk exposure — based on current evidence gaps,
      calculate and visualize retroactive clawback vulnerability —
      `PostAuditRiskView` runs an evidence-quality risk model
      (digital 10% / paper 60% / missing 85% probability of
      successful clawback) against forward-looking (non-post-audit)
      deductions in the cohort. Headline exposure number, "project
      with digital evidence" toggle showing the reduction delta,
      "already happened" panel with stats and a top-10 table of
      realized post-audit claims, exposure-by-retailer table with
      hardcoded retailer audit profiles, and exposure-by-evidence-
      bucket breakdown. Trace cross-link on realized claims.
- [x] Retailer scorecard — deduction patterns, dispute acceptance
      rates, deadline strictness, aggressiveness by retailer —
      `RetailerScorecardView` renders 2-column cards per retailer
      with net loss, volume, top deduction type, filed→won rates,
      recovery, dispute window, evidence demand, past-deadline
      counts, and a research-grounded behavioral profile blurb.
      Selection union extended with a `retailer` kind so the
      "Filter →" button on each card writes back to the same
      lifted state that drives every other view; the scorecard
      itself special-cases retailer filters (so the comparative
      view survives) but respects every other filter kind.
- [x] Root cause clustering by origin point — deductions grouped by
      warehouse, packing line, carrier, or system —
      `OriginClusteringView` clusters the cohort across five
      operational dimensions (carrier, label decision, pack
      verification, evidence format, packer) and ranks them by
      top-cluster share so the user sees which dimensions are
      systemic vs. targeted. Selection union extended once more
      with a `cluster` kind keyed on (dimension, value); each
      cluster row has a Filter that writes back to lifted state and
      a Trace top → that pivots the causation view to the cluster's
      largest deduction. `ORIGIN_DIMENSIONS` is the single source
      of truth shared between the view and `isOnSelectedPath`.

### Phase 4: Polish + deploy

- [x] Cross-view navigation — verify all views are connected, click
      paths work end to end — `screenshot-crossview.mjs` walks every
      filter / drill-down / trace path through all 9 feature views
      (dropdown, Sankey, retailer scorecard click-to-filter, origin
      cluster click-to-filter, time range presets + custom dates,
      trace cross-link from cost view); zero JS errors. Three polish
      improvements landed alongside: (a) retailer scorecard sort
      switched to Worst recovery so the order visibly changes, (b)
      cohort bar always renders, sticky-positioned, shows combined
      filter + time range, (c) time range filter (6mo / 1yr / All /
      custom) added next to the type dropdown, composes with all
      other filters via `filteredDeductions`. KPI / aggregation
      gating fixed so dateRange-only filters propagate.
- [x] Responsive design check — verify it works on the devices the
      CEO would use — `screenshot-responsive.mjs` checks iPad
      portrait (768), MacBook (1366), wide (1680). Found and fixed
      origin-section overflow at 768 (wrapped both origin tables in
      scroll containers like the cost view), added
      `overflow-x: hidden` on body as defense. All three viewports
      now match document width to viewport.
- [x] Deploy to Netlify — live at
      https://retailer-deduction-recovery.netlify.app/
- [ ] Friend preview — hand off for feedback

## Out of scope for this arc

- Live backend / API
- Client data upload functionality
- Real dispute submission workflows
- User authentication
- Mobile-first design (responsive is fine, mobile-optimized is not
  required)
- ~~Folding extensions back into cinderhaven-data repo~~ (done 2026-05-10)

## Definition of done for this arc

- [ ] All ten features are functional and connected
- [ ] Sankey flow renders full deduction picture and zooms on click
- [ ] All views update when user navigates from one to another
- [ ] Synthetic data feels realistic for a ~$25M food manufacturer
- [ ] Retailer-specific behaviors are recognizable (not generic)
- [ ] Deployed to Cloudflare Pages with a shareable URL
- [ ] Friend has previewed and given feedback
- [ ] Feedback incorporated

---

## Arc history

When an arc completes, archive its goal, completion date, and outcome
here. Then start a new arc above. Provides continuity without bloating
the active plan.
