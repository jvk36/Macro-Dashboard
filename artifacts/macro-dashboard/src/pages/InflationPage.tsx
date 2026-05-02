import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { TabComingSoon } from "@/components/TabComingSoon";
import { SignalBadge } from "@/components/SignalDot";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";

interface SeriesHistory {
  seriesId: string;
  title: string;
  units: string;
  frequency: string;
  observations: { date: string; value: number }[];
  latestValue: number;
  latestDate: string;
}

interface InflationTabData {
  cpi: SeriesHistory;
  coreInflation: SeriesHistory;
  pce: SeriesHistory;
  corePce: SeriesHistory;
  ppi: SeriesHistory;
  breakevens5y: SeriesHistory;
  breakevens10y: SeriesHistory;
  keyReadings: unknown[];
}

function computeYoY(obs: { date: string; value: number }[]): { date: string; yoy: number }[] {
  const result: { date: string; yoy: number }[] = [];
  for (let i = 12; i < obs.length; i++) {
    const curr = obs[i].value;
    const prev = obs[i - 12].value;
    result.push({ date: obs[i].date, yoy: ((curr - prev) / prev) * 100 });
  }
  return result;
}

export default function InflationPage() {
  const { data, isLoading, error } = useQuery<InflationTabData>({
    queryKey: ["tab-inflation"],
    queryFn: () => apiFetch<InflationTabData>("/api/macro/tab/inflation"),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <TabComingSoon
        title="Inflation"
        description="CPI, PCE, PPI, breakeven rates, and inflation expectations data."
        items={["CPI (Headline & Core)", "PCE (Headline & Core)", "PPI", "5Y/10Y Breakeven Rates", "Fed Target vs Actual"]}
      />
    );
  }

  const cpiYoY = computeYoY(data.cpi.observations).slice(-36);
  const coreCpiYoY = computeYoY(data.coreInflation.observations).slice(-36);
  const pceYoY = computeYoY(data.pce.observations).slice(-36);
  const corePceYoY = computeYoY(data.corePce.observations).slice(-36);

  const cpiLatest = cpiYoY[cpiYoY.length - 1]?.yoy ?? 0;
  const coreCpiLatest = coreCpiYoY[coreCpiYoY.length - 1]?.yoy ?? 0;
  const pceLatest = pceYoY[pceYoY.length - 1]?.yoy ?? 0;
  const corePceLatest = corePceYoY[corePceYoY.length - 1]?.yoy ?? 0;

  const merged = cpiYoY.map((d, i) => ({
    date: d.date,
    cpi: d.yoy,
    coreCpi: coreCpiYoY[i]?.yoy ?? null,
    pce: pceYoY[i]?.yoy ?? null,
    corePce: corePceYoY[i]?.yoy ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Inflation</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Consumer prices, producer prices, and market-based inflation expectations</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "CPI (YoY)", value: cpiLatest },
          { label: "Core CPI (YoY)", value: coreCpiLatest },
          { label: "PCE (YoY)", value: pceLatest },
          { label: "Core PCE (YoY)", value: corePceLatest },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs text-zinc-500 mb-1">{label}</div>
            <div className="text-2xl font-bold font-mono text-zinc-100">{formatNumber(value, 1)}%</div>
            <SignalBadge
              signal={value <= 2 ? "positive" : value <= 3 ? "neutral" : value <= 5 ? "warning" : "negative"}
              label={value <= 2 ? "At/Below Target" : value <= 3 ? "Slightly Above" : value <= 5 ? "Elevated" : "High"}
            />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-1">Inflation Gauges (YoY %)</h3>
        <p className="text-xs text-zinc-500 mb-4">CPI, Core CPI, PCE, Core PCE vs 2% Fed target</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={merged} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
            <ReferenceLine y={2} stroke="#34d399" strokeDasharray="4 4" label={{ value: "2% Target", fill: "#34d399", fontSize: 10, position: "right" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 11 }}
              labelFormatter={formatDate}
              formatter={(v: number) => [`${v.toFixed(2)}%`]}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "#71717a" }} />
            <Line type="monotone" dataKey="cpi" name="CPI" stroke="#f87171" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="coreCpi" name="Core CPI" stroke="#fb923c" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
            <Line type="monotone" dataKey="pce" name="PCE" stroke="#60a5fa" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="corePce" name="Core PCE" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-1">Market-Based Inflation Expectations</h3>
        <p className="text-xs text-zinc-500 mb-4">5-Year and 10-Year Breakeven Inflation Rates</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={data.breakevens5y.observations.slice(-60).map((o, i) => ({
              date: o.date,
              "5Y Breakeven": o.value,
              "10Y Breakeven": data.breakevens10y.observations.slice(-60)[i]?.value ?? null,
            }))}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} interval={11} />
            <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
            <ReferenceLine y={2} stroke="#34d399" strokeDasharray="4 4" />
            <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 11 }} labelFormatter={formatDate} formatter={(v: number) => [`${v.toFixed(2)}%`]} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#71717a" }} />
            <Line type="monotone" dataKey="5Y Breakeven" stroke="#fbbf24" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="10Y Breakeven" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-4">
        Data from FRED (Federal Reserve Bank of St. Louis) · For informational purposes only
      </div>
    </div>
  );
}
