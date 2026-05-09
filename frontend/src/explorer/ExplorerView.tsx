import { useEffect, useMemo, useState } from "react";
import type { Deduction, Evidence } from "../types";
import { OUTCOME_COLORS, rootCauseFor } from "../sankey/data";
import { formatCount, formatDollars, formatPercent } from "../data";
import "./ExplorerView.css";

interface Props {
  cohort: Deduction[];
  allDeductions: Deduction[];
  onTrace?: (deductionId: string) => void;
  tracedDeductionId?: string | null;
}

const TODAY = new Date("2026-05-31");

export default function ExplorerView({
  cohort,
  allDeductions,
  onTrace,
  tracedDeductionId,
}: Props) {
  const sorted = useMemo(
    () => [...cohort].sort((a, b) => b.amount - a.amount),
    [cohort]
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [sorted]);

  if (sorted.length === 0) {
    return (
      <section className="explorer">
        <h2>Deduction explorer</h2>
        <p className="section-description">
          Pick any deduction from the current view and see it broken into six
          cards, one for each stage of the failure chain. The cards read left
          to right, top to bottom: what the deduction is, whether it's part of
          a pattern, what caused it, how strong the evidence is, how hard it is
          to retrieve that evidence, and whether the dispute was filed in time.
          Use the arrows at the top to step forward or backward through
          deductions sorted by dollar amount, or hit Random to spot-check.
          When you change the Sankey filter or dropdown, the explorer resets
          to the first deduction in the new group.
        </p>
        <p className="explorer-empty">No deductions match the current filter.</p>
      </section>
    );
  }

  const current = sorted[index];
  const total = sorted.length;
  const safeIndex = Math.min(index, total - 1);

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);
  const goRandom = () => setIndex(Math.floor(Math.random() * total));

  return (
    <section className="explorer">
      <header className="explorer-header">
        <div>
          <h2>Deduction explorer</h2>
          <p className="section-description">
            Pick any deduction from the current view and see it broken into six
            cards, one for each stage of the failure chain. The cards read left
            to right, top to bottom: what the deduction is, whether it's part
            of a pattern, what caused it, how strong the evidence is, how hard
            it is to retrieve that evidence, and whether the dispute was filed
            in time. Use the arrows at the top to step forward or backward
            through deductions sorted by dollar amount, or hit Random to
            spot-check. When you change the Sankey filter or dropdown, the
            explorer resets to the first deduction in the new group.
          </p>
          <p className="explorer-context">
            Showing <strong>{safeIndex + 1}</strong> of{" "}
            <strong>{formatCount(total)}</strong> in the current cohort,
            ranked by dollar amount. Use the arrows to step through the
            stack or pick one at random.
          </p>
        </div>
        <div className="explorer-nav">
          <button onClick={goPrev} aria-label="Previous deduction">← Prev</button>
          <button onClick={goRandom}>Random</button>
          <button onClick={goNext} aria-label="Next deduction">Next →</button>
          {onTrace && (
            <button
              onClick={() => onTrace(current.deduction_id)}
              className={
                tracedDeductionId === current.deduction_id
                  ? "explorer-trace-btn active"
                  : "explorer-trace-btn"
              }
              aria-label="Trace this order chronologically"
            >
              Trace this order →
            </button>
          )}
        </div>
      </header>

      <DeductionDetail deduction={current} allDeductions={allDeductions} />
    </section>
  );
}

