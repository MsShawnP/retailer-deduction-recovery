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
- [ ] Build Python scripts to extend the cinderhaven-data SQLite
      database with deduction-specific tables
- [ ] Generate synthetic deduction data — realistic mix of types
      (short ship, labeling fines, pallet noncompliance, promo
      disputes, damaged product, late delivery, vague codes)
- [ ] Generate synthetic dispute data — timelines, evidence submitted
      (handwritten notes vs. digital records), outcomes, missed
      deadlines
- [ ] Generate synthetic pack/ship records — what was actually picked,
      packed, and labeled per order
- [ ] Build JSON export script — transform SQLite into the JSON
      structures the React app needs
- [ ] Validate synthetic data — deduction volumes and dollar amounts
      feel realistic for a ~$25M manufacturer

### Phase 2: React app scaffold + Sankey

- [ ] Set up React project, build system, Netlify deployment config
- [ ] Build Sankey flow — full deduction view on landing, all branch
      points (type → root cause → evidence quality → accessibility →
      timeliness → outcome)
- [ ] Implement zoom-on-click — user clicks a branch, view narrows
      to that path with detail
- [ ] Connect Sankey branches to downstream views (clicking a path
      loads relevant data in other views)

### Phase 3: Feature views (vertical slices)

- [ ] Deduction explorer — six-layer drill-down for individual
      deductions (the deduction, visibility/pattern, root cause,
      evidence quality, accessibility, timeliness)
- [ ] Causation tracing — follow a single order from label → short
      count → deduction → failed dispute, end to end
- [ ] Recovery simulation — toggle operational and administrative
      fixes on/off, watch portfolio-wide recovery rate and dollar
      amounts shift in real time
- [ ] Cost-to-dispute profitability filter — calculate whether a
      deduction is worth fighting given labor cost to gather evidence
      and dispute
- [ ] Dispute builder — evidence readiness view showing what exists
      vs. what's needed for each deduction, mock dispute package
- [ ] Timeline pressure view — deductions mapped against
      retailer-specific dispute deadlines, showing what's still
      in window, what's expiring, what's already dead
- [ ] Post-audit risk exposure — based on current evidence gaps,
      calculate and visualize retroactive clawback vulnerability
- [ ] Retailer scorecard — deduction patterns, dispute acceptance
      rates, deadline strictness, aggressiveness by retailer
- [ ] Root cause clustering by origin point — deductions grouped by
      warehouse, packing line, carrier, or system

### Phase 4: Polish + deploy

- [ ] Cross-view navigation — verify all views are connected, click
      paths work end to end
- [ ] Responsive design check — verify it works on the devices the
      CEO would use
- [ ] Deploy to Netlify
- [ ] Friend preview — hand off for feedback

## Out of scope for this arc

- Live backend / API
- Client data upload functionality
- Real dispute submission workflows
- User authentication
- Mobile-first design (responsive is fine, mobile-optimized is not
  required)
- Folding extensions back into cinderhaven-data repo (separate task
  after this arc)

## Definition of done for this arc

- [ ] All ten features are functional and connected
- [ ] Sankey flow renders full deduction picture and zooms on click
- [ ] All views update when user navigates from one to another
- [ ] Synthetic data feels realistic for a ~$25M food manufacturer
- [ ] Retailer-specific behaviors are recognizable (not generic)
- [ ] Deployed to Netlify with a shareable URL
- [ ] Friend has previewed and given feedback
- [ ] Feedback incorporated

---

## Arc history

When an arc completes, archive its goal, completion date, and outcome
here. Then start a new arc above. Provides continuity without bloating
the active plan.
