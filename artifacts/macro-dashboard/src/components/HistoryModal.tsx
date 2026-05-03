import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useHistoryModal } from "@/context/HistoryModalContext";

interface SeriesHistory {
  seriesId: string;
  title: string;
  units: string;
  frequency: string;
  observations: { date: string; value: number }[];
  latestValue: number;
  latestDate: string;
}

const RANGES = [
  { label: "1Y", years: 1 },
  { label: "3Y", years: 3 },
  { label: "5Y", years: 5 },
  { label: "10Y", years: 10 },
  { label: "All", years: 0 },
];

function filterByRange(obs: { date: string; value: number }[], years: number) {
  if (years === 0) return obs;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return obs.filter((o) => o.date >= cutoffStr);
}

function formatXTick(dateStr: string, years: number) {
  const d = new Date(dateStr + "T12:00:00");
  if (years === 1) return d.toLocaleDateString("en-US", { month: "short" });
  if (years <= 5) return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return String(d.getFullYear());
}

function formatTooltipDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getYDomain(data: { value: number }[]): [number | "auto", number | "auto"] {
  if (!data.length) return ["auto", "auto"];
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = (max - min) * 0.1 || Math.abs(max) * 0.05 || 0.5;
  return [min - pad, max + pad];
}

function SparkTrend({ data }: { data: { value: number }[] }) {
  if (data.length < 2) return null;
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const change = last - first;
  const pct = first !== 0 ? (change / Math.abs(first)) * 100 : 0;
  const up = change > 0;
  const flat = Math.abs(pct) < 0.5;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${flat ? "text-zinc-400" : up ? "text-emerald-400" : "text-red-400"}`}>
      {flat ? <Minus className="h-3 w-3" /> : up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {flat ? "Flat" : `${up ? "+" : ""}${pct.toFixed(1)}%`}
    </span>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-4 w-2/3 rounded bg-zinc-800" />
      <div className="h-3 w-1/3 rounded bg-zinc-800" />
      <div className="h-[280px] rounded-lg bg-zinc-800 mt-2" />
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  units: string;
}

function CustomTooltip({ active, payload, label, units }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <div className="text-[10px] text-zinc-500 mb-0.5">{formatTooltipDate(label)}</div>
      <div className="text-sm font-bold text-zinc-100 tabular-nums">
        {typeof payload[0].value === "number" ? payload[0].value.toFixed(3).replace(/\.?0+$/, "") : "—"}
        {units.length < 20 && <span className="text-xs font-normal text-zinc-400 ml-1">{units}</span>}
      </div>
    </div>
  );
}

export function HistoryModal() {
  const { state, close } = useHistoryModal();
  const [range, setRange] = useState(2);

  const { data, isLoading, error } = useQuery<SeriesHistory>({
    queryKey: ["series-history", state?.seriesId],
    queryFn: () => apiFetch<SeriesHistory>(`/api/macro/series/${state!.seriesId}?limit=480`),
    enabled: !!state?.seriesId,
    staleTime: 5 * 60 * 1000,
  });

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") close(); },
    [close],
  );

  useEffect(() => {
    if (!state) return;
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [state, handleKey]);

  if (!state) return null;

  const selectedYears = RANGES[range].years;
  const filtered = data ? filterByRange(data.observations, selectedYears) : [];
  const yDomain = getYDomain(filtered);

  const tickCount = selectedYears === 1 ? 6 : selectedYears <= 3 ? 8 : selectedYears <= 5 ? 6 : 8;
  const tickInterval = filtered.length > tickCount ? Math.floor(filtered.length / tickCount) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-10 px-4 pb-10 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
          <div className="pr-8">
            {isLoading || !data ? (
              <div className="h-5 w-48 rounded bg-zinc-800 animate-pulse" />
            ) : (
              <>
                <h2 className="text-base font-semibold text-zinc-100 leading-tight">{data.title}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{data.units} · {data.frequency}</p>
              </>
            )}
          </div>
          <button
            onClick={close}
            className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats row */}
        {data && (
          <div className="flex items-center gap-5 px-5 py-3 border-b border-zinc-800/60">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Latest</div>
              <div className="text-xl font-bold tabular-nums text-emerald-400">
                {data.latestValue.toFixed(4).replace(/\.?0+$/, "")}
                {data.units.length < 10 && <span className="text-sm font-normal text-zinc-400 ml-1">{data.units}</span>}
              </div>
              <div className="text-[10px] text-zinc-600 mt-0.5">
                {new Date(data.latestDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
            {filtered.length > 1 && (
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
                  {RANGES[range].years === 0 ? "All time" : `${RANGES[range].label} change`}
                </div>
                <SparkTrend data={filtered} />
              </div>
            )}
            <div className="ml-auto text-[10px] text-zinc-600">{filtered.length} observations</div>
          </div>
        )}

        {/* Range buttons */}
        <div className="flex items-center gap-1 px-5 py-3">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRange(i)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                range === i
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="px-2 pb-5">
          {isLoading ? (
            <div className="px-4"><ChartSkeleton /></div>
          ) : error || !data ? (
            <div className="flex items-center justify-center h-[280px] text-sm text-zinc-500">
              Failed to load historical data
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-sm text-zinc-500">
              No data for this range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={filtered} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.5)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "#3f3f46" }}
                  interval={tickInterval}
                  tickFormatter={(v) => formatXTick(v, selectedYears)}
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v) => {
                    if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`;
                    return Number(v.toFixed(2)).toString();
                  }}
                />
                <Tooltip content={<CustomTooltip units={data.units} />} />
                {data.observations.some((o) => o.value > 0) && data.observations.some((o) => o.value < 0) && (
                  <ReferenceLine y={0} stroke="#52525b" strokeDasharray="4 2" />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#34d399"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, fill: "#34d399", stroke: "#059669", strokeWidth: 1.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800/60 flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">
            Source: FRED (Federal Reserve Bank of St. Louis) · Series: {state.seriesId}
          </span>
          <span className="text-[10px] text-zinc-600">For informational purposes only</span>
        </div>
      </div>
    </div>
  );
}
