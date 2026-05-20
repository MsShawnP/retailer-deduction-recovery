// Compute the 3-layer Sankey data from the denormalized deductions array.
//
// Layers (in order):
//   0. type             — deduction_type (short_ship, label_fine, etc.)
//   1. dispute_readiness — collapsed assessment: Ready / Needs work /
//                          Can't dispute / Never assessed
//   2. outcome          — dispute.outcome, or "Never filed"
//
// Slotting is excluded from the Sankey (shown as a callout below the
// chart) since it's a negotiated cost, not an operational failure.

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
  spoilage: "Spoilage",
  slotting: "Slotting",
};

// Display order for the type dropdown — by descending volume in the
// dataset so the most common types appear first. Slotting last because
// it's categorically different (negotiated, non-disputable).
export const TYPE_OPTIONS: string[] = [
  "Short ship",
  "Label fine",
  "Late delivery",
  "Promo billback",
  "Damaged",
  "Pallet fine",
  "Spoilage",
  "Vague",
  "Slotting",
];

// Operational types: the eight that flow through the failure pipeline.
// Slotting is excluded — it's a negotiated cost, not an operational
// failure, so views like recovery simulation, cost-to-dispute, dispute
// builder, timeline pressure, post-audit risk, and origin clustering
// scope to operational types only.
export const OPERATIONAL_TYPES: ReadonlySet<string> = new Set([
  "short_ship",
  "label_fine",
  "pallet_fine",
  "damaged",
  "late_delivery",
  "promo_billback",
  "vague",
  "spoilage",
]);

export function isOperational(d: Deduction): boolean {
  return OPERATIONAL_TYPES.has(d.deduction_type);
}

export const SLOTTING_TERMINAL_LABEL = "Not disputable — negotiated cost";

export const DEMO_DATE = new Date("2026-05-31");

export const WIN_PROB: Record<string, number> = {
  digital_complete: 0.65,
  digital_partial: 0.35,
  handwritten_only: 0.12,
  none: 0.05,
};

export type EvidenceCategory = "digital" | "paper" | "missing";

export function evidenceCategoryFor(d: Deduction): EvidenceCategory {
  if (d.dispute?.evidence_quality) {
    const q = d.dispute.evidence_quality;
    if (q === "digital_complete" || q === "digital_partial") return "digital";
    if (q === "handwritten_only") return "paper";
    return "missing";
  }
  if (!d.pack_record) return "missing";
  if (d.pack_record.evidence_location === "lost") return "missing";
  if (d.pack_record.evidence_format === "digital") return "digital";
  return "paper";
}

export function readableOutcome(o: string): string {
  return OUTCOME_LABELS[o] || o;
}

const OUTCOME_LABELS: Record<string, string> = {
  won: "Won",
  won_full: "Won full",
  won_partial: "Won partial",
  partial: "Partial win",
  pending: "Pending",
  lost: "Lost",
  lost_evidence: "Lost — evidence",
  lost_deadline: "Lost — deadline",
  lost_no_response: "Lost — no response",
  lost_other: "Lost — other",
  abandoned: "Abandoned",
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
  if (d.deduction_type === "spoilage") {
    // Sub-cause is encoded in the remittance_description keyword.
    const desc = (d.remittance_description ?? "").toLowerCase();
    if (desc.includes("temperature")) return "Heat exposure in transit";
    if (desc.includes("expired") || desc.includes("short-dated"))
      return "Expired / short-dated at receiving";
    if (desc.includes("quality")) return "Quality complaint at receiving";
    if (desc.includes("damage in transit")) return "Damage in transit";
    return "Other spoilage";
  }
  if (d.deduction_type === "slotting") return SLOTTING_TERMINAL_LABEL;
  return "Other";
}


function outcomeFor(d: Deduction): string {
  if (!d.dispute) return "Never filed";
  return OUTCOME_LABELS[d.dispute.outcome] || d.dispute.outcome;
}

export function disputeReadinessFor(d: Deduction): string {
  if (d.dispute) return "Disputed";

  if (d.is_vague) return "Never assessed";

  if (d.dispute_deadline) {
    const deadline = new Date(d.dispute_deadline);
    if (deadline < DEMO_DATE) return "Can't dispute";
  }

  const loc = d.pack_record?.evidence_location;
  const verification = d.pack_record?.pack_verification;

  if (!d.pack_record) return "Can't dispute";
  if (loc === "lost") return "Can't dispute";
  if (verification === "none") return "Can't dispute";

  if (verification === "digital_log" && loc === "system")
    return "Ready to dispute";

  return "Needs work";
}

export function buildSankeyData(deductions: Deduction[]): SankeyData {
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
    const t = TYPE_LABELS[d.deduction_type] || d.deduction_type;
    const readiness = disputeReadinessFor(d);
    const oc = outcomeFor(d);

    addEdge(0, t, 1, readiness, d.amount);
    addEdge(1, readiness, 2, oc, d.amount);
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

export const LAYER_TITLES = [
  "Deduction type",
  "Dispute readiness",
  "Outcome",
];

// ---- Path helpers for click-to-zoom and table filtering ----

export function pathIds(d: Deduction): string[] {
  const t = TYPE_LABELS[d.deduction_type] || d.deduction_type;
  const readiness = disputeReadinessFor(d);
  const oc = outcomeFor(d);
  return [`0:${t}`, `1:${readiness}`, `2:${oc}`];
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
  // Node/link selections come from the Sankey, which excludes slotting.
  if (d.deduction_type === "slotting") return false;
  const ids = pathIds(d);
  if (sel.kind === "node") return ids.includes(sel.nodeId);
  for (let i = 0; i < ids.length - 1; i++) {
    if (ids[i] === sel.source && ids[i + 1] === sel.target) return true;
  }
  return false;
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

export const OUTCOME_COLORS: Record<string, string> = {
  Won:                  "#0e6e5a", // Hong Kong-25
  "Won full":           "#0e6e5a", // Hong Kong-25
  "Won partial":        "#0e6e5a", // Hong Kong-25
  "Partial win":        "#0e6e5a", // Hong Kong-25
  Pending:              "#b3b3b3", // London-70
  Abandoned:            "#b82d4a", // Tokyo-40
  Lost:                 "#b82d4a", // Tokyo-40
  "Lost — evidence":    "#b82d4a", // Tokyo-40
  "Lost — deadline":    "#b82d4a", // Tokyo-40
  "Lost — no response": "#b82d4a", // Tokyo-40
  "Lost — other":       "#b82d4a", // Tokyo-40
  "Never filed":        "#b82d4a", // Tokyo-40
};
