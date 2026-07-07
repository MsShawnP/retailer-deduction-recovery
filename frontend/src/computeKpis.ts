import type { Deduction } from "./types";

export function computeKpis(ds: Deduction[]) {
  let dollar = 0;
  let recovered = 0;
  let disputedCount = 0;
  let noDisputeCount = 0;
  let noDisputeDollar = 0;
  let laborHours = 0;
  for (const d of ds) {
    dollar += d.amount;
    if (d.dispute) {
      disputedCount++;
      recovered += d.dispute.recovered_amount || 0;
      laborHours += d.dispute.labor_hours || 0;
    } else {
      noDisputeCount++;
      noDisputeDollar += d.amount;
    }
  }
  return {
    count: ds.length,
    dollar,
    recovered,
    disputedCount,
    noDisputeCount,
    noDisputeDollar,
    laborHours,
  };
}
