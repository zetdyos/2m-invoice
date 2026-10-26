import { useMemo } from "react";

function iso(d) { return d.toISOString().slice(0, 10); }

export function presetRange(key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "this_month": return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "last_month": return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "last_30": { const s = new Date(now); s.setDate(s.getDate() - 29); return { from: iso(s), to: iso(now) }; }
    case "last_90": { const s = new Date(now); s.setDate(s.getDate() - 89); return { from: iso(s), to: iso(now) }; }
    case "this_year": return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
    case "all": default: return { from: "", to: "" };
  }
}

const PRESETS = [
  ["all", "All time"],
  ["this_month", "This month"],
  ["last_month", "Last month"],
  ["last_30", "Last 30 days"],
  ["last_90", "Last 90 days"],
  ["this_year", "This year"],
];

/**
 * Date-range bar: preset buttons + custom from/to inputs.
 * value = { from, to } (ISO strings or "")
 */
export function DateRangeBar({ value, onChange }) {
  const activePreset = useMemo(() => {
    for (const [key] of PRESETS) {
      const r = presetRange(key);
      if (r.from === value.from && r.to === value.to) return key;
    }
    return "custom";
  }, [value]);

  return (
    <div className="daterange">
      <div className="presets">
        {PRESETS.map(([key, label]) => (
          <button key={key} type="button"
            className={`chip ${activePreset === key ? "chip-on" : ""}`}
            onClick={() => onChange(presetRange(key))}>
            {label}
          </button>
        ))}
      </div>
      <div className="custom">
        <input type="date" className="input input-date" value={value.from || ""}
          max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value })} />
        <span className="to">→</span>
        <input type="date" className="input input-date" value={value.to || ""}
          min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value })} />
      </div>
    </div>
  );
}

export function buildQuery(params) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return qs ? `?${qs}` : "";
}
