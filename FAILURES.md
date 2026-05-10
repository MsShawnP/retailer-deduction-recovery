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

### 2026-05-10 — Recovery rate calibration took 5 rounds to land at 8.9%

**Attempted:** Target was 10% overall recovery rate. Started with
55/45 full/partial split, partial at uniform(0.35, 0.70), which
produced 5.7%. Iterated through four intermediate configurations
before landing at a stable 8.9%.

**Why it didn't work:** Multiple compounding factors made 10% harder
than expected:
1. Dollar-weighted filing rate (22.8%) is lower than count-based
   (24.4%) because placement_fees and vague deductions are large but
   rarely filed — they inflate the denominator without adding recoveries.
2. Raising filing rate alone dilutes case quality (more marginal
   cases filed → win rate drops).
3. 55/45 full/partial with partial at 35–70% meant nearly half of
   wins only recovered ~52 cents on the dollar.
4. Mathematical ceiling analysis showed 10% requires both filing AND
   win rates to move, not just one lever.

**Iteration history:**
- Round 1: 55/45 split → 5.7% recovery
- Round 2: 70/30 split → 6.3%
- Round 3: 75/25 split, partial floor raised to 0.50–0.85 → 7.5%
  (win rate dropped from 44% to 37.8% because higher filing diluted quality)
- Round 4: +0.04 filing rates, min(0.65, +0.12) handwritten boost → 8.8%
- Round 5: Reduced no-evidence penalty (-0.25 → -0.15), raised goodwill
  partial (0.15–0.35 → 0.25–0.50) → 8.9% overall / 9.5% on disputable

**What we tried instead:** Accepted 8.9% as structurally correct. The
gap from 10% is real: placement_fees (not disputable) and post-audit
claims (inflate total denominator without generating new recoveries)
create a mathematical ceiling. 9.5% on the disputable subset confirms
the model works.

**Status:** Resolved — 8.9% accepted as final calibration

**Tags:** calibration, recovery-rate, disputes, simulation, statistics
