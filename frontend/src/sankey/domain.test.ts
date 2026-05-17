import { describe, it, expect } from "vitest";
import type { Deduction } from "../types";
import {
  disputeReadinessFor,
  rootCauseFor,
  evidenceCategoryFor,
  buildSankeyData,
  isOnSelectedPath,
  pathIds,
  highlightedLinkSet,
  highlightedNodeSet,
  selectionLabel,
  isOperational,
  clusterValueFor,
  DEMO_DATE,
  WIN_PROB,
  SLOTTING_TERMINAL_LABEL,
  type Selection,
} from "./domain";

function makeDeduction(overrides: Partial<Deduction> = {}): Deduction {
  return {
    deduction_id: "DED-001",
    deduction_type: "short_ship",
    code_as_remitted: "SS01",
    remittance_description: "Short shipment on PO 1234",
    amount: 500,
    deduction_date: "2026-03-15",
    dispute_deadline: "2026-07-15",
    is_vague: false,
    is_post_audit: false,
    remittance_id: "REM-001",
    retailer: { id: "R1", name: "Walmart", channel_type: "mass" },
    code: { id: "C1", code: "SS01", name: "Short Ship", is_published: true },
    order: {
      order_id: "O1",
      po_number: "PO-1234",
      po_date: "2026-02-01",
      total_units: 100,
      total_value: 2000,
      requested_ship_date: "2026-03-01",
      requested_delivery_window_end: "2026-03-05",
    },
    pack_record: {
      label_type_used: "compliant",
      label_scannable: true,
      pack_verification: "digital_log",
      evidence_format: "digital",
      evidence_location: "system",
      evidence_retrieval_minutes: 5,
      packer_initials: "JM",
      units_picked: 100,
      units_packed: 100,
      units_pick_pack_match: true,
    },
    shipment: {
      shipment_id: "S1",
      ship_date: "2026-03-01",
      delivery_date: "2026-03-03",
      carrier: "FedEx",
      bol_signed: true,
      bol_signed_short: false,
      bol_signed_damaged: false,
      pod_received: true,
      asn_sent: true,
      asn_sent_late: false,
      units_shipped: 100,
      pallets_shipped: 2,
    },
    dispute: null,
    post_audit: null,
    ...overrides,
  };
}

// ---------- disputeReadinessFor ----------

describe("disputeReadinessFor", () => {
  it("returns 'Disputed' when dispute exists", () => {
    const d = makeDeduction({
      dispute: {
        dispute_id: "D1",
        filed_date: "2026-04-01",
        filing_method: "portal",
        evidence_quality: "digital_complete",
        submitted_evidence_count: 3,
        was_within_deadline: true,
        outcome: "won_full",
        recovered_amount: 500,
        closed_date: "2026-04-15",
        labor_hours: 2,
        evidence: [],
      },
    });
    expect(disputeReadinessFor(d)).toBe("Disputed");
  });

  it("returns 'Never assessed' when is_vague is true", () => {
    const d = makeDeduction({ is_vague: true, dispute: null });
    expect(disputeReadinessFor(d)).toBe("Never assessed");
  });

  it("returns 'Can't dispute' when deadline is before DEMO_DATE", () => {
    const d = makeDeduction({
      dispute_deadline: "2026-04-01",
      dispute: null,
    });
    expect(disputeReadinessFor(d)).toBe("Can't dispute");
  });

  it("does not reject based on deadline when deadline is after DEMO_DATE", () => {
    const d = makeDeduction({
      dispute_deadline: "2026-08-01",
      dispute: null,
    });
    expect(disputeReadinessFor(d)).not.toBe("Can't dispute");
  });

  it("returns 'Can't dispute' when pack_record is null", () => {
    const d = makeDeduction({ pack_record: null, dispute: null });
    expect(disputeReadinessFor(d)).toBe("Can't dispute");
  });

  it("returns 'Can't dispute' when evidence_location is 'lost'", () => {
    const d = makeDeduction({
      dispute: null,
      pack_record: {
        label_type_used: "compliant",
        label_scannable: true,
        pack_verification: "digital_log",
        evidence_format: "digital",
        evidence_location: "lost",
        evidence_retrieval_minutes: null,
        packer_initials: "JM",
        units_picked: 100,
        units_packed: 100,
        units_pick_pack_match: true,
      },
    });
    expect(disputeReadinessFor(d)).toBe("Can't dispute");
  });

  it("returns 'Can't dispute' when pack_verification is 'none'", () => {
    const d = makeDeduction({
      dispute: null,
      pack_record: {
        label_type_used: "compliant",
        label_scannable: true,
        pack_verification: "none",
        evidence_format: "digital",
        evidence_location: "system",
        evidence_retrieval_minutes: 5,
        packer_initials: "JM",
        units_picked: 100,
        units_packed: 100,
        units_pick_pack_match: true,
      },
    });
    expect(disputeReadinessFor(d)).toBe("Can't dispute");
  });

  it("returns 'Ready to dispute' with digital_log + system", () => {
    const d = makeDeduction({ dispute: null });
    expect(disputeReadinessFor(d)).toBe("Ready to dispute");
  });

  it("returns 'Needs work' for intermediate evidence states", () => {
    const d = makeDeduction({
      dispute: null,
      pack_record: {
        label_type_used: "compliant",
        label_scannable: true,
        pack_verification: "paper_checklist",
        evidence_format: "paper",
        evidence_location: "filing_cabinet",
        evidence_retrieval_minutes: 30,
        packer_initials: "AB",
        units_picked: 100,
        units_packed: 100,
        units_pick_pack_match: true,
      },
    });
    expect(disputeReadinessFor(d)).toBe("Needs work");
  });
});