function DeductionDetail({
  deduction,
  allDeductions,
}: {
  deduction: Deduction;
  allDeductions: Deduction[];
}) {
  const peers = useMemo(
    () =>
      allDeductions.filter(
        (d) =>
          d.deduction_type === deduction.deduction_type &&
          d.retailer.id === deduction.retailer.id
      ),
    [allDeductions, deduction.deduction_type, deduction.retailer.id]
  );

  const peerTotal = peers.reduce((s, d) => s + d.amount, 0);
  const peerSorted = [...peers].sort((a, b) => b.amount - a.amount);
  const peerRank = peerSorted.findIndex((p) => p.deduction_id === deduction.deduction_id) + 1;
  const peerAvg = peers.length ? peerTotal / peers.length : 0;

  return (
    <div className="explorer-grid">
      <ExplorerCard num="1" title="The deduction">
        <KV label="ID">{deduction.deduction_id}</KV>
        <KV label="Retailer">
          {deduction.retailer.name}{" "}
          <span className="muted">
            ({deduction.retailer.channel_type})
          </span>
        </KV>
        <KV label="Type">{deduction.deduction_type.replace(/_/g, " ")}</KV>
        <KV label="Code">
          {deduction.code ? (
            <>
              <strong>{deduction.code.code}</strong> — {deduction.code.name}
            </>
          ) : (
            <span className="muted">no code</span>
          )}
        </KV>
        <KV label="Amount">
          <strong>{formatDollars(deduction.amount)}</strong>
        </KV>
        <KV label="Date">{deduction.deduction_date}</KV>
        {(deduction.is_post_audit || deduction.is_vague) && (
          <div className="explorer-tags">
            {deduction.is_post_audit && <span className="tag">post-audit</span>}
            {deduction.is_vague && <span className="tag">vague</span>}
          </div>
        )}
      </ExplorerCard>

      <ExplorerCard num="2" title="Visibility & pattern">
        <p className="explorer-prose-tight">
          Among <strong>{deduction.deduction_type.replace(/_/g, " ")}</strong>{" "}
          at <strong>{deduction.retailer.name}</strong>:
        </p>
        <KV label="Peer count">{formatCount(peers.length)}</KV>
        <KV label="Peer total">{formatDollars(peerTotal)}</KV>
        <KV label="Rank in peers">
          #{peerRank} of {formatCount(peers.length)}
        </KV>
        <KV label="vs. peer avg">
          {formatDollars(deduction.amount)}{" "}
          <span className="muted">vs. {formatDollars(peerAvg)} avg</span>
        </KV>
        <KV label="Share of peer $">
          {peerTotal ? formatPercent(deduction.amount / peerTotal, 2) : "—"}
        </KV>
      </ExplorerCard>

      <ExplorerCard num="3" title="Root cause">
        <p className="explorer-headline">{rootCauseFor(deduction)}</p>
        <p className="explorer-prose">{rootCauseProse(deduction)}</p>
      </ExplorerCard>

      <ExplorerCard num="4" title="Evidence quality">
        {deduction.dispute ? (
          <>
            <p className="explorer-headline">
              {readableEvidenceQuality(deduction.dispute.evidence_quality)}
            </p>
            <KV label="Pack verification">
              {deduction.pack_record?.pack_verification?.replace(/_/g, " ") ?? "—"}
            </KV>
            <KV label="Submitted">
              {deduction.dispute.submitted_evidence_count} item
              {deduction.dispute.submitted_evidence_count === 1 ? "" : "s"}
            </KV>
            <KV label="Missing">
              {missingEvidence(deduction.dispute.evidence) || (
                <span className="muted">(none)</span>
              )}
            </KV>
          </>
        ) : (
          <>
            <p className="explorer-headline">No dispute filed</p>
            <p className="explorer-prose">
              {deduction.pack_record
                ? `Pack record exists (${deduction.pack_record.evidence_format.replace(/_/g, " ")})`
                : "No pack record on file"} — but no one assembled and filed a dispute.
              {!deduction.dispute_deadline && " No published dispute window means no clock pressure."}
            </p>
          </>
        )}
      </ExplorerCard>

      <ExplorerCard num="5" title="Evidence accessibility">
        {deduction.pack_record ? (
          <>
            <p className="explorer-headline">
              {readableLocation(deduction.pack_record.evidence_location)}
            </p>
            <KV label="Format">
              {deduction.pack_record.evidence_format.replace(/_/g, " ")}
            </KV>
            <KV label="Retrieval cost">
              {deduction.pack_record.evidence_retrieval_minutes != null
                ? `~${deduction.pack_record.evidence_retrieval_minutes} minutes`
                : <span className="muted">—</span>}
            </KV>
            <KV label="Packer">
              {deduction.pack_record.packer_initials || "—"}
            </KV>
          </>
        ) : (
          <p className="muted explorer-prose-tight">
            No pack record (post-audit claims have no original pack chain).
          </p>
        )}
      </ExplorerCard>

      <ExplorerCard num="6" title="Timeliness">
        <p
          className="explorer-headline"
          style={{ color: timelinessColor(deduction) }}
        >
          {timelinessHeadline(deduction)}
        </p>
        <KV label="Deduction date">{deduction.deduction_date}</KV>
        <KV label="Dispute deadline">
          {deduction.dispute_deadline ?? (
            <span className="muted">no published window</span>
          )}
        </KV>
        {deduction.dispute && (
          <KV label="Filed date">
            {deduction.dispute.filed_date ?? (
              <span className="muted">(not filed)</span>
            )}
          </KV>
        )}
        {deduction.dispute && (
          <KV label="Outcome">
            <span
              style={{
                color:
                  OUTCOME_COLORS[readableOutcome(deduction.dispute.outcome)] ??
                  "var(--ink)",
                fontWeight: 700,
              }}
            >
              {readableOutcome(deduction.dispute.outcome)}
            </span>
            {deduction.dispute.recovered_amount > 0 && (
              <span className="muted">
                {" "}
                · {formatDollars(deduction.dispute.recovered_amount)} recovered
              </span>
            )}
          </KV>
        )}
      </ExplorerCard>
    </div>
  );
}

