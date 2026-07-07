# PLAN.md Revision — Phase 1 Regen

Replace the current Phase 1 section with the following. Phase 2
and Phase 3 sections stay as-is except where noted.

---

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

#### Phase 1b: Taxonomy expansion + evidence model (regen)

- [ ] Update `data/schema.md` with 9 new deduction types, evidence
      tables (`evidence_documents`, `evidence_requirements`), and
      `retailer_error` root cause category — see
      `data/evidence-schema-additions.md`
- [ ] Add deduction codes for 9 new types to `deduction_codes` seed
      table, per retailer (Walmart, Costco, WFM, UNFI, KeHE,
      Wegmans, Sprouts)
- [ ] Update generators in `build_deductions_db.py`:
      - 16 deduction types with realistic distributions
      - Dispute rate ~25% (down from 45%)
      - Win rate ~40% on disputed claims
      - Overall recovery ~10%
      - Evidence document generation per deduction (using Cinderhaven
        evidence profile from schema spec)
      - Retailer aggressiveness correlation (more borderline claims
        from retailers where Cinderhaven disputes less)
      - `evidence_retrieval_cost_hours` per deduction
- [ ] Generate `evidence_documents` table — per-deduction document
      inventory with realistic status/format/location/expiration
      per Cinderhaven profile
- [ ] Generate `evidence_requirements` table — per-retailer,
      per-deduction-type required documents for successful dispute
- [ ] Update JSON export to include evidence inventory per deduction
      and evidence requirements per retailer
- [ ] Update validator:
      - 16 type distribution checks
      - Dispute rate target ~25%
      - Win rate target ~40%
      - Evidence coverage (every deduction has evidence_documents rows)
      - Evidence status distribution matches Cinderhaven profile
      - Retrieval cost hours populated
      - New types present in deduction_codes per retailer

### Phase 2: React app scaffold + Sankey

- [x] Set up React project, build system, Netlify deployment config
- [x] Build Sankey flow — all branch points
- [x] Implement zoom-on-click
- [x] Connect Sankey branches to downstream views

**Phase 2 note:** After Phase 1b regen, verify Sankey absorbs 16
types and new `retailer_error` root cause branch without manual
changes. If type/root-cause lists are hardcoded anywhere in
frontend, update to be data-driven.

### Phase 3: Feature views (vertical slices)

No changes to the task list. Phase 3 features will consume the
richer evidence model:

- **Deduction explorer** — evidence quality card shows actual
  document inventory instead of generic score
- **Dispute builder** — three columns: ready / not ready / missing,
  with per-document detail and retailer-specific requirements
- **Cost-to-dispute filter** — uses `evidence_retrieval_cost_hours`
  × labor rate vs. deduction value × win probability
- **Recovery simulation** — toggling fixes changes evidence status
  across portfolio; includes deterrence effect on incoming volume
- **Timeline pressure** — evidence expiration dates add urgency
  layer ("POD expires in 12 days")
- **Retailer scorecard** — aggressiveness pattern visible in data

These don't need PLAN.md task changes — the features are already
listed. The richer data model makes them better.