// ---------- rootCauseFor ----------

describe("rootCauseFor", () => {
  it("returns 'Post-audit clawback' for post-audit deductions", () => {
    const d = makeDeduction({ is_post_audit: true });
    expect(rootCauseFor(d)).toBe("Post-audit clawback");
  });

  it("returns 'Non-scannable label' for short_ship with non-scannable label", () => {
    const d = makeDeduction({
      deduction_type: "short_ship",
      pack_record: {
        ...makeDeduction().pack_record!,
        label_scannable: false,
      },
    });
    expect(rootCauseFor(d)).toBe("Non-scannable label");
  });

  it("returns 'BOL signed short' for short_ship with bol_signed_short", () => {
    const d = makeDeduction({
      deduction_type: "short_ship",
      shipment: { ...makeDeduction().shipment!, bol_signed_short: true },
    });
    expect(rootCauseFor(d)).toBe("BOL signed short");
  });

  it("returns 'Pack/pick mismatch' for short_ship with mismatch", () => {
    const d = makeDeduction({
      deduction_type: "short_ship",
      pack_record: {
        ...makeDeduction().pack_record!,
        units_pick_pack_match: false,
      },
    });
    expect(rootCauseFor(d)).toBe("Pack/pick mismatch");
  });

  it("returns 'Other shortage' for short_ship with no specific cause", () => {
    const d = makeDeduction({
      deduction_type: "short_ship",
      pack_record: null,
      shipment: { ...makeDeduction().shipment!, bol_signed_short: false },
    });
    expect(rootCauseFor(d)).toBe("Other shortage");
  });

  it("returns 'Generic label' for label_fine with generic label", () => {
    const d = makeDeduction({
      deduction_type: "label_fine",
      pack_record: {
        ...makeDeduction().pack_record!,
        label_type_used: "generic",
      },
    });
    expect(rootCauseFor(d)).toBe("Generic label");
  });

  it("returns 'Other label issue' for non-generic label_fine", () => {
    const d = makeDeduction({
      deduction_type: "label_fine",
      pack_record: {
        ...makeDeduction().pack_record!,
        label_type_used: "compliant",
      },
    });
    expect(rootCauseFor(d)).toBe("Other label issue");
  });

  it("returns correct causes for simple types", () => {
    expect(rootCauseFor(makeDeduction({ deduction_type: "pallet_fine" }))).toBe("Pallet noncompliance");
    expect(rootCauseFor(makeDeduction({ deduction_type: "damaged" }))).toBe("Damage at receiving");
    expect(rootCauseFor(makeDeduction({ deduction_type: "late_delivery" }))).toBe("Delivery missed window");
    expect(rootCauseFor(makeDeduction({ deduction_type: "promo_billback" }))).toBe("Promo program");
    expect(rootCauseFor(makeDeduction({ deduction_type: "vague" }))).toBe("Opaque remittance");
  });

  it("returns spoilage sub-causes based on remittance_description", () => {
    expect(rootCauseFor(makeDeduction({
      deduction_type: "spoilage",
      remittance_description: "Product temperature violation at receiving",
    }))).toBe("Heat exposure in transit");

    expect(rootCauseFor(makeDeduction({
      deduction_type: "spoilage",
      remittance_description: "Expired product on shelf",
    }))).toBe("Expired / short-dated at receiving");

    expect(rootCauseFor(makeDeduction({
      deduction_type: "spoilage",
      remittance_description: "Short-dated items rejected",
    }))).toBe("Expired / short-dated at receiving");

    expect(rootCauseFor(makeDeduction({
      deduction_type: "spoilage",
      remittance_description: "Quality complaint from customer",
    }))).toBe("Quality complaint at receiving");

    expect(rootCauseFor(makeDeduction({
      deduction_type: "spoilage",
      remittance_description: "Damage in transit noted on BOL",
    }))).toBe("Damage in transit");

    expect(rootCauseFor(makeDeduction({
      deduction_type: "spoilage",
      remittance_description: "General spoilage",
    }))).toBe("Other spoilage");
  });

  it("returns slotting terminal label for slotting type", () => {
    const d = makeDeduction({ deduction_type: "slotting" });
    expect(rootCauseFor(d)).toBe(SLOTTING_TERMINAL_LABEL);
  });
});

