export type DateRangePreset = "6mo" | "1yr" | "custom";

export interface DateRangeValue {
  start: string;
  end: string;
  preset: DateRangePreset;
}

export type DateRange = DateRangeValue | null;

export function addMonthsISO(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const origDay = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(origDay, lastDay));
  return d.toISOString().slice(0, 10);
}

export function dateRangeLabel(r: DateRangeValue): string {
  if (r.preset === "6mo") return "Last 6 months";
  if (r.preset === "1yr") return "Last 1 year";
  return `${r.start} → ${r.end}`;
}

interface Props {
  windowStart: string;
  windowEnd: string;
  value: DateRange;
  onChange: (r: DateRange) => void;
}

export default function TimeRangeSelector({
  windowStart,
  windowEnd,
  value,
  onChange,
}: Props) {
  function applyPreset(preset: DateRangePreset) {
    if (preset === "6mo") {
      onChange({ start: addMonthsISO(windowEnd, -6), end: windowEnd, preset });
    } else if (preset === "1yr") {
      onChange({ start: addMonthsISO(windowEnd, -12), end: windowEnd, preset });
    }
  }

  function clearRange() {
    onChange(null);
  }

  function setCustomStart(start: string) {
    onChange({
      start,
      end: value?.end ?? windowEnd,
      preset: "custom",
    });
  }

  function setCustomEnd(end: string) {
    onChange({
      start: value?.start ?? windowStart,
      end,
      preset: "custom",
    });
  }

  const activePreset = value?.preset ?? null;

  return (
    <div className="time-range">
      <span className="time-range-label">Time range</span>
      <div className="time-range-buttons">
        <button
          className={activePreset === "6mo" ? "active" : ""}
          onClick={() => applyPreset("6mo")}
        >
          Last 6 mo
        </button>
        <button
          className={activePreset === "1yr" ? "active" : ""}
          onClick={() => applyPreset("1yr")}
        >
          Last 1 yr
        </button>
        <button
          className={activePreset === null ? "active" : ""}
          onClick={clearRange}
        >
          All
        </button>
      </div>
      <div className="time-range-custom">
        <input
          type="date"
          aria-label="Custom start date"
          min={windowStart}
          max={windowEnd}
          value={value?.start ?? ""}
          onChange={(e) => e.target.value && setCustomStart(e.target.value)}
        />
        <span className="time-range-arrow">→</span>
        <input
          type="date"
          aria-label="Custom end date"
          min={windowStart}
          max={windowEnd}
          value={value?.end ?? ""}
          onChange={(e) => e.target.value && setCustomEnd(e.target.value)}
        />
      </div>
    </div>
  );
}
