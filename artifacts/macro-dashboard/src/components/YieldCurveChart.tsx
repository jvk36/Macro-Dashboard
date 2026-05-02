import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface YieldCurvePoint {
  maturity: string;
  years: number;
  yield: number;
}

interface YieldCurveChartProps {
  points: YieldCurvePoint[];
  spread2s10s: number;
  isInverted: boolean;
  isLoading?: boolean;
}

export function YieldCurveChart({ points, spread2s10s, isInverted, isLoading }: YieldCurveChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/3 mb-4" />
        <div className="h-48 bg-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-300">US Treasury Yield Curve</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Current snapshot across all maturities</p>
        </div>
        <div className={cn(
          "text-right text-xs font-mono px-2 py-1 rounded",
          isInverted ? "bg-red-900/30 text-red-400" : "bg-emerald-900/30 text-emerald-400"
        )}>
          <div className="font-semibold">2s10s</div>
          <div>{spread2s10s >= 0 ? "+" : ""}{spread2s10s.toFixed(0)} bps</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={points} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="maturity"
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px" }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(val: number) => [`${val.toFixed(2)}%`, "Yield"]}
          />
          <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="yield"
            stroke={isInverted ? "#f87171" : "#34d399"}
            strokeWidth={2.5}
            dot={{ fill: isInverted ? "#f87171" : "#34d399", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