// ---------- evidenceCategoryFor ----------

describe("evidenceCategoryFor", () => {
  it("returns 'digital' for dispute with digital_complete", () => {
    const d = makeDeduction({
      dispute: {
        dispute_id: "D1", filed_date: "2026-04-01", filing_method: "portal",
        evidence_quality: "digital_complete", submitted_evidence_count: 3,
        was_within_deadline: true, outcome: "won_full", recovered_amount: 500,
        closed_date: "2026-04-15", labor_hours: 2, evidence: [],
      },
    });
    expect(evidenceCategoryFor(d)).toBe("digital");
  });

  it("returns 'digital' for dispute with digital_partial", () => {
    const d = makeDeduction({
      dispute: {
        dispute_id: "D1", filed_date: "2026-04-01", filing_method: "portal",
        evidence_quality: "digital_partial", submitted_evidence_count: 2,
        was_within_deadline: true, outcome: "pending", recovered_amount: 0,
        closed_date: null, labor_hours: 1, evidence: [],
      },
    });
    expect(evidenceCategoryFor(d)).toBe("digital");
  });

  it("returns 'paper' for dispute with handwritten_only", () => {
    const d = makeDeduction({
      dispute: {
        dispute_id: "D1", filed_date: "2026-04-01", filing_method: "email",
        evidence_quality: "handwritten_only", submitted_evidence_count: 1,
        was_within_deadline: true, outcome: "lost_evidence", recovered_amount: 0,
        closed_date: "2026-05-01", labor_hours: 3, evidence: [],
      },
    });
    expect(evidenceCategoryFor(d)).toBe("paper");
  });

  it("returns 'missing' for dispute with 'none' evidence quality", () => {
    const d = makeDeduction({
      dispute: {
        dispute_id: "D1", filed_date: "2026-04-01", filing_method: "portal",
        evidence_quality: "none", submitted_evidence_count: 0,
        was_within_deadline: false, outcome: "lost_no_response", recovered_amount: 0,
        closed_date: "2026-05-01", labor_hours: 0.5, evidence: [],
      },
    });
    expect(evidenceCategoryFor(d)).toBe("missing");
  });

  it("falls back to pack_record when no dispute — digital format", () => {
    const d = makeDeduction({
      dispute: null,
      pack_record: { ...makeDeduction().pack_record!, evidence_format: "digital" },
    });
    expect(evidenceCategoryFor(d)).toBe("digital");
  });

  it("falls back to pack_record — paper format", () => {
    const d = makeDeduction({
      dispute: null,
      pack_record: {
        ...makeDeduction().pack_record!,
        evidence_format: "paper",
        evidence_location: "filing_cabinet",
      },
    });
    expect(evidenceCategoryFor(d)).toBe("paper");
  });

  it("returns 'missing' when pack_record is null and no dispute", () => {
    const d = makeDeduction({ dispute: null, pack_record: null });
    expect(evidenceCategoryFor(d)).toBe("missing");
  });

  it("returns 'missing' when evidence_location is 'lost'", () => {
    const d = makeDeduction({
      dispute: null,
      pack_record: {
        ...makeDeduction().pack_record!,
        evidence_location: "lost",
      },
    });
    expect(evidenceCategoryFor(d)).toBe("missing");
  });
});

