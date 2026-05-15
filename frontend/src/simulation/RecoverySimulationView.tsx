import { useMemo, useState } from "react";
import type { Deduction } from "../types";
import { formatCount, formatDollars, formatPercent } from "../data";
import { isOperational } from "../sankey/domain";
import "./RecoverySimulationView.css";

interface Props {
  cohort: Deduction[];
}

interface SimToggles {
  compliant_labels: boolean;
  digital_pack: boolean;
  systematic_filing: boolean;
  deadline_tracking: boolean;
  edi_asn: boolean;
}

type ToggleKey = keyof SimToggles;

const ALL_OFF: SimToggles = {
  compliant_labels: false,
  digital_pack: false,
  systematic_filing: false,
  deadline_tracking: false,
  edi_asn: false,
};

// Evidence-quality → expected win probability for an on-time, filed
// dispute. Calibrated to the research notes in
// docs (per-retailer dispute outcome ranges, see research/retailers/).
const WIN_PROB: Record<string, number> = {
  digital_complete: 0.65,
  digital_partial: 0.35,
  handwritten_only: 0.12,
  none: 0.05,
};

interface ToggleSpec {
  key: ToggleKey;
  title: string;
  description: string;
}

const TOGGLES: ToggleSpec[] = [
  {
    key: "compliant_labels",
    title: "Retailer-specific compliant labels",
    description:
      "Use the right label per retailer instead of one generic SKU. Eliminates labeling fines and removes the non-scannable-label root cause for short ships.",
  },
  {
    key: "digital_pack",
    title: "Digital pack verification",
    description:
      "Timestamped digital records of every pick, pack, and label. Catches pack/pick mismatches before shipping and upgrades dispute evidence to digital_complete.",
  },
  {
    key: "systematic_filing",
    title: "Systematic dispute filing",
    description:
      "Disputes filed for every eligible deduction — not just when a lean team gets to it. Eliminates the silent write-off.",
  },
  {
    key: "deadline_tracking",
    title: "Deadline tracking",
    description:
      "Every dispute filed inside the retailer's published window. Eliminates the past-deadline auto-loss.",
  },
  {
    key: "edi_asn",
    title: "EDI / ASN compliance",
    description:
      "Correct ASN timing and proper document flow. Removes compliance chargebacks tied to late or missing ASNs.",
  },
];

function isEliminated(d: Deduction, t: SimToggles): boolean {
  if (t.compliant_labels) {
    if (d.deduction_type === "label_fine") return true;
    if (
      d.deduction_type === "short_ship" &&
      d.pack_record?.label_scannable === false
    )
      return true;
  }
  if (t.digital_pack) {
    if (
      d.deduction_type === "short_ship" &&
      d.pack_record?.units_pick_pack_match === false
    )
      return true;
  }
  if (t.edi_asn) {
    if (d.deduction_type === "late_delivery" && d.shipment) {
      if (d.shipment.asn_sent_late || !d.shipment.asn_sent) return true;
    }
  }
  return false;
}

interface SimResult {
  count: number;
  totalDollars: number;
  preventedCount: number;
  preventedDollars: number;
  survivingCount: number;
  survivingDollars: number;
  recovered: number;
  recoveryRate: number;
  netLoss: number;
}

function simulate(cohort: Deduction[], t: SimToggles): SimResult {
  let totalDollars = 0;
  let preventedCount = 0;
  let preventedDollars = 0;
  let survivingCount = 0;
  let survivingDollars = 0;
  let recovered = 0;

  for (const d of cohort) {
    totalDollars += d.amount;
    if (isEliminated(d, t)) {
      preventedCount++;
      preventedDollars += d.amount;
      continue;
    }
    survivingCount++;
    survivingDollars += d.amount;

    // Decide whether anything about this deduction's dispute path
    // actually changes under the active toggles. Untouched disputes
    // keep their actual recovered amount from the data — the model
    // only replaces outcomes the toggles would have moved.
    const wasFiled = !!d.dispute && !!d.dispute.filed_date;
    const filed = t.systematic_filing || wasFiled;
    const wasOnTime = d.dispute?.was_within_deadline !== false;
    const onTime = t.deadline_tracking || wasOnTime;
    const wasEvidence = d.dispute?.evidence_quality;
    const evidenceUpgraded =
      t.digital_pack && wasEvidence !== "digital_complete";
    const filingChanged = filed !== wasFiled;
    const timingChanged = onTime !== wasOnTime;
    const pathChanged = filingChanged || timingChanged || evidenceUpgraded;

    if (!pathChanged) {
      recovered += d.dispute?.recovered_amount ?? 0;
      continue;
    }

    if (!filed || !onTime) continue;

    let evidenceQuality: string;
    if (t.digital_pack) {
      evidenceQuality = "digital_complete";
    } else if (wasEvidence && wasEvidence !== "none") {
      evidenceQuality = wasEvidence;
    } else {
      // Newly filed via systematic_filing without digital_pack — the
      // underlying records are still paper.
      evidenceQuality = "handwritten_only";
    }

    const prob = WIN_PROB[evidenceQuality] ?? 0;
    recovered += d.amount * prob;
  }

  return {
    count: cohort.length,
    totalDollars,
    preventedCount,
    preventedDollars,
    survivingCount,
    survivingDollars,
    recovered,
    recoveryRate: survivingDollars ? recovered / survivingDollars : 0,
    netLoss: survivingDollars - recovered,
  };
}

