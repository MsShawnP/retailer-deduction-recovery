// Compute the 6-layer Sankey data from the denormalized deductions array.
//
// Layers (in order):
//   0. type            — deduction_type (short_ship, label_fine, etc.)
//   1. root_cause      — derived from pack/ship signals (non-scannable
//                         label, real shortage, generic label, etc.)
//   2. evidence_quality — from dispute.evidence_quality, or "Never filed"
//   3. accessibility   — pack_record.evidence_location label, or "n/a"
//   4. timeliness      — was_within_deadline, with NULL and never-filed
//                         buckets
//   5. outcome         — dispute.outcome, or "Never filed"
//
// Link value = sum of deduction.amount. Each deduction contributes one
// path through all six layers, so total value flowing OUT of the type
// layer equals total deductions value.

import type { Deduction } from "../types";

export interface SankeyNode {
  id: string;
  layer: number;
  label: string;
  value?: number;  // populated by d3-sankey at layout time
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export const TYPE_LABELS: Record<string, string> = {
  short_ship: "Short ship",
  label_fine: "Label fine",
  pallet_fine: "Pallet fine",
  damaged: "Damaged",
  late_delivery: "Late delivery",
  promo_billback: "Promo billback",
  vague: "Vague",
};

// Display order for the type dropdown — by descending volume in the
// dataset so the most common types appear first.
export const TYPE_OPTIONS: string[] = [
  "Short ship",
  "Label fine",
  "Late delivery",
  "Promo billback",
  "Damaged",
  "Pallet fine",
  "Vague",
];

const OUTCOME_LABELS: Record<string, string> = {
  won_full: "Won full",
  won_partial: "Won partial",
  pending: "Pending",
  lost_evidence: "Lost — evidence",
  lost_deadline: "Lost — deadline",
  lost_no_response: "Lost — no response",
  lost_other: "Lost — other",
  abandoned: "Abandoned",
};

const EVIDENCE_QUALITY_LABELS: Record<string, string> = {
  digital_complete: "Digital, complete",
  digital_partial: "Digital, partial",
  handwritten_only: "Handwritten only",
  none: "No evidence",
};

const LOCATION_LABELS: Record<string, string> = {
  system: "Digital system",
  warehouse_clipboard: "Warehouse clipboard",
  office_filing_cabinet: "Filing cabinet",
  lost: "Lost",
};

export function rootCauseFor(d: Deduction): string {
  if (d.is_post_audit) return "Post-audit clawback";

  if (d.deduction_type === "short_ship") {
    if (d.pack_record?.label_scannable === false) return "Non-scannable label";
    if (d.shipment?.bol_signed_short) return "BOL signed short";
    if (d.pack_record && d.pack_record.units_pick_pack_match === false) return "Pack/pick mismatch";
    return "Other shortage";
  }
  if (d.deduction_type === "label_fine") {
    if (d.pack_record?.label_type_used === "generic") return "Generic label";
    return "Other label issue";
  }
  if (d.deduction_type === "pallet_fine") return "Pallet noncompliance";
  if (d.deduction_type === "damaged") return "Damage at receiving";
  if (d.deduction_type === "late_delivery") return "Delivery missed window";
  if (d.deduction_type === "promo_billback") return "Promo program";
  if (d.deduction_type === "vague") return "Opaque remittance";
  return "Other";
}

function evidenceQualityFor(d: Deduction): string {
  if (!d.dispute) return "Never filed";
  return EVIDENCE_QUALITY_LABELS[d.dispute.evidence_quality] || d.dispute.evidence_quality;
}

function accessibilityFor(d: Deduction): string {
  if (!d.dispute) return "n/a — never filed";
  if (!d.pack_record?.evidence_location) return "No verification";
  return LOCATION_LABELS[d.pack_record.evidence_location] || d.pack_record.evidence_location;
}

function timelinessFor(d: Deduction): string {
  if (!d.dispute) return "Never filed";
  if (d.dispute.was_within_deadline === true) return "On time";
  if (d.dispute.was_within_deadline === false) return "Past deadline";
  return "No published deadline";
}

function outcomeFor(d: Deduction): string {
  if (!d.dispute) return "Never filed";
  return OUTCOME_LABELS[d.dispute.outcome] || d.dispute.outcome;
}

export function buildSankeyData(deductions: Deduction[]): SankeyData {
  // Aggregate (sourceLayer, sourceLabel, targetLayer, targetLabel) -> $
  const linkAcc = new Map<string, number>();
  const nodeIds = new Set<string>();

  function addEdge(sourceLayer: number, sourceLabel: string,
                   targetLayer: number, targetLabel: string,
                   value: number) {
    const sourceId = `${sourceLayer}:${sourceLabel}`;
    const targetId = `${targetLayer}:${targetLabel}`;
    nodeIds.add(sourceId);
    nodeIds.add(targetId);
    const key = `${sourceId}>>${targetId}`;
    linkAcc.set(key, (linkAcc.get(key) || 0) + value);
  }

  for (const d of deductions) {
    if (d.amount <= 0) continue;
    const t  = TYPE_LABELS[d.deduction_type] || d.deduction_type;
    const rc = rootCauseFor(d);
    const eq = evidenceQualityFor(d);
    const ac = accessibilityFor(d);
    const tm = timelinessFor(d);
    const oc = outcomeFor(d);

    addEdge(0, t,  1, rc, d.amount);
    addEdge(1, rc, 2, eq, d.amount);
    addEdge(2, eq, 3, ac, d.amount);
    addEdge(3, ac, 4, tm, d.amount);
    addEdge(4, tm, 5, oc, d.amount);
  }

  const nodes: SankeyNode[] = [...nodeIds].map((id) => {
    const [layerStr, ...rest] = id.split(":");
    return { id, layer: parseInt(layerStr, 10), label: rest.join(":") };
  });

  const links: SankeyLink[] = [...linkAcc.entries()].map(([key, value]) => {
    const [source, target] = key.split(">>");
    return { source, target, value };
  });

  return { nodes, links };
}

// Abbreviated to keep all six column titles on one line at common
// viewport widths: "Evidence quality" → "Evidence",
// "Evidence accessibility" → "Accessibility",
// "Dispute timeliness" → "Timeliness".
export const LAYER_TITLES = [
  "Deduction type",
  "Root cause",
  "Evidence",
  "Accessibility",
  "Timeliness",
  "Outcome",
];

// ---- Path helpers for click-to-zoom and table filtering ----

export function pathIds(d: Deduction): string[] {
  const t  = TYPE_LABELS[d.deduction_type] || d.deduction_type;
  const rc = rootCauseFor(d);
  const eq = evidenceQualityFor(d);
  const ac = accessibilityFor(d);
  const tm = timelinessFor(d);
  const oc = outcomeFor(d);
  return [
    `0:${t}`,
    `1:${rc}`,
    `2:${eq}`,
    `3:${ac}`,
    `4:${tm}`,
    `5:${oc}`,
  ];
}

export type Selection =
  | { kind: "node"; nodeId: string }
  | { kind: "link"; source: string; target: string }
  | { kind: "retailer"; retailerId: string }
  | { kind: "cluster"; dimension: string; value: string };

// Origin-cluster dimensions used by the OriginClusteringView. Defined
// here so isOnSelectedPath can evaluate cluster filters without taking
// a dependency on the view module.
export interface ClusterDimension {
  id: string;
  label: string;
  getter: (d: Deduction) => string;
}

export const ORIGIN_DIMENSIONS: ClusterDimension[] = [
  {
    id: "carrier",
    label: "Carrier",
    getter: (d) => d.shipment?.carrier ?? "(no shipment)",
  },
  {
    id: "label_type",
    label: "Label decision",
    getter: (d) => d.pack_record?.label_type_used ?? "(no pack record)",
  },
  {
    id: "pack_verification",
    label: "Pack verification",
    getter: (d) => d.pack_record?.pack_verification ?? "(no pack record)",
  },
  {
    id: "evidence_format",
    label: "Evidence format",
    getter: (d) => d.pack_record?.evidence_format ?? "(no pack record)",
  },
  {
    id: "packer",
    label: "Packer",
    getter: (d) => d.pack_record?.packer_initials || "(unassigned)",
  },
];

const DIM_BY_ID = new Map(ORIGIN_DIMENSIONS.map((d) => [d.id, d]));

export function clusterValueFor(d: Deduction, dimension: string): string {
  const dim = DIM_BY_ID.get(dimension);
  return dim ? dim.getter(d) : "";
}

export function isOnSelectedPath(d: Deduction, sel: Selection | null): boolean {
  if (!sel) return true;
  if (sel.kind === "retailer") return d.retailer.id === sel.retailerId;
  if (sel.kind === "cluster")
    return clusterValueFor(d, sel.dimension) === sel.value;
  const ids = pathIds(d);
  if (sel.kind === "node") return ids.includes(sel.nodeId);
  const layer = parseInt(sel.source.split(":")[0], 10);
  return ids[layer] === sel.source && ids[layer + 1] === sel.target;
}

export function highlightedLinkSet(selectedDeductions: Deduction[]): Set<string> {
  const out = new Set<string>();
  for (const d of selectedDeductions) {
    const ids = pathIds(d);
    for (let i = 0; i < ids.length - 1; i++) {
      out.add(`${ids[i]}>>${ids[i + 1]}`);
    }
  }
  return out;
}

export function highlightedNodeSet(selectedDeductions: Deduction[]): Set<string> {
  const out = new Set<string>();
  for (const d of selectedDeductions) {
    for (const id of pathIds(d)) out.add(id);
  }
  return out;
}

// Human-readable label for a selection — used in the filter chip.
// Retailer-kind selections need the retailers map to look up display
// names; callers can pass a fallback name so this stays self-contained.
export function selectionLabel(sel: Selection | null, retailerName?: string): string {
  if (!sel) return "";
  if (sel.kind === "retailer") {
    return `Retailer = ${retailerName ?? sel.retailerId}`;
  }
  if (sel.kind === "cluster") {
    const dim = DIM_BY_ID.get(sel.dimension);
    return `${dim?.label ?? sel.dimension} = ${sel.value.replace(/_/g, " ")}`;
  }
  if (sel.kind === "node") {
    const [layerStr, ...rest] = sel.nodeId.split(":");
    const layer = parseInt(layerStr, 10);
    return `${LAYER_TITLES[layer]} = ${rest.join(":")}`;
  }
  const [, ...srcRest] = sel.source.split(":");
  const [, ...tgtRest] = sel.target.split(":");
  return `${srcRest.join(":")} → ${tgtRest.join(":")}`;
}

// Outcomes split into three categorical buckets:
//   - Wins  — green (#0A7B3E)
//   - Pending — neutral gray
//   - Lost / abandoned / never_filed — Economist red
// Within-bucket detail comes from the node label, not the color.
// Wins use one shade so won_full and won_partial both read as "won".
export const OUTCOME_COLORS: Record<string, string> = {
  "Won full":           "#0A7B3E",  // green
  "Won partial":        "#0A7B3E",  // green (same — winning is winning)
  Pending:              "#8B95A1",  // neutral gray
  Abandoned:            "#E3120B",  // red — gave up = loss
  "Lost — evidence":    "#E3120B",
  "Lost — deadline":    "#E3120B",
  "Lost — no response": "#E3120B",
  "Lost — other":       "#E3120B",
  "Never filed":        "#E3120B",
};