// ---------- buildSankeyData ----------

describe("buildSankeyData", () => {
  it("returns empty nodes and links for empty array", () => {
    const result = buildSankeyData([]);
    expect(result.nodes).toHaveLength(0);
    expect(result.links).toHaveLength(0);
  });

  it("skips deductions with zero amount", () => {
    const d = makeDeduction({ amount: 0 });
    const result = buildSankeyData([d]);
    expect(result.nodes).toHaveLength(0);
    expect(result.links).toHaveLength(0);
  });

  it("skips deductions with negative amount", () => {
    const d = makeDeduction({ amount: -100 });
    const result = buildSankeyData([d]);
    expect(result.nodes).toHaveLength(0);
    expect(result.links).toHaveLength(0);
  });

  it("creates proper nodes and links for a single deduction", () => {
    const d = makeDeduction({ amount: 1000 });
    const result = buildSankeyData([d]);

    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.links.length).toBe(2);

    const layers = result.nodes.map((n) => n.layer);
    expect(layers).toContain(0);
    expect(layers).toContain(1);
    expect(layers).toContain(2);

    for (const link of result.links) {
      expect(link.value).toBe(1000);
    }
  });

  it("accumulates amounts for same path", () => {
    const d1 = makeDeduction({ deduction_id: "D1", amount: 300 });
    const d2 = makeDeduction({ deduction_id: "D2", amount: 700 });
    const result = buildSankeyData([d1, d2]);

    expect(result.links.length).toBe(2);
    for (const link of result.links) {
      expect(link.value).toBe(1000);
    }
  });

  it("creates separate paths for different types", () => {
    const d1 = makeDeduction({ deduction_id: "D1", deduction_type: "short_ship", amount: 500 });
    const d2 = makeDeduction({ deduction_id: "D2", deduction_type: "label_fine", amount: 300 });
    const result = buildSankeyData([d1, d2]);

    const typeNodes = result.nodes.filter((n) => n.layer === 0);
    expect(typeNodes.length).toBe(2);
    expect(typeNodes.map((n) => n.label).sort()).toEqual(["Label fine", "Short ship"]);
  });

  it("uses TYPE_LABELS for readable node labels", () => {
    const d = makeDeduction({ deduction_type: "promo_billback", amount: 100 });
    const result = buildSankeyData([d]);
    const typeNode = result.nodes.find((n) => n.layer === 0);
    expect(typeNode?.label).toBe("Promo billback");
  });
});

// ---------- isOnSelectedPath ----------