function savingsVsBaseline(baseline: SimResult, projection: SimResult): number {
  // current loss is the baseline net loss before any prevention;
  // projected loss is what survives minus what's recovered.
  return (
    baseline.totalDollars -
    baseline.recovered -
    (projection.survivingDollars - projection.recovered)
  );
}

function countAffected(cohort: Deduction[], key: ToggleKey): number {
  // Number of deductions whose outcome a single toggle would change
  // versus the baseline (all toggles off).
  let n = 0;
  for (const d of cohort) {
    if (key === "compliant_labels") {
      if (d.deduction_type === "label_fine") n++;
      else if (
        d.deduction_type === "short_ship" &&
        d.pack_record?.label_scannable === false
      )
        n++;
    } else if (key === "digital_pack") {
      if (
        d.deduction_type === "short_ship" &&
        d.pack_record?.units_pick_pack_match === false
      ) {
        n++;
      } else if (
        d.dispute?.filed_date &&
        d.dispute.evidence_quality !== "digital_complete"
      ) {
        n++;
      }
    } else if (key === "systematic_filing") {
      if (!d.dispute || !d.dispute.filed_date) n++;
    } else if (key === "deadline_tracking") {
      if (d.dispute && d.dispute.was_within_deadline === false) n++;
    } else if (key === "edi_asn") {
      if (
        d.deduction_type === "late_delivery" &&
        d.shipment &&
        (d.shipment.asn_sent_late || !d.shipment.asn_sent)
      )
        n++;
    }
  }
  return n;
}

