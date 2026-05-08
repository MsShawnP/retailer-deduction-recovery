import { useEffect, useMemo, useRef, useState } from "react";
import type { ByRetailer, ByType, Deduction, RetailersById, Summary } from "./types";
import { loadDeductions, loadRetailers, loadSummary, formatDollars, formatPercent, formatCount } from "./data";
import SankeyView from "./sankey/SankeyView";
import ExplorerView from "./explorer/ExplorerView";
import CausationTraceView from "./causation/CausationTraceView";
import RecoverySimulationView from "./simulation/RecoverySimulationView";
import CostToDisputeView from "./cost/CostToDisputeView";
import DisputeBuilderView from "./builder/DisputeBuilderView";
import TimelinePressureView from "./pressure/TimelinePressureView";
import PostAuditRiskView from "./audit/PostAuditRiskView";
import RetailerScorecardView from "./scorecard/RetailerScorecardView";
import { isOnSelectedPath, selectionLabel, TYPE_OPTIONS, type Selection } from "./sankey/data";
import "./App.css";

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [deductions, setDeductions] = useState<Deduction[] | null>(null);
  const [retailers, setRetailers] = useState<RetailersById | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [tracedDeductionId, setTracedDeductionId] = useState<string | null>(null);
  const traceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([loadSummary(), loadDeductions(), loadRetailers()])
      .then(([s, d, r]) => {
        setSummary(s);
        setDeductions(d);
        setRetailers(r);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // Filter deductions and re-aggregate when a Sankey path is selected.
  const filteredDeductions = useMemo(() => {
    if (!deductions || !selection) return deductions;
    return deductions.filter((d) => isOnSelectedPath(d, selection));
  }, [deductions, selection]);

  // If the cohort changes and the traced deduction is no longer in it,
  // clear the trace so the view doesn't show a stale anchor.
  useEffect(() => {
    if (
      tracedDeductionId &&
      filteredDeductions &&
      !filteredDeductions.some((d) => d.deduction_id === tracedDeductionId)
    ) {
      setTracedDeductionId(null);
    }
  }, [filteredDeductions, tracedDeductionId]);

  // Scroll the trace section into view whenever a new trace is set from
  // the explorer.
  useEffect(() => {
    if (tracedDeductionId && traceRef.current) {
      traceRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tracedDeductionId]);

  const byType: ByType[] = useMemo(() => {
    if (!filteredDeductions || !summary) return [];
    if (!selection) return summary.by_type;
    return aggregateByType(filteredDeductions);
  }, [filteredDeductions, selection, summary]);

  const byChannel: ByRetailer[] = useMemo(() => {
    if (!filteredDeductions || !summary) return [];
    if (!selection) return summary.by_retailer;
    return aggregateByRetailer(filteredDeductions);
  }, [filteredDeductions, selection, summary]);

  const byRetailer = byChannel.filter((r) => r.channel_type === "retailer");
  const byDistributor = byChannel.filter((r) => r.channel_type === "distributor");

  // The dropdown reflects layer-0 (Deduction type) selections.
  // Selections in other layers leave the dropdown at "all" but the
  // chip continues to indicate the active filter.
  const dropdownValue = useMemo(() => {
    if (!selection || selection.kind !== "node") return "all";
    const [layerStr, ...rest] = selection.nodeId.split(":");
    if (layerStr !== "0") return "all";
    const label = rest.join(":");
    return TYPE_OPTIONS.includes(label) ? label : "all";
  }, [selection]);

  function onDropdownChange(value: string) {
    if (value === "all") setSelection(null);
    else setSelection({ kind: "node", nodeId: `0:${value}` });
  }

  if (error) return <div className="error">Error loading data: {error}</div>;
  if (!summary || !deductions) return <div className="loading">Loading…</div>;

  const { totals } = summary;

  // KPIs reflect filtered selection when active
  const filteredKpis = selection && filteredDeductions ? computeKpis(filteredDeductions) : null;
  const kpiCount = filteredKpis?.count ?? totals.deductions_count;
  const kpiDollar = filteredKpis?.dollar ?? totals.deductions_dollar;
  const kpiAnnualized = filteredKpis ? (kpiDollar * 12 / summary.window.months) : totals.annualized_dollar;
  const kpiRecovered = filteredKpis?.recovered ?? totals.disputes_recovered;
  const kpiRecoveryRate = kpiDollar ? kpiRecovered / kpiDollar : 0;
  const kpiNoDisputeCount = filteredKpis?.noDisputeCount ?? totals.deductions_no_dispute_count;
  const kpiNoDisputeDollar = filteredKpis?.noDisputeDollar ?? totals.deductions_no_dispute_dollar;
  const kpiLaborHours = filteredKpis?.laborHours ?? totals.labor_hours;
  const kpiFte = kpiLaborHours / 2080;

  return (
    <div className="app">
      <header>
        <h1>Cinderhaven Provisions — Retailer Deductions</h1>
        <p className="subtitle">
          Window {summary.window.start} to {summary.window.end} ({summary.window.months} months)
        </p>
      </header>

      {selection && (
        <div className="selection-chip">
          <span className="selection-label">Filter:</span>
          <span className="selection-value">
            {selectionLabel(
              selection,
              selection.kind === "retailer"
                ? retailers?.[selection.retailerId]?.name
                : undefined
            )}
          </span>
          <span className="selection-count">{formatCount(kpiCount)} deductions • {formatDollars(kpiDollar)}</span>
          <button onClick={() => setSelection(null)} className="selection-clear">×</button>
        </div>
      )}

      <section className="kpi-row">
        <Kpi label="Annualized deductions" value={formatDollars(kpiAnnualized)} sub="against ~$25M wholesale" />
        <Kpi label="Recovery rate" value={formatPercent(kpiRecoveryRate)} sub={`${formatDollars(kpiRecovered)} recovered`} />
        <Kpi label="Labor on disputes" value={`${formatCount(Math.round(kpiLaborHours))} hrs`} sub={`~${kpiFte.toFixed(1)} FTE`} />
        <Kpi label="Undisputed losses" value={formatDollars(kpiNoDisputeDollar)} sub={`${formatCount(kpiNoDisputeCount)} deductions never filed`} negative />
      </section>

      <div className="type-selector">
        <label htmlFor="type-filter">Filter by deduction type:</label>
        <select
          id="type-filter"
          value={dropdownValue}
          onChange={(e) => onDropdownChange(e.target.value)}
        >
          <option value="all">All deductions</option>
          {TYPE_OPTIONS.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <SankeyView deductions={deductions} selection={selection} onSelect={setSelection} />

      <ExplorerView
        cohort={filteredDeductions ?? deductions}
        allDeductions={deductions}
        onTrace={setTracedDeductionId}
        tracedDeductionId={tracedDeductionId}
      />

      <div ref={traceRef}>
        <CausationTraceView
          tracedDeductionId={tracedDeductionId}
          cohort={filteredDeductions ?? deductions}
          onChange={setTracedDeductionId}
        />
      </div>

      <RecoverySimulationView cohort={filteredDeductions ?? deductions} />

      <CostToDisputeView
        cohort={filteredDeductions ?? deductions}
        onTrace={setTracedDeductionId}
      />

      <DisputeBuilderView
        cohort={filteredDeductions ?? deductions}
        retailers={retailers}
        tracedDeductionId={tracedDeductionId}
        onTrace={setTracedDeductionId}
      />

      <TimelinePressureView
        cohort={filteredDeductions ?? deductions}
        onTrace={setTracedDeductionId}
      />

      <PostAuditRiskView
        cohort={filteredDeductions ?? deductions}
        onTrace={setTracedDeductionId}
      />

      <RetailerScorecardView
        cohort={
          selection?.kind === "retailer"
            ? deductions
            : filteredDeductions ?? deductions
        }
        retailers={retailers}
        activeRetailerId={
          selection?.kind === "retailer" ? selection.retailerId : null
        }
        onSelectRetailer={(id) =>
          setSelection(id ? { kind: "retailer", retailerId: id } : null)
        }
      />

      <section className="break">
        <h2>By deduction type{selection && <span className="filtered-tag">filtered</span>}</h2>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th className="num">Count</th>
              <th className="num">% Count</th>
              <th className="num">Dollars</th>
              <th className="num">% Dollars</th>
            </tr>
          </thead>
          <tbody>
            {byType.map((t) => (
              <tr key={t.deduction_type}>
                <td>{t.deduction_type.replace(/_/g, " ")}</td>
                <td className="num">{formatCount(t.count)}</td>
                <td className="num">{formatPercent(t.pct_count)}</td>
                <td className="num">{formatDollars(t.dollar)}</td>
                <td className="num">{formatPercent(t.pct_dollars)}</td>
              </tr>
            ))}
            {byType.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">No deductions match this selection.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="break">
        <h2>By retailer{selection && <span className="filtered-tag">filtered</span>}</h2>
        <table>
          <thead>
            <tr>
              <th>Retailer</th>
              <th className="num">Deductions</th>
              <th className="num">Dollars</th>
              <th className="num">Recovered</th>
              <th className="num">Recovery rate</th>
            </tr>
          </thead>
          <tbody>
            {byRetailer.map((r) => (
              <tr key={r.retailer_id}>
                <td>{r.name}</td>
                <td className="num">{formatCount(r.deductions)}</td>
                <td className="num">{formatDollars(r.dollar)}</td>
                <td className="num">{formatDollars(r.recovered)}</td>
                <td className="num">{formatPercent(r.recovery_rate)}</td>
              </tr>
            ))}
            {byRetailer.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">No retailer deductions match this selection.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="break">
        <h2>By distributor{selection && <span className="filtered-tag">filtered</span>}</h2>
        <table>
          <thead>
            <tr>
              <th>Distributor</th>
              <th className="num">Deductions</th>
              <th className="num">Dollars</th>
              <th className="num">Recovered</th>
              <th className="num">Recovery rate</th>
            </tr>
          </thead>
          <tbody>
            {byDistributor.map((r) => (
              <tr key={r.retailer_id}>
                <td>{r.name}</td>
                <td className="num">{formatCount(r.deductions)}</td>
                <td className="num">{formatDollars(r.dollar)}</td>
                <td className="num">{formatDollars(r.recovered)}</td>
                <td className="num">{formatPercent(r.recovery_rate)}</td>
              </tr>
            ))}
            {byDistributor.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">No distributor deductions match this selection.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, negative }: { label: string; value: string; sub: string; negative?: boolean }) {
  return (
    <div className={negative ? "kpi kpi-neg" : "kpi"}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function computeKpis(ds: Deduction[]) {
  let dollar = 0;
  let recovered = 0;
  let noDisputeCount = 0;
  let noDisputeDollar = 0;
  let laborHours = 0;
  for (const d of ds) {
    dollar += d.amount;
    if (d.dispute) {
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
    noDisputeCount,
    noDisputeDollar,
    laborHours,
  };
}

function aggregateByType(ds: Deduction[]): ByType[] {
  const totalCount = ds.length;
  const totalDollars = ds.reduce((s, d) => s + d.amount, 0);
  const acc: Record<string, { count: number; dollar: number }> = {};
  for (const d of ds) {
    const k = d.deduction_type;
    acc[k] = acc[k] || { count: 0, dollar: 0 };
    acc[k].count += 1;
    acc[k].dollar += d.amount;
  }
  return Object.entries(acc)
    .map(([k, v]) => ({
      deduction_type: k,
      count: v.count,
      dollar: v.dollar,
      pct_count: totalCount ? v.count / totalCount : 0,
      pct_dollars: totalDollars ? v.dollar / totalDollars : 0,
    }))
    .sort((a, b) => b.dollar - a.dollar);
}

function aggregateByRetailer(ds: Deduction[]): ByRetailer[] {
  const acc: Record<string, { name: string; channel_type: string; deductions: number; dollar: number; recovered: number }> = {};
  for (const d of ds) {
    const id = d.retailer.id ?? d.retailer.name.toLowerCase();
    acc[id] = acc[id] || {
      name: d.retailer.name,
      channel_type: d.retailer.channel_type,
      deductions: 0,
      dollar: 0,
      recovered: 0,
    };
    acc[id].deductions += 1;
    acc[id].dollar += d.amount;
    acc[id].recovered += d.dispute?.recovered_amount || 0;
  }
  return Object.entries(acc)
    .map(([retailer_id, v]) => ({
      retailer_id,
      name: v.name,
      channel_type: v.channel_type,
      deductions: v.deductions,
      dollar: v.dollar,
      recovered: v.recovered,
      recovery_rate: v.dollar ? v.recovered / v.dollar : 0,
    }))
    .sort((a, b) => b.dollar - a.dollar);
}