function ExplorerCard({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="explorer-card">
      <div className="explorer-card-header">
        <span className="explorer-card-num">{num}</span>
        <h3>{title}</h3>
      </div>
      <div className="explorer-card-body">{children}</div>
    </div>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="explorer-kv">
      <span className="explorer-k">{label}</span>
      <span className="explorer-v">{children}</span>
    </div>
  );
}

// ---- helpers ----

function rootCauseProse(d: Deduction): string {
  if (d.is_post_audit) {
    const auditor = d.post_audit?.auditor_name || "the retailer";
    const lookback = d.post_audit?.lookback_months;
    return `Retroactive clawback from a post-audit review by ${auditor}${
      lookback ? `, looking back ${lookback} months` : ""
    }. Post-audit claims sidestep the original pack and shipment evidence — they need their own documentation chain.`;
  }
  const cause = rootCauseFor(d);
  switch (cause) {
    case "Non-scannable label":
      return "The shipment used Cinderhaven's generic label, not the retailer-specific compliant label this account requires. Without a scannable barcode, receiving hand-counts cases — a process that systematically undercounts and creates a perceived shortage even when the correct quantity was loaded.";
    case "BOL signed short":
      return "The bill of lading was signed marking a real shortage at the receiving dock. The carrier and the receiver agreed at the moment of delivery that fewer units arrived than were invoiced.";
    case "Pack/pick mismatch":
      return "Pack record shows units packed differed from units picked. A counting error inside the warehouse — not the carrier or the receiver — created the gap.";
    case "Generic label":
      return "Pack record shows label_type_used = generic. The retailer charges back per case for non-compliant labels regardless of whether the shipment was otherwise correct.";
    case "Pallet noncompliance":
      return "Pallet specs (height, footprint, condition) differed from the retailer's published requirements. Common at Costco depots where 30-minute appointment windows leave little room for fix-up at receiving.";
    case "Damage at receiving":
      return "Receiving signed for damaged units on the BOL. The retailer deducts to recoup the unsaleable goods.";
    case "Delivery missed window":
      return "Delivery date fell outside the retailer's requested window. OTIF-style fines apply at retailers with published programs (Walmart 3% of COGS); other retailers charge flat fees.";
    case "Promo program":
      return "MCB / scan-down billback flowing back from a retailer promotion. These are contractually owed but routinely arrive without the matching promo agreement on file, creating disputes by default.";
    case "Opaque remittance":
      return "Vague remittance line — no PO, no specific reason. Investigating decodes some; many remain unmapped to a specific shipment or invoice.";
    case "Temperature abuse in transit":
      return "Cold-chain failure between Cinderhaven's dock and the retailer's. Either the carrier's reefer drifted out of spec or the unit was off during a transfer. Receiving rejects the affected pallets on arrival; defending it requires temperature logs from the trailer and signed-off receiving photos.";
    case "Expired / short-dated at receiving":
      return "Receiving measures days-on-shelf against the retailer's minimum-life threshold (often 60-75% of total shelf life remaining) and rejects what doesn't meet it. Common when production-to-delivery cycle is long or the retailer slows moving the product through.";
    case "Quality complaint at receiving":
      return "Receiving flagged taste, appearance, or formulation concerns at the dock. Often subjective and hard to defend without lot retain samples, QA records, and signed-off photos at receiving.";
    case "Damage in transit":
      return "Pallets arrived intact in count but with damage that affected product condition (crushing, pressure marks, packaging compromise). The shipment's BOL may be signed clean for count even when condition fails inspection.";
    case "Other spoilage":
      return "Product-condition deduction at receiving without a specific sub-cause encoded. Defending these requires the same evidence chain as the named spoilage causes.";
    case "Not disputable — negotiated cost":
      return "Slotting / new-item / planogram-reset / shelf-placement fee. Contractually agreed up front in exchange for shelf space, not assessed as a penalty. Routing it through the failure pipeline would be misleading — it isn't an operational failure or a recoverable loss, it's the negotiated cost of access. Tracked here because it shows up on the same remittances and matters for net margin, but no dispute path applies.";
    default:
      return "";
  }
}