describe("isOnSelectedPath", () => {
  it("returns true for null selection (everything is selected)", () => {
    const d = makeDeduction();
    expect(isOnSelectedPath(d, null)).toBe(true);
  });

  it("filters by retailer id for retailer selection", () => {
    const d = makeDeduction({ retailer: { id: "R1", name: "Walmart", channel_type: "mass" } });
    const sel: Selection = { kind: "retailer", retailerId: "R1" };
    expect(isOnSelectedPath(d, sel)).toBe(true);

    const selOther: Selection = { kind: "retailer", retailerId: "R99" };
    expect(isOnSelectedPath(d, selOther)).toBe(false);
  });

  it("filters by cluster dimension and value", () => {
    const d = makeDeduction();
    const sel: Selection = { kind: "cluster", dimension: "carrier", value: "FedEx" };
    expect(isOnSelectedPath(d, sel)).toBe(true);

    const selOther: Selection = { kind: "cluster", dimension: "carrier", value: "UPS" };
    expect(isOnSelectedPath(d, selOther)).toBe(false);
  });

  it("excludes slotting from node selections", () => {
    const d = makeDeduction({ deduction_type: "slotting" });
    const sel: Selection = { kind: "node", nodeId: "0:Slotting" };
    expect(isOnSelectedPath(d, sel)).toBe(false);
  });

  it("excludes slotting from link selections", () => {
    const d = makeDeduction({ deduction_type: "slotting" });
    const sel: Selection = { kind: "link", source: "0:Slotting", target: "1:Disputed" };
    expect(isOnSelectedPath(d, sel)).toBe(false);
  });

  it("matches node selection against pathIds", () => {
    const d = makeDeduction({ deduction_type: "short_ship", dispute: null });
    const ids = pathIds(d);
    const sel: Selection = { kind: "node", nodeId: ids[0] };
    expect(isOnSelectedPath(d, sel)).toBe(true);
  });

  it("matches link selection against adjacent pathIds", () => {
    const d = makeDeduction({ deduction_type: "short_ship", dispute: null });
    const ids = pathIds(d);
    const sel: Selection = { kind: "link", source: ids[0], target: ids[1] };
    expect(isOnSelectedPath(d, sel)).toBe(true);
  });

  it("rejects link selection with non-adjacent nodes", () => {
    const d = makeDeduction({ deduction_type: "short_ship", dispute: null });
    const ids = pathIds(d);
    const sel: Selection = { kind: "link", source: ids[0], target: ids[2] };
    expect(isOnSelectedPath(d, sel)).toBe(false);
  });
});

// ---------- pathIds ----------

describe("pathIds", () => {
  it("returns 3 ids (one per layer)", () => {
    const d = makeDeduction();
    const ids = pathIds(d);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toMatch(/^0:/);
    expect(ids[1]).toMatch(/^1:/);
    expect(ids[2]).toMatch(/^2:/);
  });

  it("uses readable type label for layer 0", () => {
    const d = makeDeduction({ deduction_type: "late_delivery" });
    const ids = pathIds(d);
    expect(ids[0]).toBe("0:Late delivery");
  });

  it("uses dispute readiness for layer 1", () => {
    const d = makeDeduction({ dispute: null });
    const ids = pathIds(d);
    expect(ids[1]).toBe("1:Ready to dispute");
  });

  it("uses 'Never filed' for layer 2 when no dispute", () => {
    const d = makeDeduction({ dispute: null });
    const ids = pathIds(d);
    expect(ids[2]).toBe("2:Never filed");
  });
});

// ---------- highlightedLinkSet ----------

describe("highlightedLinkSet", () => {
  it("returns empty set for empty array", () => {
    expect(highlightedLinkSet([])).toEqual(new Set());
  });

  it("returns link keys in source>>target format", () => {
    const d = makeDeduction();
    const result = highlightedLinkSet([d]);
    const ids = pathIds(d);
    expect(result.has(`${ids[0]}>>${ids[1]}`)).toBe(true);
    expect(result.has(`${ids[1]}>>${ids[2]}`)).toBe(true);
  });

  it("unions links from multiple deductions", () => {
    const d1 = makeDeduction({ deduction_id: "D1", deduction_type: "short_ship" });
    const d2 = makeDeduction({ deduction_id: "D2", deduction_type: "label_fine" });
    const result = highlightedLinkSet([d1, d2]);
    expect(result.size).toBeGreaterThan(2);
  });
});

// ---------- highlightedNodeSet ----------

describe("highlightedNodeSet", () => {
  it("returns empty set for empty array", () => {
    expect(highlightedNodeSet([])).toEqual(new Set());
  });

  it("returns all node ids from pathIds", () => {
    const d = makeDeduction();
    const result = highlightedNodeSet([d]);
    const ids = pathIds(d);
    for (const id of ids) {
      expect(result.has(id)).toBe(true);
    }
  });
});

