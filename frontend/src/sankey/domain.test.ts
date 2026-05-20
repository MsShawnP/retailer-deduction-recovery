import { describe, it, expect } from "vitest";
import type { Deduction } from "../types";
import {
  disputeReadinessFor,
  buildSankeyData,
  isOnSelectedPath,
  pathIds,
  evidenceCategoryFor,
  rootCauseFor,
  selectionLabel,
  isOperational,
  DEMO_DATE,
} from "./domain";
import { computeKpis } from "../computeKpis";

function makeDeduction(overrides: Partial<Deduction> = {}): Deduction {
  return {
    deduction_id: "DED-001",
    deduction_type: "short_ship",
    amount: 100,
    deduction_date: "2025-06-15",
    dispute_deadline: "2026-09-15",
    is_post_audit: false,
    remittance_id: null,
    retailer: { id: "R1", name: "Walmart", channel_type: "national" },
    code: null,
    order: null,
    pack_record: {
      label_scannable: true,
      pack_verification: "digital_log",
      evidence_format: "digital",
      units_picked: 100,
      units_packed: 100,
    },
    shipment: null,
    dispute: null,
    post_audit: null,
    ...overrides,
  };
}

// ---- disputeReadinessFor ----

describe("disputeReadinessFor", () => {
  it("returns 'Disputed' when a dispute exists", () => {
    const d = makeDeduction({
      dispute: {
        dispute_id: "DSP-1",
        filed_date: "2025-07-01",
        filing_method: "portal",
        evidence_quality: "strong",
        outcome: "won",
        recovered_amount: 50,
        closed_date: "2025-08-01",
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

  it("returns 'Can't dispute' when deadline is past DEMO_DATE", () => {
    const d = makeDeduction({
      dispute_deadline: "2026-01-01",
      dispute: null,
    });
    expect(disputeReadinessFor(d)).toBe("Can't dispute");
  });

  it("returns 'Can't dispute' when no pack record", () => {
    const d = makeDeduction({ pack_record: null, dispute: null });
    expect(disputeReadinessFor(d)).toBe("Can't dispute");
  });

  it("returns 'Can't dispute' when pack_verification is 'none'", () => {
    const d = makeDeduction({
      dispute: null,
      pack_record: {
        label_scannable: true,
        pack_verification: "none",
        evidence_format: "digital",
        units_picked: 100,
        units_packed: 100,
      },
    });
    expect(disputeReadinessFor(d)).toBe("Can't dispute");
  });

  it("returns 'Ready to dispute' for digital_log verification", () => {
    const d = makeDeduction({ dispute: null });
    expect(disputeReadinessFor(d)).toBe("Ready to dispute");
  });

  it("returns 'Ready to dispute' for scan_verified verification", () => {
    const d = makeDeduction({
      dispute: null,
      pack_record: {
        label_scannable: true,
        pack_verification: "scan_verified",
        evidence_format: "digital",
        units_picked: 100,
        units_packed: 100,
      },
    });
    expect(disputeReadinessFor(d)).toBe("Ready to dispute");
  });

  it("returns 'Needs work' for paper_note verification", () => {
    const d = makeDeduction({
      dispute: null,
      pack_record: {
        label_scannable: true,
        pack_verification: "paper_note",
        evidence_format: "handwritten",
        units_picked: 100,
        units_packed: 100,
      },
    });
    expect(disputeReadinessFor(d)).toBe("Needs work");
  });

  it("prioritizes 'Disputed' over expired deadline", () => {
    const d = makeDeduction({
      dispute_deadline: "2020-01-01",
      dispute: {
        dispute_id: "DSP-1",
        filed_date: "2025-07-01",
        filing_method: "portal",
        evidence_quality: "weak",
        outcome: "lost",
        recovered_amount: 0,
        closed_date: null,
        labor_hours: 1,
        evidence: [],
      },
    });
    expect(disputeReadinessFor(d)).toBe("Disputed");
  });
});

// ---- buildSankeyData ----

describe("buildSankeyData", () => {
  it("returns empty nodes and links for empty input", () => {
    const result = buildSankeyData([]);
    expect(result.nodes).toHaveLength(0);
    expect(result.links).toHaveLength(0);
  });

  it("skips deductions with amount <= 0", () => {
    const result = buildSankeyData([makeDeduction({ amount: 0 })]);
    expect(result.nodes).toHaveLength(0);
    expect(result.links).toHaveLength(0);
  });

  it("creates 3 layers of nodes for a single deduction", () => {
    const d = makeDeduction({ amount: 500 });
    const result = buildSankeyData([d]);

    const layers = new Set(result.nodes.map((n) => n.layer));
    expect(layers).toEqual(new Set([0, 1, 2]));
  });

  it("creates 2 links for a single deduction (type→readiness, readiness→outcome)", () => {
    const d = makeDeduction({ amount: 500 });
    const result = buildSankeyData([d]);
    expect(result.links).toHaveLength(2);
  });

  it("aggregates dollars for same-path deductions", () => {
    const d1 = makeDeduction({ deduction_id: "D1", amount: 100 });
    const d2 = makeDeduction({ deduction_id: "D2", amount: 200 });
    const result = buildSankeyData([d1, d2]);

    // Same type, same readiness, same outcome → links aggregate
    expect(result.links).toHaveLength(2);
    const totalLinkValue = result.links.reduce((s, l) => s + l.value, 0);
    // Each deduction produces 2 links at 300 each = 600 total
    expect(totalLinkValue).toBe(600);
  });

  it("creates separate nodes for different types", () => {
    const d1 = makeDeduction({ deduction_type: "short_ship", amount: 100 });
    const d2 = makeDeduction({ deduction_type: "label_fine", amount: 200 });
    const result = buildSankeyData([d1, d2]);

    const layer0 = result.nodes.filter((n) => n.layer === 0);
    expect(layer0).toHaveLength(2);
    expect(layer0.map((n) => n.label).sort()).toEqual(["Label fine", "Short ship"]);
  });

  it("conserves dollars: layer 0→1 total equals layer 1→2 total", () => {
    const ds = [
      makeDeduction({ deduction_id: "D1", deduction_type: "short_ship", amount: 100 }),
      makeDeduction({ deduction_id: "D2", deduction_type: "label_fine", amount: 200 }),
      makeDeduction({
        deduction_id: "D3",
        deduction_type: "damaged",
        amount: 300,
        dispute: {
          dispute_id: "DSP-1",
          filed_date: "2025-07-01",
          filing_method: "portal",
          evidence_quality: "strong",
          outcome: "won",
          recovered_amount: 150,
          closed_date: "2025-08-01",
          labor_hours: 2,
          evidence: [],
        },
      }),
    ];
    const result = buildSankeyData(ds);

    const layer01 = result.links
      .filter((l) => l.source.startsWith("0:"))
      .reduce((s, l) => s + l.value, 0);
    const layer12 = result.links
      .filter((l) => l.source.startsWith("1:"))
      .reduce((s, l) => s + l.value, 0);
    expect(layer01).toBe(layer12);
  });
});

// ---- isOnSelectedPath ----

describe("isOnSelectedPath", () => {
  it("returns true when selection is null", () => {
    expect(isOnSelectedPath(makeDeduction(), null)).toBe(true);
  });

  it("matches retailer selection by id", () => {
    const d = makeDeduction({ retailer: { id: "R1", name: "Walmart", channel_type: "national" } });
    expect(isOnSelectedPath(d, { kind: "retailer", retailerId: "R1" })).toBe(true);
    expect(isOnSelectedPath(d, { kind: "retailer", retailerId: "R2" })).toBe(false);
  });

  it("excludes slotting from node selections", () => {
    const d = makeDeduction({ deduction_type: "slotting" });
    expect(isOnSelectedPath(d, { kind: "node", nodeId: "0:Slotting" })).toBe(false);
  });

  it("matches node selection on the deduction's path", () => {
    const d = makeDeduction();
    const ids = pathIds(d);
    expect(isOnSelectedPath(d, { kind: "node", nodeId: ids[0] })).toBe(true);
    expect(isOnSelectedPath(d, { kind: "node", nodeId: ids[1] })).toBe(true);
    expect(isOnSelectedPath(d, { kind: "node", nodeId: ids[2] })).toBe(true);
  });

  it("rejects node selection not on the deduction's path", () => {
    const d = makeDeduction({ deduction_type: "short_ship" });
    expect(isOnSelectedPath(d, { kind: "node", nodeId: "0:Label fine" })).toBe(false);
  });

  it("matches link selection on adjacent path segments", () => {
    const d = makeDeduction();
    const ids = pathIds(d);
    expect(
      isOnSelectedPath(d, { kind: "link", source: ids[0], target: ids[1] })
    ).toBe(true);
    expect(
      isOnSelectedPath(d, { kind: "link", source: ids[1], target: ids[2] })
    ).toBe(true);
  });

  it("rejects link selection with wrong target", () => {
    const d = makeDeduction();
    const ids = pathIds(d);
    expect(
      isOnSelectedPath(d, { kind: "link", source: ids[0], target: "1:SomeOther" })
    ).toBe(false);
  });

  it("matches cluster selection", () => {
    const d = makeDeduction({
      shipment: {
        shipment_id: "SH-1",
        ship_date: "2025-06-06",
        delivery_date: "2025-06-08",
        carrier: "FedEx Freight",
        asn_sent: false,
        asn_sent_late: false,
        units_shipped: 100,
        pallets_shipped: 2,
      },
    });
    expect(
      isOnSelectedPath(d, { kind: "cluster", dimension: "carrier", value: "FedEx Freight" })
    ).toBe(true);
    expect(
      isOnSelectedPath(d, { kind: "cluster", dimension: "carrier", value: "UPS" })
    ).toBe(false);
  });
});

// ---- computeKpis ----

describe("computeKpis", () => {
  it("returns zeros for empty input", () => {
    const kpis = computeKpis([]);
    expect(kpis.count).toBe(0);
    expect(kpis.dollar).toBe(0);
    expect(kpis.recovered).toBe(0);
    expect(kpis.disputedCount).toBe(0);
    expect(kpis.noDisputeCount).toBe(0);
    expect(kpis.laborHours).toBe(0);
  });

  it("sums dollars correctly", () => {
    const ds = [
      makeDeduction({ deduction_id: "D1", amount: 100 }),
      makeDeduction({ deduction_id: "D2", amount: 250 }),
    ];
    const kpis = computeKpis(ds);
    expect(kpis.dollar).toBe(350);
    expect(kpis.count).toBe(2);
  });

  it("separates disputed vs undisputed", () => {
    const disputed = makeDeduction({
      deduction_id: "D1",
      amount: 200,
      dispute: {
        dispute_id: "DSP-1",
        filed_date: "2025-07-01",
        filing_method: "portal",
        evidence_quality: "strong",
        outcome: "won",
        recovered_amount: 100,
        closed_date: "2025-08-01",
        labor_hours: 3,
        evidence: [],
      },
    });
    const undisputed = makeDeduction({ deduction_id: "D2", amount: 150 });

    const kpis = computeKpis([disputed, undisputed]);
    expect(kpis.disputedCount).toBe(1);
    expect(kpis.noDisputeCount).toBe(1);
    expect(kpis.noDisputeDollar).toBe(150);
    expect(kpis.recovered).toBe(100);
    expect(kpis.laborHours).toBe(3);
  });

  it("handles zero recovered_amount without NaN", () => {
    const d = makeDeduction({
      dispute: {
        dispute_id: "DSP-1",
        filed_date: "2025-07-01",
        filing_method: "portal",
        evidence_quality: "weak",
        outcome: "lost",
        recovered_amount: 0,
        closed_date: null,
        labor_hours: 0,
        evidence: [],
      },
    });
    const kpis = computeKpis([d]);
    expect(kpis.recovered).toBe(0);
    expect(Number.isNaN(kpis.recovered)).toBe(false);
  });
});

// ---- evidenceCategoryFor ----

describe("evidenceCategoryFor", () => {
  it("maps 'strong' dispute quality to digital", () => {
    const d = makeDeduction({
      dispute: {
        dispute_id: "DSP-1",
        filed_date: "2025-07-01",
        filing_method: "portal",
        evidence_quality: "strong",
        outcome: "won",
        recovered_amount: 50,
        closed_date: null,
        labor_hours: 1,
        evidence: [],
      },
    });
    expect(evidenceCategoryFor(d)).toBe("digital");
  });

  it("maps 'moderate' dispute quality to paper", () => {
    const d = makeDeduction({
      dispute: {
        dispute_id: "DSP-1",
        filed_date: "2025-07-01",
        filing_method: "portal",
        evidence_quality: "moderate",
        outcome: "partial",
        recovered_amount: 25,
        closed_date: null,
        labor_hours: 2,
        evidence: [],
      },
    });
    expect(evidenceCategoryFor(d)).toBe("paper");
  });

  it("maps 'weak' dispute quality to paper", () => {
    const d = makeDeduction({
      dispute: {
        dispute_id: "DSP-1",
        filed_date: "2025-07-01",
        filing_method: "portal",
        evidence_quality: "weak",
        outcome: "lost",
        recovered_amount: 0,
        closed_date: null,
        labor_hours: 1,
        evidence: [],
      },
    });
    expect(evidenceCategoryFor(d)).toBe("paper");
  });

  it("falls back to pack_record evidence_format when no dispute", () => {
    expect(evidenceCategoryFor(makeDeduction())).toBe("digital");

    const paper = makeDeduction({
      pack_record: {
        label_scannable: true,
        pack_verification: "paper_note",
        evidence_format: "handwritten",
        units_picked: 100,
        units_packed: 100,
      },
    });
    expect(evidenceCategoryFor(paper)).toBe("paper");
  });

  it("returns 'missing' when no dispute and no pack record", () => {
    const d = makeDeduction({ pack_record: null });
    expect(evidenceCategoryFor(d)).toBe("missing");
  });

  it("maps photo evidence_format to digital", () => {
    const d = makeDeduction({
      pack_record: {
        label_scannable: true,
        pack_verification: "digital_log",
        evidence_format: "photo",
        units_picked: 100,
        units_packed: 100,
      },
    });
    expect(evidenceCategoryFor(d)).toBe("digital");
  });
});

// ---- rootCauseFor ----

describe("rootCauseFor", () => {
  it("returns 'Post-audit clawback' for post-audit deductions", () => {
    expect(rootCauseFor(makeDeduction({ is_post_audit: true }))).toBe("Post-audit clawback");
  });

  it("returns 'Non-scannable label' for short_ship with non-scannable label", () => {
    const d = makeDeduction({
      pack_record: {
        label_scannable: false,
        pack_verification: "paper_note",
        evidence_format: "handwritten",
        units_picked: 100,
        units_packed: 100,
      },
    });
    expect(rootCauseFor(d)).toBe("Non-scannable label");
  });

  it("returns 'Pricing discrepancy' for pricing_error type", () => {
    expect(rootCauseFor(makeDeduction({ deduction_type: "pricing_error" }))).toBe("Pricing discrepancy");
  });

  it("returns slotting terminal label for slotting type", () => {
    expect(rootCauseFor(makeDeduction({ deduction_type: "slotting" }))).toContain("negotiated cost");
  });
});

// ---- selectionLabel ----

describe("selectionLabel", () => {
  it("returns empty string for null selection", () => {
    expect(selectionLabel(null)).toBe("");
  });

  it("formats retailer selection with name", () => {
    expect(selectionLabel({ kind: "retailer", retailerId: "R1" }, "Walmart")).toBe(
      "Retailer = Walmart"
    );
  });

  it("falls back to retailerId when no name provided", () => {
    expect(selectionLabel({ kind: "retailer", retailerId: "R1" })).toBe("Retailer = R1");
  });

  it("formats node selection with layer title", () => {
    expect(selectionLabel({ kind: "node", nodeId: "0:Short ship" })).toBe(
      "Deduction type = Short ship"
    );
  });

  it("formats link selection with arrow", () => {
    expect(
      selectionLabel({ kind: "link", source: "0:Short ship", target: "1:Ready to dispute" })
    ).toBe("Short ship → Ready to dispute");
  });
});

// ---- isOperational ----

describe("isOperational", () => {
  it("returns true for operational types", () => {
    for (const t of ["short_ship", "label_fine", "damaged", "pricing_error", "spoilage"]) {
      expect(isOperational(makeDeduction({ deduction_type: t }))).toBe(true);
    }
  });

  it("returns false for slotting", () => {
    expect(isOperational(makeDeduction({ deduction_type: "slotting" }))).toBe(false);
  });
});
