import { useMemo, useState } from "react";
import type { Deduction } from "../types";
import { disputeReadinessFor, TYPE_LABELS } from "../sankey/data";
import { formatDollars } from "../data";
import "./CohortTableView.css";

interface Props {
  cohort: Deduction[];
  onSelectDeduction: (id: string) => void;
  activeDeductionId?: string | null;
}

type SortKey =
  | "deduction_id"
  | "date"
  | "retailer"
  | "type"
  | "amount"
  | "readiness"
  | "outcome"
  | "retrieval_hours";

interface SortState {
  key: SortKey;
  desc: boolean;
}

const PAGE_SIZE = 25;

function retrievalHours(d: Deduction): number | null {
  const mins = d.pack_record?.evidence_retrieval_minutes;
  if (mins == null) return null;
  return mins / 60;
}

function outcomeLabel(d: Deduction): string {
  if (!d.dispute) return "Never filed";
  const labels: Record<string, string> = {
    won_full: "Won full",
    won_partial: "Won partial",
    pending: "Pending",
    lost_evidence: "Lost — evidence",
    lost_deadline: "Lost — deadline",
    lost_no_response: "Lost — no response",
    lost_other: "Lost — other",
    abandoned: "Abandoned",
  };
  return labels[d.dispute.outcome] || d.dispute.outcome;
}

function getSortValue(d: Deduction, key: SortKey): string | number {
  switch (key) {
    case "deduction_id": return d.deduction_id;
    case "date": return d.deduction_date;
    case "retailer": return d.retailer.name;
    case "type": return TYPE_LABELS[d.deduction_type] || d.deduction_type;
    case "amount": return d.amount;
    case "readiness": return disputeReadinessFor(d);
    case "outcome": return outcomeLabel(d);
    case "retrieval_hours": return retrievalHours(d) ?? -1;
  }
}

export default function CohortTableView({ cohort, onSelectDeduction, activeDeductionId }: Props) {
  const [sort, setSort] = useState<SortState>({ key: "amount", desc: true });
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const arr = [...cohort];
    arr.sort((a, b) => {
      const av = getSortValue(a, sort.key);
      const bv = getSortValue(b, sort.key);
      if (av < bv) return sort.desc ? 1 : -1;
      if (av > bv) return sort.desc ? -1 : 1;
      return 0;
    });
    return arr;
  }, [cohort, sort]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, desc: !prev.desc } : { key, desc: true }
    );
    setPage(0);
  }

  function sortIndicator(key: SortKey) {
    if (sort.key !== key) return null;
    return sort.desc ? " ↓" : " ↑";
  }

  if (cohort.length === 0) return null;

  return (
    <section className="cohort-table-section">
      <h2>Cohort detail</h2>
      <p className="section-description">
        {sorted.length} deductions in the current view. Click any row to
        inspect it in the explorer below. Click a column header to sort.
      </p>

      <div className="cohort-table-wrap">
        <table className="cohort-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("deduction_id")}>
                ID{sortIndicator("deduction_id")}
              </th>
              <th onClick={() => toggleSort("date")}>
                Date{sortIndicator("date")}
              </th>
              <th onClick={() => toggleSort("retailer")}>
                Retailer{sortIndicator("retailer")}
              </th>
              <th onClick={() => toggleSort("type")}>
                Type{sortIndicator("type")}
              </th>
              <th className="num" onClick={() => toggleSort("amount")}>
                Amount{sortIndicator("amount")}
              </th>
              <th onClick={() => toggleSort("readiness")}>
                Readiness{sortIndicator("readiness")}
              </th>
              <th onClick={() => toggleSort("outcome")}>
                Outcome{sortIndicator("outcome")}
              </th>
              <th className="num" onClick={() => toggleSort("retrieval_hours")}>
                Retrieval hrs{sortIndicator("retrieval_hours")}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((d) => (
              <tr
                key={d.deduction_id}
                onClick={() => onSelectDeduction(d.deduction_id)}
                className={d.deduction_id === activeDeductionId ? "active-row" : ""}
              >
                <td className="mono">{d.deduction_id.slice(0, 8)}</td>
                <td>{d.deduction_date}</td>
                <td>{d.retailer.name}</td>
                <td>{TYPE_LABELS[d.deduction_type] || d.deduction_type}</td>
                <td className="num">{formatDollars(d.amount)}</td>
                <td>{disputeReadinessFor(d)}</td>
                <td>{outcomeLabel(d)}</td>
                <td className="num">
                  {retrievalHours(d) != null
                    ? retrievalHours(d)!.toFixed(1)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="cohort-table-pagination">
          <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            ← Prev
          </button>
          <span>
            Page {safePage + 1} of {totalPages}
          </span>
          <button disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