export default function RecoverySimulationView({ cohort }: Props) {
  const [toggles, setToggles] = useState<SimToggles>(ALL_OFF);

  // Recovery simulation models operational fixes against disputable
  // failures. Slotting is a negotiated cost, not a failure — exclude.
  const operationalCohort = useMemo(
    () => cohort.filter(isOperational),
    [cohort]
  );
  const slottingExcluded = cohort.length - operationalCohort.length;

  const baseline = useMemo(
    () => simulate(operationalCohort, ALL_OFF),
    [operationalCohort]
  );
  const projection = useMemo(
    () => simulate(operationalCohort, toggles),
    [operationalCohort, toggles]
  );

  const soloImpacts = useMemo(() => {
    return TOGGLES.map((spec) => {
      const solo = simulate(operationalCohort, { ...ALL_OFF, [spec.key]: true });
      const savings = savingsVsBaseline(baseline, solo);
      const affected = countAffected(operationalCohort, spec.key);
      return { spec, savings, affected };
    });
  }, [operationalCohort, baseline]);

  const anyOn = TOGGLES.some((spec) => toggles[spec.key]);
  const savings = savingsVsBaseline(baseline, projection);
  const baselineRecoveryRate = baseline.totalDollars
    ? baseline.recovered / baseline.totalDollars
    : 0;

  const flip = (key: ToggleKey) =>
    setToggles((t) => ({ ...t, [key]: !t[key] }));
  const reset = () => setToggles(ALL_OFF);
  const enableAll = () => {
    const all = { ...ALL_OFF };
    for (const spec of TOGGLES) all[spec.key] = true;
    setToggles(all);
  };

  if (operationalCohort.length === 0) {
    return (
      <section className="sim">
        <h2>Recovery simulation</h2>
        <p className="section-description">
          Each toggle represents one specific fix — like switching to
          retailer-specific labels, adding digital pack verification, or
          hiring someone to file disputes on time. Turn a toggle on to see
          how the portfolio-wide numbers change: how many deductions would
          have been prevented, how many more disputes would have been won,
          and how much money moves from lost to recovered. Stack multiple
          toggles to see how fixes compound. The goal is to answer "if I
          could only do one thing, what's worth the most?"
        </p>
        <p className="sim-empty">
          {cohort.length === 0
            ? "No deductions in the current cohort."
            : "Current cohort is slotting only — negotiated costs aren't operational failures, so the simulation has nothing to model."}
        </p>
      </section>
    );
  }

  return (
    <section className="sim">
      <header className="sim-header">
        <div>
          <h2>Recovery simulation</h2>
          <p className="section-description">
            Each toggle represents one specific fix — like switching to
            retailer-specific labels, adding digital pack verification, or
            hiring someone to file disputes on time. Turn a toggle on to see
            how the portfolio-wide numbers change: how many deductions would
            have been prevented, how many more disputes would have been won,
            and how much money moves from lost to recovered. Stack multiple
            toggles to see how fixes compound. The goal is to answer "if I
            could only do one thing, what's worth the most?"
          </p>
          <p className="sim-context">
            Toggle the operational and administrative fixes Cinderhaven could
            implement. Numbers update live — current outcomes on the left,
            projected on the right. Runs against the{" "}
            <strong>{formatCount(operationalCohort.length)}</strong> operational
            deductions in the cohort.
            {slottingExcluded > 0 && (
              <>
                {" "}
                <span className="muted">
                  {formatCount(slottingExcluded)} slotting deduction
                  {slottingExcluded === 1 ? "" : "s"} excluded — negotiated
                  costs aren't operational failures.
                </span>
              </>
            )}
          </p>
        </div>
        <div className="sim-actions">
          <button onClick={enableAll}>Enable all</button>
          <button onClick={reset} disabled={!anyOn}>
            Reset
          </button>
        </div>
      </header>

      <div className="sim-toggles">
        {soloImpacts.map(({ spec, savings, affected }) => {
          const on = toggles[spec.key];
          return (
            <label
              key={spec.key}
              className={on ? "sim-toggle on" : "sim-toggle"}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => flip(spec.key)}
              />
              <div className="sim-toggle-body">
                <div className="sim-toggle-title">{spec.title}</div>
                <div className="sim-toggle-desc">{spec.description}</div>
              </div>
              <div className="sim-toggle-impact">
                <div className="sim-toggle-impact-num">
                  {formatCount(affected)}
                </div>
                <div className="sim-toggle-impact-label">deductions</div>
                <div className="sim-toggle-impact-savings">
                  saves <strong>{formatDollars(savings)}</strong>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="sim-compare">
        <div className="sim-compare-row sim-compare-head">
          <div></div>
          <div>Current</div>
          <div>Projected</div>
        </div>
        <div className="sim-compare-row">
          <div className="sim-compare-label">Deductions issued</div>
          <div className="sim-compare-cell">
            <strong>{formatDollars(baseline.totalDollars)}</strong>
            <span className="muted">
              {" "}
              · {formatCount(baseline.count)} records
            </span>
          </div>
          <div className="sim-compare-cell">
            <strong>{formatDollars(projection.survivingDollars)}</strong>
            <span className="muted">
              {" "}
              · {formatCount(projection.survivingCount)} records
            </span>
            {projection.preventedDollars > 0 && (
              <span className="sim-delta sim-delta-pos">
                {" "}
                −{formatDollars(projection.preventedDollars)} prevented
              </span>
            )}
          </div>
        </div>
        <div className="sim-compare-row">
          <div className="sim-compare-label">Recovered via dispute</div>
          <div className="sim-compare-cell">
            <strong>{formatDollars(baseline.recovered)}</strong>
            <span className="muted">
              {" "}
              · {formatPercent(baselineRecoveryRate)}
            </span>
          </div>
          <div className="sim-compare-cell">
            <strong>{formatDollars(projection.recovered)}</strong>
            <span className="muted">
              {" "}
              · {formatPercent(projection.recoveryRate)}
            </span>
          </div>
        </div>
        <div className="sim-compare-row">
          <div className="sim-compare-label">Net loss</div>
          <div className="sim-compare-cell">
            <strong>
              {formatDollars(baseline.totalDollars - baseline.recovered)}
            </strong>
          </div>
          <div className="sim-compare-cell">
            <strong>
              {formatDollars(
                projection.survivingDollars - projection.recovered
              )}
            </strong>
          </div>
        </div>
        <div className="sim-compare-row sim-compare-savings">
          <div className="sim-compare-label">Savings vs today</div>
          <div className="sim-compare-cell">
            <span className="muted">—</span>
          </div>
          <div className="sim-compare-cell">
            <strong className={savings > 0 ? "sim-savings-pos" : ""}>
              {formatDollars(savings)}
            </strong>
            {anyOn && projection.preventedCount > 0 && (
              <span className="muted">
                {" "}
                · {formatCount(projection.preventedCount)} deductions never
                happen
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
