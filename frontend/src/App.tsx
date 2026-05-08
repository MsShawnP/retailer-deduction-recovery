import { useEffect, useState } from "react";
import type { Deduction, Summary } from "./types";
import { loadDeductions, loadSummary, formatDollars, formatPercent, formatCount } from "./data";
import SankeyView from "./sankey/SankeyView";
import "./App.css";

export default function App() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [deductions, setDeductions] = useState<Deduction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadSummary(), loadDeductions()])
      .then(([s, d]) => {
        setSummary(s);
        setDeductions(d);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="error">Error loading data: {error}</div>;
  if (!summary || !deductions) return <div className="loading">Loading…</div>;

  const { totals, by_type, by_retailer } = summary;

  return (
    <div className="app">
      <header>
        <h1>Cinderhaven Provisions — Retailer Deductions</h1>
        <p className="subtitle">
          Window {summary.window.start} to {summary.window.end} ({summary.window.months} months)
        </p>
      </header>

      <section className="kpi-row">
        <Kpi label="Annualized deductions" value={formatDollars(totals.annualized_dollar)} sub="against ~$25M wholesale" />
        <Kpi label="Recovery rate" value={formatPercent(totals.recovery_rate)} sub={`${formatDollars(totals.disputes_recovered)} recovered`} />
        <Kpi label="Labor on disputes" value={`${formatCount(totals.labor_hours)} hrs`} sub={`~${totals.fte_equivalent.toFixed(1)} FTE`} />
        <Kpi label="Undisputed losses" value={formatDollars(totals.deductions_no_dispute_dollar)} sub={`${formatCount(totals.deductions_no_dispute_count)} deductions never filed`} />
      </section>

      <SankeyView deductions={deductions} />

      <section className="break">
        <h2>By deduction type</h2>
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
            {by_type.map((t) => (
              <tr key={t.deduction_type}>
                <td>{t.deduction_type.replace(/_/g, " ")}</td>
                <td className="num">{formatCount(t.count)}</td>
                <td className="num">{formatPercent(t.pct_count)}</td>
                <td className="num">{formatDollars(t.dollar)}</td>
                <td className="num">{formatPercent(t.pct_dollars)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="break">
        <h2>By retailer</h2>
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
            {by_retailer.map((r) => (
              <tr key={r.retailer_id}>
                <td>{r.name}</td>
                <td className="num">{formatCount(r.deductions)}</td>
                <td className="num">{formatDollars(r.dollar)}</td>
                <td className="num">{formatDollars(r.recovered)}</td>
                <td className="num">{formatPercent(r.recovery_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}
