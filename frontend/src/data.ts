import type { Deduction, RetailersById, Summary } from "./types";

export async function loadSummary(): Promise<Summary> {
  const res = await fetch("/json/summary.json");
  if (!res.ok) throw new Error(`Failed to load summary.json: ${res.status}`);
  const data = await res.json();
  if (!data || typeof data.window !== "object" || typeof data.totals !== "object")
    throw new Error("summary.json: unexpected shape");
  return data as Summary;
}

export async function loadDeductions(): Promise<Deduction[]> {
  const res = await fetch("/json/deductions.json");
  if (!res.ok) throw new Error(`Failed to load deductions.json: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data))
    throw new Error("deductions.json: expected array");
  return data as Deduction[];
}

export async function loadRetailers(): Promise<RetailersById> {
  const res = await fetch("/json/retailers.json");
  if (!res.ok) throw new Error(`Failed to load retailers.json: ${res.status}`);
  const data = await res.json();
  if (!data || typeof data !== "object")
    throw new Error("retailers.json: expected object");
  return data as RetailersById;
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