// ---------- isOperational ----------

describe("isOperational", () => {
  it("returns true for operational types", () => {
    for (const t of ["short_ship", "label_fine", "pallet_fine", "damaged", "late_delivery", "promo_billback", "vague", "spoilage"]) {
      expect(isOperational(makeDeduction({ deduction_type: t }))).toBe(true);
    }
  });

  it("returns false for slotting", () => {
    expect(isOperational(makeDeduction({ deduction_type: "slotting" }))).toBe(false);
  });
});

// ---------- clusterValueFor ----------

describe("clusterValueFor", () => {
  it("returns carrier from shipment", () => {
    const d = makeDeduction();
    expect(clusterValueFor(d, "carrier")).toBe("FedEx");
  });

  it("returns '(no shipment)' when shipment is null", () => {
    const d = makeDeduction({ shipment: null });
    expect(clusterValueFor(d, "carrier")).toBe("(no shipment)");
  });

  it("returns label_type_used from pack_record", () => {
    const d = makeDeduction();
    expect(clusterValueFor(d, "label_type")).toBe("compliant");
  });

  it("returns '(no pack record)' when pack_record is null", () => {
    const d = makeDeduction({ pack_record: null });
    expect(clusterValueFor(d, "label_type")).toBe("(no pack record)");
  });

  it("returns packer_initials", () => {
    const d = makeDeduction();
    expect(clusterValueFor(d, "packer")).toBe("JM");
  });

  it("returns '(unassigned)' for empty packer_initials", () => {
    const d = makeDeduction({
      pack_record: { ...makeDeduction().pack_record!, packer_initials: "" },
    });
    expect(clusterValueFor(d, "packer")).toBe("(unassigned)");
  });

  it("returns empty string for unknown dimension", () => {
    const d = makeDeduction();
    expect(clusterValueFor(d, "nonexistent")).toBe("");
  });
});

// ---------- selectionLabel ----------

describe("selectionLabel", () => {
  it("returns empty string for null selection", () => {
    expect(selectionLabel(null)).toBe("");
  });

  it("formats retailer selection with name", () => {
    const sel: Selection = { kind: "retailer", retailerId: "R1" };
    expect(selectionLabel(sel, "Walmart")).toBe("Retailer = Walmart");
  });

  it("falls back to retailerId when no name given", () => {
    const sel: Selection = { kind: "retailer", retailerId: "R1" };
    expect(selectionLabel(sel)).toBe("Retailer = R1");
  });

  it("formats cluster selection", () => {
    const sel: Selection = { kind: "cluster", dimension: "carrier", value: "FedEx_Ground" };
    expect(selectionLabel(sel)).toBe("Carrier = FedEx Ground");
  });

  it("formats node selection with layer title", () => {
    const sel: Selection = { kind: "node", nodeId: "0:Short ship" };
    expect(selectionLabel(sel)).toBe("Deduction type = Short ship");
  });

  it("formats link selection", () => {
    const sel: Selection = { kind: "link", source: "0:Short ship", target: "1:Ready to dispute" };
    expect(selectionLabel(sel)).toBe("Short ship → Ready to dispute");
  });
});

// ---------- WIN_PROB ----------

describe("WIN_PROB", () => {
  it("has all four evidence quality tiers", () => {
    expect(WIN_PROB.digital_complete).toBe(0.65);
    expect(WIN_PROB.digital_partial).toBe(0.35);
    expect(WIN_PROB.handwritten_only).toBe(0.12);
    expect(WIN_PROB.none).toBe(0.05);
  });
});

// ---------- DEMO_DATE ----------

describe("DEMO_DATE", () => {
  it("is 2026-05-31", () => {
    expect(DEMO_DATE.getUTCFullYear()).toBe(2026);
    expect(DEMO_DATE.getUTCMonth()).toBe(4); // 0-indexed
    expect(DEMO_DATE.getUTCDate()).toBe(31);
  });
});
