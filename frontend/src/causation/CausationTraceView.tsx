import { useMemo } from "react";
import type { Deduction } from "../types";
import { OUTCOME_COLORS, rootCauseFor } from "../sankey/domain";
import { formatCount, formatDollars } from "../data";
import "./CausationTraceView.css";

interface Props {
  tracedDeductionId: string | null;
  cohort: Deduction[];
  onChange: (id: string | null) => void;
}

type Severity = "ok" | "warn" | "fail" | "neutral";

interface TimelineEvent {
  dateLabel: string;
  step: string;
  detail: React.ReactNode;
  severity: Severity;
  flags?: string[];
}

export default function CausationTraceView({
  tracedDeductionId,
  cohort,
  onChange,
}: Props) {
  const sorted = useMemo(
    () => [...cohort].sort((a, b) => b.amount - a.amount),
    [cohort]
  );
  const currentIdx = sorted.findIndex(
    (d) => d.deduction_id === tracedDeductionId
  );
  const current = currentIdx >= 0 ? sorted[currentIdx] : null;

  if (!current) {
    return (
      <section className="trace">
        <h2>Causation trace</h2>
        <p className="section-description">
          Choose an order and see its full timeline from left to right: the
          purchase order, how it was packed, what label was used, how it
          shipped, what the retailer received, what deduction was taken,
          whether a dispute was attempted, and the final outcome. Each step
          shows what actually happened and flags where things went wrong.
          This is different from the explorer — the explorer shows one
          deduction's six failure layers in parallel, while this view shows
          one order's life sequentially.
        </p>
        <p className="trace-context">
          The explorer shows one deduction's six failure layers in parallel;
          the trace shows the same order's story chronologically — what
          happened, in what sequence, and where things broke down.
        </p>
        <div className="trace-empty">
          <p>
            Pick a deduction in the explorer above and use{" "}
            <strong>Trace this order →</strong> to follow it from PO through
            outcome.
          </p>
        </div>
      </section>
    );
  }

  const total = sorted.length;
  const goPrev = () =>
    onChange(sorted[(currentIdx - 1 + total) % total].deduction_id);
  const goNext = () => onChange(sorted[(currentIdx + 1) % total].deduction_id);
  const goRandom = () =>
    onChange(sorted[Math.floor(Math.random() * total)].deduction_id);
  const clear = () => onChange(null);

  const events = buildEvents(current);

  return (
    <section className="trace">
      <header className="trace-header">
        <div>
          <h2>Causation trace</h2>
          <p className="section-description">
            Choose an order and see its full timeline from left to right: the
            purchase order, how it was packed, what label was used, how it
            shipped, what the retailer received, what deduction was taken,
            whether a dispute was attempted, and the final outcome. Each step
            shows what actually happened and flags where things went wrong.
            This is different from the explorer — the explorer shows one
            deduction's six failure layers in parallel, while this view shows
            one order's life sequentially.
          </p>
          <p className="trace-context">
            Following one order chronologically — what happened, in what
            sequence, and where things broke down. Trace{" "}
            <strong>{currentIdx + 1}</strong> of{" "}
            <strong>{formatCount(total)}</strong> in the current cohort.
          </p>
        </div>
        <div className="trace-nav">
          <button onClick={goPrev} aria-label="Previous trace">
            ← Prev
          </button>
          <button onClick={goRandom}>Random</button>
          <button onClick={goNext} aria-label="Next trace">
            Next →
          </button>
          <button
            onClick={clear}
            className="trace-clear"
            aria-label="Clear trace"
            title="Clear trace"
          >
            ×
          </button>
        </div>
      </header>

      <div className="trace-summary">
        <span className="trace-summary-id">{current.deduction_id}</span>
        <span className="trace-sep">·</span>
        <span>{current.retailer.name}</span>
        <span className="trace-sep">·</span>
        <span className="trace-summary-type">
          {current.deduction_type.replace(/_/g, " ")}
        </span>
        <span className="trace-sep">·</span>
        <span className="trace-summary-rc">{rootCauseFor(current)}</span>
        {current.order && (
          <>
            <span className="trace-sep">·</span>
            <span className="trace-summary-po">
              PO {current.order.po_number}
            </span>
          </>
        )}
        <span className="trace-sep">·</span>
        <span className="trace-summary-amt">
          {formatDollars(current.amount)}
        </span>
      </div>

      <ol className="trace-timeline">
        {events.map((evt, i) => (
          <li key={i} className={`trace-event sev-${evt.severity}`}>
            <div className="trace-date">{evt.dateLabel}</div>
            <div className="trace-marker">
              <span className="trace-dot" />
            </div>
            <div className="trace-body">
              <div className="trace-step">{evt.step}</div>
              <div className="trace-detail">{evt.detail}</div>
              {evt.flags && evt.flags.length > 0 && (
                <div className="trace-flags">
                  {evt.flags.map((f) => (
                    <span key={f} className="trace-flag">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---- event builders ----

function buildEvents(d: Deduction): TimelineEvent[] {
  if (d.is_post_audit) return buildPostAuditEvents(d);
  return buildStandardEvents(d);
}

function buildStandardEvents(d: Deduction): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (d.order) {
    events.push({
      dateLabel: d.order.po_date,
      step: "PO placed",
      detail: (
        <>
          <strong>{d.retailer.name}</strong> issued PO{" "}
          <strong>{d.order.po_number}</strong> — {formatCount(d.order.total_units)}{" "}
          units, {formatDollars(d.order.total_value)}.
          {d.order.requested_delivery_window_end && (
            <span className="muted">
              {" "}
              Delivery window closes {d.order.requested_delivery_window_end}.
            </span>
          )}
        </>
      ),
      severity: "neutral",
    });
  }

  if (d.pack_record) {
    const labelGeneric = d.pack_record.label_type_used === "generic";
    const notScannable = d.pack_record.label_scannable === false;
    const pickPackOff = d.pack_record.units_pick_pack_match === false;
    const paperOnly = d.pack_record.evidence_format === "handwritten";
    const lostEvidence = d.pack_record.evidence_location === "lost";
    const packSeverity: Severity =
      notScannable || pickPackOff || lostEvidence
        ? "fail"
        : labelGeneric || paperOnly
        ? "warn"
        : "ok";
    const flags: string[] = [];
    if (labelGeneric) flags.push("generic label");
    if (notScannable) flags.push("non-scannable");
    if (pickPackOff) flags.push("pack/pick mismatch");
    if (paperOnly) flags.push("paper evidence");
    if (lostEvidence) flags.push("evidence lost");

    events.push({
      dateLabel: d.order?.requested_ship_date ?? "—",
      step: "Pack & label",
      detail: (
        <>
          {formatCount(d.pack_record.units_picked)} picked →{" "}
          {formatCount(d.pack_record.units_packed)} packed by{" "}
          {d.pack_record.packer_initials || "—"}. Label:{" "}
          <strong>{d.pack_record.label_type_used}</strong>
          {d.pack_record.label_scannable ? (
            " (scannable)."
          ) : (
            <>
              {" "}
              <span className="bad">(not scannable).</span>
            </>
          )}{" "}
          Verification:{" "}
          {d.pack_record.pack_verification.replace(/_/g, " ")} —{" "}
          {d.pack_record.evidence_format.replace(/_/g, " ")} evidence.
        </>
      ),
      severity: packSeverity,
      flags,
    });
  }

  if (d.shipment) {
    const asnLate = d.shipment.asn_sent_late;
    const asnMissing = !d.shipment.asn_sent;
    const sevShip: Severity = asnMissing
      ? "fail"
      : asnLate
      ? "warn"
      : "ok";
    const shipFlags: string[] = [];
    if (asnMissing) shipFlags.push("ASN missing");
    else if (asnLate) shipFlags.push("ASN late");

    events.push({
      dateLabel: d.shipment.ship_date,
      step: "Shipped",
      detail: (
        <>
          Tendered to <strong>{d.shipment.carrier}</strong> —{" "}
          {formatCount(d.shipment.units_shipped)} units,{" "}
          {formatCount(d.shipment.pallets_shipped)} pallets.{" "}
          {asnMissing ? (
            <span className="bad">No ASN sent.</span>
          ) : asnLate ? (
            <span className="bad">ASN sent late.</span>
          ) : (
            "ASN on time."
          )}
        </>
      ),
      severity: sevShip,
      flags: shipFlags,
    });

    if (d.shipment.delivery_date) {
      const short = d.shipment.bol_signed_short;
      const damaged = d.shipment.bol_signed_damaged;
      const pod = d.shipment.pod_received;
      const lateVsWindow =
        d.order?.requested_delivery_window_end &&
        d.shipment.delivery_date > d.order.requested_delivery_window_end;
      const sevRecv: Severity =
        short || damaged || lateVsWindow ? "fail" : !pod ? "warn" : "ok";
      const recvFlags: string[] = [];
      if (short) recvFlags.push("BOL signed short");
      if (damaged) recvFlags.push("BOL signed damaged");
      if (!pod) recvFlags.push("no POD");
      if (lateVsWindow) recvFlags.push("past delivery window");

      events.push({
        dateLabel: d.shipment.delivery_date,
        step: "Delivered & received",
        detail: (
          <>
            {short && (
              <>
                <span className="bad">BOL signed marking shortage.</span>{" "}
              </>
            )}
            {damaged && (
              <>
                <span className="bad">BOL signed marking damage.</span>{" "}
              </>
            )}
            {!short && !damaged && <>BOL signed clean. </>}
            {pod ? "POD captured." : <span className="bad">No POD on file.</span>}
            {lateVsWindow && (
              <>
                {" "}
                <span className="bad">
                  Delivered past the requested window.
                </span>
              </>
            )}
          </>
        ),
        severity: sevRecv,
        flags: recvFlags,
      });
    }
  }

  // Deduction issued
  const dedFlags: string[] = [];
  if (d.is_vague) dedFlags.push("vague");
  events.push({
    dateLabel: d.deduction_date,
    step: "Deduction issued",
    detail: (
      <>
        <strong>{d.retailer.name}</strong> deducted{" "}
        <strong>{formatDollars(d.amount)}</strong>
        {d.code ? (
          <>
            {" "}
            — code <strong>{d.code.code}</strong> ({d.code.name}).
          </>
        ) : (
          "."
        )}
        {d.remittance_description && (
          <span className="muted"> "{d.remittance_description}"</span>
        )}
      </>
    ),
    severity: "fail",
    flags: dedFlags,
  });

  // Dispute attempt
  if (d.dispute) {
    if (d.dispute.filed_date) {
      const onTime = d.dispute.was_within_deadline;
      const handwritten =
        d.dispute.evidence_quality === "handwritten_only";
      const noEvidence = d.dispute.evidence_quality === "none";
      const sevFile: Severity =
        onTime === false || noEvidence
          ? "fail"
          : handwritten
          ? "warn"
          : onTime === null
          ? "neutral"
          : "ok";
      const fileFlags: string[] = [];
      if (onTime === false) fileFlags.push("past deadline");
      if (handwritten) fileFlags.push("paper-only evidence");
      if (noEvidence) fileFlags.push("no evidence");

      events.push({
        dateLabel: d.dispute.filed_date,
        step: "Dispute filed",
        detail: (
          <>
            Filed via{" "}
            {d.dispute.filing_method?.replace(/_/g, " ") ?? "—"} with{" "}
            <strong>{d.dispute.submitted_evidence_count}</strong> item
            {d.dispute.submitted_evidence_count === 1 ? "" : "s"} (
            {d.dispute.evidence_quality.replace(/_/g, " ")}).{" "}
            ~{d.dispute.labor_hours.toFixed(1)} labor hours.
            {onTime === false && (
              <>
                {" "}
                <span className="bad">Past deadline.</span>
              </>
            )}
          </>
        ),
        severity: sevFile,
        flags: fileFlags,
      });
    } else {
      events.push({
        dateLabel: "(not filed)",
        step: "Dispute opened, never submitted",
        detail: (
          <>
            Dispute record exists in the system but was never filed with{" "}
            {d.retailer.name}.
          </>
        ),
        severity: "fail",
      });
    }

    if (d.dispute.closed_date) {
      const recovered = d.dispute.recovered_amount > 0;
      const outcomeReadable = readableOutcome(d.dispute.outcome);
      events.push({
        dateLabel: d.dispute.closed_date,
        step: "Outcome",
        detail: (
          <>
            <strong
              style={{
                color: OUTCOME_COLORS[outcomeReadable] ?? "var(--ink)",
              }}
            >
              {outcomeReadable}
            </strong>
            .{" "}
            {recovered ? (
              <>
                {formatDollars(d.dispute.recovered_amount)} recovered against{" "}
                {formatDollars(d.amount)} deducted.
              </>
            ) : (
              <>
                Nothing recovered against {formatDollars(d.amount)} deducted.
              </>
            )}
          </>
        ),
        severity: recovered ? "ok" : "fail",
      });
    } else if (d.dispute.outcome === "pending") {
      events.push({
        dateLabel: "(open)",
        step: "Outcome",
        detail: <>Pending — no resolution from {d.retailer.name}.</>,
        severity: "neutral",
      });
    }
  } else {
    events.push({
      dateLabel: "(never filed)",
      step: "No dispute",
      detail: (
        <>
          {d.dispute_deadline ? (
            <>Deadline {d.dispute_deadline} passed without a filing. </>
          ) : (
            <>No published dispute window — no clock pressure, no recovery. </>
          )}
          <strong>{formatDollars(d.amount)}</strong> written off.
        </>
      ),
      severity: "fail",
    });
  }

  return events;
}

function buildPostAuditEvents(d: Deduction): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const pa = d.post_audit;

  if (pa) {
    events.push({
      dateLabel: `${pa.audit_period_start} → ${pa.audit_period_end}`,
      step: "Audit period",
      detail: (
        <>
          {pa.auditor_name ? (
            <>
              <strong>{pa.auditor_name}</strong> reviewed{" "}
            </>
          ) : (
            "Reviewed "
          )}
          {pa.lookback_months} months of transactions for{" "}
          <strong>{d.retailer.name}</strong>. Claim type:{" "}
          {pa.claim_type.replace(/_/g, " ")}.
        </>
      ),
      severity: "warn",
    });
  }

  events.push({
    dateLabel: d.deduction_date,
    step: "Retroactive clawback",
    detail: (
      <>
        Post-audit deduction of <strong>{formatDollars(d.amount)}</strong>
        {d.code ? (
          <>
            {" "}
            — code <strong>{d.code.code}</strong>.
          </>
        ) : (
          "."
        )}{" "}
        <span className="muted">
          No original pack/ship chain to defend against this — post-audit
          claims need their own documentation.
        </span>
      </>
    ),
    severity: "fail",
  });

  if (d.dispute) {
    events.push({
      dateLabel: d.dispute.filed_date ?? "(not filed)",
      step: "Dispute attempt",
      detail: (
        <>
          {d.dispute.filed_date ? "Filed" : "Opened but not filed"} —{" "}
          {d.dispute.evidence_quality.replace(/_/g, " ")},{" "}
          {d.dispute.submitted_evidence_count} item
          {d.dispute.submitted_evidence_count === 1 ? "" : "s"}.
        </>
      ),
      severity: d.dispute.was_within_deadline === false ? "fail" : "warn",
    });

    events.push({
      dateLabel: d.dispute.closed_date ?? "(open)",
      step: "Outcome",
      detail: (
        <>
          {readableOutcome(d.dispute.outcome)}.{" "}
          {d.dispute.recovered_amount > 0 ? (
            <>{formatDollars(d.dispute.recovered_amount)} recovered.</>
          ) : (
            <>Nothing recovered.</>
          )}
        </>
      ),
      severity: d.dispute.recovered_amount > 0 ? "ok" : "fail",
    });
  } else {
    events.push({
      dateLabel: "(never filed)",
      step: "No dispute",
      detail: (
        <>
          Post-audit clawbacks rarely get challenged.{" "}
          <strong>{formatDollars(d.amount)}</strong> written off.
        </>
      ),
      severity: "fail",
    });
  }

  return events;
}

function readableOutcome(o: string): string {
  return (
    ({
      won_full: "Won full",
      won_partial: "Won partial",
      pending: "Pending",
      lost_evidence: "Lost — evidence",
      lost_deadline: "Lost — deadline",
      lost_no_response: "Lost — no response",
      lost_other: "Lost — other",
      abandoned: "Abandoned",
    } as Record<string, string>)[o] || o
  );
}
