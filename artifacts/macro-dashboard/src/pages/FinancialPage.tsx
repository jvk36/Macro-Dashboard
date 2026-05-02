import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { TabComingSoon } from "@/components/TabComingSoon";
import { SignalBadge } from "@/components/SignalDot";
import { YieldCurveChart } from "@/components/YieldCurveChart";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend,
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

interface YieldCurveData {
  points: Array<{ maturity: string; years: number; yield: number }>;
  spread2s10s: number;
  spread3m10y: number;
  isInverted: boolean;
  signal: "positive" | "neutral" | "negative" | "warning";
  interpretation: string;
  asOf: string;
}

interface FinancialTabData {
  hySpread: SeriesHistory;
  igSpread: SeriesHistory;
  fedFundsRate: SeriesHistory;
  treasury10y: SeriesHistory;
  treasury2y: SeriesHistory;
  yieldCurve: YieldCurveData;
  keyReadings: unknown[];
}

export default function FinancialPage() {
  const { data, isLoading, error } = useQuery<FinancialTabData>({
    queryKey: ["tab-financial"],
    queryFn: () => apiFetch<FinancialTabData>("/api/macro/tab/financial"),
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
        title="Financial Conditions"
        description="Interest rates, credit spreads, yield curve, and financial conditions index."
        items={["Fed Funds Rate & Policy Path", "HY & IG Credit Spreads", "Yield Curve (2s10s, 3m10y)", "Treasury Yields", "Fed Balance Sheet"]}
      />
    );
  }

  const spreadData = data.hySpread.observations.slice(-48).map((o, i) => ({
    date: o.date,
    hy: o.value,
    ig: data.igSpread.observations.slice(-48)[i]?.value ?? null,
  }));

  const rateData = data.treasury10y.observations.slice(-60).map((o, i) => ({
    date: o.date,
    t10y: o.value,
    t2y: data.treasury2y.observations.slice(-60)[i]?.value ?? null,
    ff: data.fedFundsRate.observations.slice(-60)[i]?.value ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Financial Conditions</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Interest rates, credit spreads, and monetary policy indicators</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Fed Funds Rate", value: data.fedFundsRate.latestValue, unit: "%", signal: data.fedFundsRate.latestValue <= 2.5 ? "positive" as const : data.fedFundsRate.latestValue <= 5 ? "neutral" as const : "negative" as const, badge: data.fedFundsRate.latestValue <= 2.5 ? "Accommodative" : data.fedFundsRate.latestValue <= 4 ? "Neutral" : "Restrictive" },
          { label: "10Y Treasury", value: data.treasury10y.latestValue, unit: "%", signal: "neutral" as const, badge: "Benchmark Rate" },
          { label: "HY OAS (bps)", value: data.hySpread.latestValue, unit: " bps", signal: data.hySpread.latestValue <= 350 ? "positive" as const : data.hySpread.latestValue <= 600 ? "neutral" as const : "negative" as const, badge: data.hySpread.latestValue <= 350 ? "Tight" : data.hySpread.latestValue <= 600 ? "Normal" : "Wide" },
          { label: "2s10s Spread", value: data.yieldCurve.spread2s10s, unit: " bps", signal: data.yieldCurve.signal, badge: data.yieldCurve.isInverted ? "Inverted" : "Normal" },
        ].map(({ label, value, unit, signal, badge }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs text-zinc-500 mb-1">{label}</div>
            <div className="text-2xl font-bold font-mono text-zinc-100">{formatNumber(value, 1)}{unit}</div>
            <SignalBadge signal={signal} label={badge} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <YieldCurveChart
          points={data.yieldCurve.points}
          spread2s10s={data.yieldCurve.spread2s10s}
          isInverted={data.yieldCurve.isInverted}
        />

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-1">Interest Rates</h3>
          <p className="text-xs text-zinc-500 mb-3">Fed Funds, 2Y & 10Y Treasury yields</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={rateData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} interval={11} />
              <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 11 }} labelFormatter={formatDate} formatter={(v: number) => [`${v.toFixed(2)}%`]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#71717a" }} />
              <Line type="monotone" dataKey="ff" name="Fed Funds" stroke="#f87171" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="t2y" name="2Y Treasury" stroke="#fbbf24" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
              <Line type="monotone" dataKey="t10y" name="10Y Treasury" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:col-span-2 lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-300 mb-1">Credit Spreads</h3>
          <p className="text-xs text-zinc-500 mb-3">HY and IG Option-Adjusted Spreads (bps) — tighter = risk-on</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={spreadData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="gradHY" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradIG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} interval={11} />
              <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}bps`} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 11 }} labelFormatter={formatDate} formatter={(v: number) => [`${v.toFixed(0)} bps`]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#71717a" }} />
              <Area type="monotone" dataKey="hy" name="HY OAS" stroke="#f87171" strokeWidth={2} fill="url(#gradHY)" dot={false} connectNulls />
              <Area type="monotone" dataKey="ig" name="IG OAS" stroke="#60a5fa" strokeWidth={1.5} fill="url(#gradIG)" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-4">
        Data from FRED (Federal Reserve Bank of St. Louis) · For informational purposes only
      </div>
    </div>
  );
}
