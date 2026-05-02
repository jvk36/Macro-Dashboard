import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { TabComingSoon } from "@/components/TabComingSoon";
import { SignalBadge } from "@/components/SignalDot";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
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

interface LaborTabData {
  nfp: SeriesHistory;
  unemploymentRate: SeriesHistory;
  participationRate: SeriesHistory;
  averageHourlyEarnings: SeriesHistory;
  joblessClaimsInitial: SeriesHistory;
  jolts: SeriesHistory;
  keyReadings: unknown[];
}

export default function LaborPage() {
  const { data, isLoading, error } = useQuery<LaborTabData>({
    queryKey: ["tab-labor"],
    queryFn: () => apiFetch<LaborTabData>("/api/macro/tab/labor"),
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
        title="Labor Market"
        description="Non-farm payrolls, unemployment, jobless claims, wage growth, and participation rate data."
        items={["Non-Farm Payrolls (MoM)", "Unemployment Rate (U-3 & U-6)", "Participation Rate", "Average Hourly Earnings", "Initial Jobless Claims", "JOLTS Job Openings"]}
      />
    );
  }

  const nfpChanges = data.nfp.observations.slice(1).map((o, i) => ({
    date: o.date,
    change: o.value - data.nfp.observations[i].value,
  })).slice(-24);

  const aweYoY = data.averageHourlyEarnings.observations.slice(12).map((o, i) => ({
    date: o.date,
    yoy: ((o.value - data.averageHourlyEarnings.observations[i].value) / data.averageHourlyEarnings.observations[i].value) * 100,
  })).slice(-36);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Labor Market</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Employment, wages, and workforce participation indicators</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Unemployment Rate", value: data.unemploymentRate.latestValue, unit: "%", signal: data.unemploymentRate.latestValue <= 4.5 ? "positive" as const : data.unemploymentRate.latestValue <= 6 ? "neutral" as const : "negative" as const, badge: data.unemploymentRate.latestValue <= 4 ? "Full Employment" : data.unemploymentRate.latestValue <= 5 ? "Near Full" : "Elevated" },
          { label: "Participation Rate", value: data.participationRate.latestValue, unit: "%", signal: data.participationRate.latestValue >= 63 ? "positive" as const : data.participationRate.latestValue >= 61 ? "neutral" as const : "negative" as const, badge: data.participationRate.latestValue >= 63 ? "Healthy" : "Below Trend" },
          { label: "Avg Hourly Earnings YoY", value: aweYoY[aweYoY.length - 1]?.yoy ?? 0, unit: "%", signal: "neutral" as const, badge: "Wage Growth" },
          { label: "Initial Claims (K)", value: Math.round(data.joblessClaimsInitial.latestValue / 1000), unit: "K", signal: data.joblessClaimsInitial.latestValue <= 220000 ? "positive" as const : data.joblessClaimsInitial.latestValue <= 280000 ? "neutral" as const : "negative" as const, badge: data.joblessClaimsInitial.latestValue <= 220000 ? "Low" : data.joblessClaimsInitial.latestValue <= 280000 ? "Normal" : "Elevated" },
        ].map(({ label, value, unit, signal, badge }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs text-zinc-500 mb-1">{label}</div>
            <div className="text-2xl font-bold font-mono text-zinc-100">{formatNumber(value, 1)}{unit}</div>
            <SignalBadge signal={signal} label={badge} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-1">NFP Monthly Change (000s)</h3>
          <p className="text-xs text-zinc-500 mb-3">~150K needed to absorb new labor force entrants</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={nfpChanges} margin={{ top: 2, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} interval={5} />
              <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
              <ReferenceLine y={150000} stroke="#fbbf24" strokeDasharray="4 4" />
              <ReferenceLine y={0} stroke="#52525b" />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 11 }} labelFormatter={formatDate} formatter={(v: number) => [`${(v/1000).toFixed(0)}K`, "Jobs Added"]} />
              <Bar dataKey="change" fill="#34d399" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-1">Unemployment Rate</h3>
          <p className="text-xs text-zinc-500 mb-3">Civilian unemployment rate (%)</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.unemploymentRate.observations.slice(-48)} margin={{ top: 2, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="gradUnrate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} interval={11} />
              <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 11 }} labelFormatter={formatDate} formatter={(v: number) => [`${v.toFixed(1)}%`, "Unemployment"]} />
              <Area type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} fill="url(#gradUnrate)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-1">Wage Growth (YoY)</h3>
          <p className="text-xs text-zinc-500 mb-3">Average hourly earnings year-over-year change</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={aweYoY} margin={{ top: 2, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} interval={8} />
              <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
              <ReferenceLine y={3.5} stroke="#34d399" strokeDasharray="4 4" />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 11 }} labelFormatter={formatDate} formatter={(v: number) => [`${v.toFixed(2)}%`, "Wage Growth"]} />
              <Line type="monotone" dataKey="yoy" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-1">Initial Jobless Claims</h3>
          <p className="text-xs text-zinc-500 mb-3">Weekly initial unemployment insurance filings</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.joblessClaimsInitial.observations.slice(-52)} margin={{ top: 2, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="gradClaims" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} interval={12} />
              <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 11 }} labelFormatter={formatDate} formatter={(v: number) => [`${(v/1000).toFixed(0)}K`, "Claims"]} />
              <Area type="monotone" dataKey="value" stroke="#fb923c" strokeWidth={2} fill="url(#gradClaims)" dot={false} />
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
