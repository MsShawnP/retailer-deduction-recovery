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