function readableEvidenceQuality(q: string): string {
  return ({
    digital_complete: "Digital, complete",
    digital_partial: "Digital, partial",
    handwritten_only: "Handwritten only",
    none: "No evidence",
  } as Record<string, string>)[q] || q;
}

function readableLocation(l: string | null): string {
  if (!l) return "No verification record";
  return ({
    system: "Digital system",
    warehouse_clipboard: "Warehouse clipboard",
    office_filing_cabinet: "Filing cabinet (office)",
    lost: "Lost",
  } as Record<string, string>)[l] || l;
}

function readableOutcome(o: string): string {
  return ({
    won_full: "Won full",
    won_partial: "Won partial",
    pending: "Pending",
    lost_evidence: "Lost — evidence",
    lost_deadline: "Lost — deadline",
    lost_no_response: "Lost — no response",
    lost_other: "Lost — other",
    abandoned: "Abandoned",
  } as Record<string, string>)[o] || o;
}

function missingEvidence(items: Evidence[]): string {
  return items
    .filter((e) => e.required && !e.submitted)
    .map((e) => e.type.replace(/_/g, " "))
    .join(", ");
}

function timelinessHeadline(d: Deduction): string {
  if (!d.dispute_deadline) {
    return "No published deadline window";
  }
  const deadline = new Date(d.dispute_deadline);

  if (!d.dispute) {
    const days = Math.floor((deadline.getTime() - TODAY.getTime()) / 86_400_000);
    if (days < 0) return `Past deadline ${Math.abs(days)} days ago — never filed`;
    if (days === 0) return "Deadline is today — never filed";
    return `${days} days to deadline — never filed`;
  }

  if (d.dispute.was_within_deadline === false && d.dispute.filed_date) {
    const filed = new Date(d.dispute.filed_date);
    const days = Math.floor((filed.getTime() - deadline.getTime()) / 86_400_000);
    return `Filed ${days} days past deadline`;
  }

  return "Filed within deadline window";
}

function timelinessColor(d: Deduction): string {
  if (!d.dispute_deadline) return "var(--ink-soft)";
  if (!d.dispute) return "var(--accent-red)";
  if (d.dispute.was_within_deadline === false) return "var(--accent-red)";
  return "var(--accent-green)";
}
