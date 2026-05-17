# Retailer Deduction Recovery — Failure Log

What was attempted that didn't work, why it didn't work, and what was
tried next.

Lower bar than DECISIONS.md — capture failures even when they didn't
produce a durable rule. The whole point: future-you (or future-Claude)
shouldn't re-attempt dead ends because the lesson got lost.

---

## Format

### YYYY-MM-DD — [One-line failure description]

**Attempted:** [What was tried]

**Why it didn't work:** [Concrete reason, not "it broke." If the
failure mode was technical, name the specific issue. If the failure
mode was scope or approach, name that.]

**What we tried instead:** [The next attempt, which may also have
failed and may have its own entry below]

**Status:** Resolved / open / abandoned

**Tags:** [keywords for future text-search — e.g., "rendering, pandoc,
quarto" or "scope, scrollytelling, decoration"]

---

## Entries

### 2026-05-17 — Misquoted industry deduction benchmark caused false alarm

**Attempted:** During data-change audit, flagged the 16.4%
deduction-to-revenue ratio as "BROKEN" and the 45% promo billback
share as narratively problematic, citing "industry norm is 1-3%."

**Why it didn't work:** The 1-3% figure applies only to
operational/shortage deductions alone, not total deductions. Web
research found: total deductions for CPG run 5-15% (managed) to
15-25%+ (emerging brands through UNFI/KeHE). Promo/trade deductions
are typically 50%+ of all deductions — so 45% actually shows
operational failures punching above their weight. Both numbers are
defensible for Cinderhaven's profile.

**What we tried instead:** Ran structured web research (Eightx,
CPGVision, Woodridge, Confido sources) to verify actual industry
ranges before recommending changes. Confirmed the data can stay as-is.

**Status:** Resolved — no data changes needed.

**Tags:** data calibration, industry benchmarks, deduction rates, audit

---

### 2026-05-17 — useMemo placed after early return violated Rules of Hooks

**Attempted:** Wrapped `computeKpis(filteredDeductions)` in `useMemo`
for performance, placing it at line 103 in App.tsx — after the
`if (error)` and `if (!summary || !deductions)` early returns.

**Why it didn't work:** React requires hooks to be called in the same
order on every render. On the first render (loading state), the early
return fires before the `useMemo` runs. On the second render (data
loaded), the `useMemo` runs for the first time — React sees a new hook
appearing that wasn't there before and throws "Rendered more hooks than
during the previous render."

**What we tried instead:** Moved the `useMemo` above the early returns
with an internal null guard: `if (!filteredDeductions) return null`.
The hook always runs in the same position regardless of loading state.

**Status:** Resolved.

**Tags:** react, hooks, useMemo, early return, rules of hooks
