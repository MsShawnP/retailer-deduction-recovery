// Single source of truth for cross-view constants. Centralized to
// avoid silent drift between the simulation, cost, and pressure views.

// The "as-of" reference date the demo runs against. Deadlines, days-
// until-expiration, and past-deadline checks all anchor here.
export const TODAY = new Date("2026-05-31");
export const TODAY_LABEL = "2026-05-31";

export const DAY_MS = 86_400_000;

// Evidence-quality → expected win probability for an on-time, filed
// dispute. Calibrated against the per-retailer dispute outcome ranges
// in research/retailers/. Used by the recovery simulation and the
// cost-to-dispute triage so the two views agree.
//
// `none` is 0.0: a dispute with no evidence at all is not winnable —
// retailers will not honor a written request to reconsider without
// any supporting records.
export const WIN_PROB: Record<string, number> = {
  digital_complete: 0.65,
  digital_partial: 0.35,
  handwritten_only: 0.12,
  none: 0.0,
};
