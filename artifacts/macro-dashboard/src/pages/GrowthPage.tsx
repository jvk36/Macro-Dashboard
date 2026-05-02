import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { TabComingSoon } from "@/components/TabComingSoon";
import { MiniSparkline } from "@/components/MiniSparkline";
import { SignalBadge } from "@/components/SignalDot";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
  BarChart, Bar,
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

interface GrowthTabData {
  gdpGrowth: SeriesHistory;
  industrialProduction: SeriesHistory;
  retailSales: SeriesHistory;
  manufacturingPMI: SeriesHistory;
  servicesPMI: SeriesHistory;
  leadingIndicators: unknown[];
}

function SeriesCard({
  title, data, color, unit, refLine, barChart,
}: {
  title: string;
  data: SeriesHistory;
  color: string;
  unit?: string;
  refLine?: number;
  barChart?: boolean;
}) {
  const latest = data.latestValue;
  const prev = data.observations[data.observations.length - 2]?.value ?? latest;
  const change = latest - prev;
  const isUp = change >= 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-zinc-300">{title}</span>
        <SignalBadge
          signal={
            refLine
              ? latest >= refLine + 2 ? "positive" : latest >= refLine - 2 ? "neutral" : "negative"
              : isUp ? "positive" : "negative"
          }
          label={`${latest >= 0 && !title.includes("GDP") ? "+" : ""}${formatNumber(latest, 1)}${unit ?? ""}`}
        />
      </div>
      <div className="text-xs text-zinc-500 mb-3">
        {formatDate(data.latestDate)} &nbsp;·&nbsp; {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}{unit ?? ""} vs prior
      </div>
      <ResponsiveContainer width="100%" height={120}>
        {barChart ? (
          <BarChart data={data.observations.slice(-24)} margin={{ top: 2, right: 0, left: -30, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
            {refLine !== undefined && <ReferenceLine y={refLine} stroke="#52525b" strokeDasharray="4 4" />}
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 11 }}
              labelFormatter={formatDate}
              formatter={(v: number) => [`${v.toFixed(1)}${unit ?? ""}`, title]}
            />
            <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
          </BarChart>
        ) : (
          <AreaChart data={data.observations.slice(-48)} margin={{ top: 2, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} interval={11} />
            <YAxis tick={{ fill: "#52525b", fontSize: 10 }} axisLine={false} tickLine={false} />
            {refLine !== undefined && <ReferenceLine y={refLine} stroke="#52525b" strokeDasharray="4 4" />}
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 11 }}
              labelFormatter={formatDate}
              formatter={(v: number) => [`${v.toFixed(1)}${unit ?? ""}`, title]}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${title})`} dot={false} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default function GrowthPage() {
  const { data, isLoading, error } = useQuery<GrowthTabData>({
    queryKey: ["tab-growth"],
    queryFn: () => apiFetch<GrowthTabData>("/api/macro/tab/growth"),
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
        title="Growth & Cycle"
        description="GDP, PMI, industrial production, and business cycle data. Data temporarily unavailable."
        items={["Real GDP Growth", "ISM Manufacturing PMI", "Industrial Production", "Retail Sales", "Leading Indicators"]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Growth &amp; Cycle</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Real economic output, industrial activity, and business cycle indicators</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SeriesCard title="Real GDP Growth" data={data.gdpGrowth} color="#34d399" unit="%" refLine={0} barChart />
        <SeriesCard title="ISM Manufacturing PMI" data={data.manufacturingPMI} color="#60a5fa" refLine={50} />
        <SeriesCard title="Industrial Production" data={data.industrialProduction} color="#a78bfa" unit="" />
        <SeriesCard title="Retail Sales" data={data.retailSales} color="#fb923c" unit="" />
      </div>
      <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-4">
        Data from FRED (Federal Reserve Bank of St. Louis) · For informational purposes only
      </div>
    </div>
  );
}
