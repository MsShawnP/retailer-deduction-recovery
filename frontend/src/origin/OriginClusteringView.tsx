import { useMemo, useState } from "react";
import type { Deduction } from "../types";
import { formatCount, formatDollars, formatPercent } from "../data";
import { ORIGIN_DIMENSIONS, clusterValueFor } from "../sankey/data";
import "./OriginClusteringView.css";

interface Props {
  cohort: Deduction[];
  activeCluster: { dimension: string; value: string } | null;
  onSelectCluster: (dimension: string | null, value: string | null) => void;
  onTrace: (id: string) => void;
}

interface Cluster {
  dimension: string;
  value: string;
  count: number;
  dollars: number;
  recovered: number;
  recoveryRate: number;
  topType: { type: string; share: number } | null;
  topRetailer: { name: string; share: number } | null;
  topDeductionId: string | null;
}

interface DimensionSummary {
  id: string;
  label: string;
  clusterCount: number;
  topShare: number;
  topName: string;
  totalDollars: number;
}

function clustersFor(
  cohort: Deduction[],
  dimensionId: string
): Cluster[] {
  const acc = new Map<
    string,
    {
      count: number;
      dollars: number;
      recovered: number;
      typeCounts: Map<string, number>;
      retailerCounts: Map<string, number>;
      topDeduction: Deduction | null;
    }
  >();

  for (const d of cohort) {
    const v = clusterValueFor(d, dimensionId);
    let row = acc.get(v);
    if (!row) {
      row = {
        count: 0,
        dollars: 0,
        recovered: 0,
        typeCounts: new Map(),
        retailerCounts: new Map(),
        topDeduction: null,
      };
      acc.set(v, row);
    }
    row.count++;
    row.dollars += d.amount;
    row.recovered += d.dispute?.recovered_amount ?? 0;
    row.typeCounts.set(
      d.deduction_type,
      (row.typeCounts.get(d.deduction_type) ?? 0) + 1
    );
    row.retailerCounts.set(
      d.retailer.name,
      (row.retailerCounts.get(d.retailer.name) ?? 0) + 1
    );
    if (!row.topDeduction || d.amount > row.topDeduction.amount) {
      row.topDeduction = d;
    }
  }

  const out: Cluster[] = [];
  for (const [value, row] of acc) {
    let topType = "";
    let topTypeCount = 0;
    for (const [t, c] of row.typeCounts) {
      if (c > topTypeCount) {
        topTypeCount = c;
        topType = t;
      }
    }
    let topRet = "";
    let topRetCount = 0;
    for (const [r, c] of row.retailerCounts) {
      if (c > topRetCount) {
        topRetCount = c;
        topRet = r;
      }
    }
    out.push({
      dimension: dimensionId,
      value,
      count: row.count,
      dollars: row.dollars,
      recovered: row.recovered,
      recoveryRate: row.dollars ? row.recovered / row.dollars : 0,
      topType: topType
        ? { type: topType, share: row.count ? topTypeCount / row.count : 0 }
        : null,
      topRetailer: topRet
        ? { name: topRet, share: row.count ? topRetCount / row.count : 0 }
        : null,
      topDeductionId: row.topDeduction?.deduction_id ?? null,
    });
  }
  return out.sort((a, b) => b.dollars - a.dollars);
}

