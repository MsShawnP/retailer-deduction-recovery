import type { Deduction, RetailersById, Summary } from "./types";

export async function loadSummary(): Promise<Summary> {
  const res = await fetch("/json/summary.json");
  if (!res.ok) throw new Error(`Failed to load summary.json: ${res.status}`);
  return res.json();
}

export async function loadDeductions(): Promise<Deduction[]> {
  const res = await fetch("/json/deductions.json");
  if (!res.ok) throw new Error(`Failed to load deductions.json: ${res.status}`);
  return res.json();
}

export async function loadRetailers(): Promise<RetailersById> {
  const res = await fetch("/json/retailers.json");
  if (!res.ok) throw new Error(`Failed to load retailers.json: ${res.status}`);
  return res.json();
}

export function formatDollars(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function formatPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatCount(n: number): string {
  return n.toLocaleString();
}