export default function OriginClusteringView({
  cohort,
  activeCluster,
  onSelectCluster,
  onTrace,
}: Props) {
  const [activeDimension, setActiveDimension] = useState<string>(
    ORIGIN_DIMENSIONS[0].id
  );

  const summaries: DimensionSummary[] = useMemo(() => {
    return ORIGIN_DIMENSIONS.map((dim) => {
      const clusters = clustersFor(cohort, dim.id);
      const total = clusters.reduce((s, c) => s + c.dollars, 0);
      const top = clusters[0];
      return {
        id: dim.id,
        label: dim.label,
        clusterCount: clusters.length,
        topShare: total && top ? top.dollars / total : 0,
        topName: top?.value ?? "",
        totalDollars: total,
      };
    }).sort((a, b) => b.topShare - a.topShare);
  }, [cohort]);

  const activeClusters = useMemo(
    () => clustersFor(cohort, activeDimension),
    [cohort, activeDimension]
  );

  const activeDimLabel =
    ORIGIN_DIMENSIONS.find((d) => d.id === activeDimension)?.label ??
    activeDimension;

  if (cohort.length === 0) {
    return (
      <section className="origin">
        <h2>Origin clustering</h2>
        <p className="origin-empty">No deductions in the current cohort.</p>
      </section>
    );
  }

  return (
    <section className="origin">
      <header className="origin-header">
        <div>
          <h2>Origin clustering</h2>
          <p className="origin-context">
            Where the deductions come from operationally — by carrier,
            label decision, pack verification system, evidence format, and
            packer. Concentration scores show how much of the cohort flows
            through a single cluster: high concentration means a targeted
            fix, low concentration means a systemic one.
          </p>
        </div>
      </header>

      <div className="origin-summary">
        <header className="origin-section-head">
          <h3>Concentration by dimension</h3>
          <p className="origin-section-desc">
            Sorted by top-cluster share. Pack-verification and label
            choices tend to be one-or-two-bucket dimensions — a fix to
            those resets most of the portfolio.
          </p>
        </header>
        <table className="origin-summary-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Top cluster</th>
              <th className="num">Top share</th>
              <th className="num">Clusters</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr
                key={s.id}
                className={activeDimension === s.id ? "active" : ""}
              >
                <td>
                  <strong>{s.label}</strong>
                </td>
                <td className="origin-top-name">
                  {s.topName.replace(/_/g, " ")}
                </td>
                <td className="num">
                  <div className="origin-share-row">
                    <span className="origin-share-bar">
                      <span
                        className="origin-share-fill"
                        style={{ width: `${Math.min(s.topShare * 100, 100)}%` }}
                      />
                    </span>
                    <span className="origin-share-pct">
                      {formatPercent(s.topShare)}
                    </span>
                  </div>
                </td>
                <td className="num">{formatCount(s.clusterCount)}</td>
                <td>
                  <button
                    className="origin-drill-btn"
                    onClick={() => setActiveDimension(s.id)}
                  >
                    Drill in →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="origin-detail">
        <header className="origin-section-head">
          <h3>{activeDimLabel} — clusters</h3>
          <p className="origin-section-desc">
            Each cluster is one operational origin point. Filter writes a
            cohort selection so the rest of the app scopes to that origin;
            Trace pivots the causation view to the cluster's largest
            deduction.
          </p>
        </header>
        <div className="origin-tabs">
          {ORIGIN_DIMENSIONS.map((d) => (
            <button
              key={d.id}
              className={
                activeDimension === d.id
                  ? "origin-tab active"
                  : "origin-tab"
              }
              onClick={() => setActiveDimension(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <table className="origin-cluster-table">
          <thead>
            <tr>
              <th>Cluster</th>
              <th className="num">Deductions</th>
              <th className="num">Dollars</th>
              <th className="num">Share</th>
              <th>Top type</th>
              <th>Top retailer</th>
              <th className="num">Recovery</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {activeClusters.map((c) => {
              const isActive =
                activeCluster?.dimension === c.dimension &&
                activeCluster.value === c.value;
              const totalDollars = activeClusters.reduce(
                (s, x) => s + x.dollars,
                0
              );
              const share = totalDollars ? c.dollars / totalDollars : 0;
              return (
                <tr key={c.value} className={isActive ? "active" : ""}>
                  <td className="origin-cluster-name">
                    {c.value.replace(/_/g, " ")}
                  </td>
                  <td className="num">{formatCount(c.count)}</td>
                  <td className="num">
                    <strong>{formatDollars(c.dollars)}</strong>
                  </td>
                  <td className="num">
                    <div className="origin-share-row">
                      <span className="origin-share-bar">
                        <span
                          className="origin-share-fill"
                          style={{ width: `${Math.min(share * 100, 100)}%` }}
                        />
                      </span>
                      <span className="origin-share-pct">
                        {formatPercent(share)}
                      </span>
                    </div>
                  </td>
                  <td>
                    {c.topType ? (
                      <>
                        {c.topType.type.replace(/_/g, " ")}{" "}
                        <span className="muted">
                          {formatPercent(c.topType.share)}
                        </span>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {c.topRetailer ? (
                      <>
                        {c.topRetailer.name}{" "}
                        <span className="muted">
                          {formatPercent(c.topRetailer.share)}
                        </span>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num">{formatPercent(c.recoveryRate)}</td>
                  <td>
                    <button
                      className="origin-filter-btn"
                      onClick={() =>
                        onSelectCluster(
                          isActive ? null : c.dimension,
                          isActive ? null : c.value
                        )
                      }
                    >
                      {isActive ? "× Clear" : "Filter →"}
                    </button>
                  </td>
                  <td>
                    {c.topDeductionId && (
                      <button
                        className="origin-trace-btn"
                        onClick={() => onTrace(c.topDeductionId!)}
                      >
                        Trace top →
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
