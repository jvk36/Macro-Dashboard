import { cn, formatDate } from "@/lib/utils";
import { SignalDot, SignalBadge } from "./SignalDot";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Signal = "positive" | "neutral" | "negative" | "warning";

interface KeyReading {
  id: string;
  label: string;
  value: number;
  unit: string;
  signal: Signal;
  signalLabel: string;
  description?: string;
  lastUpdated: string;
  previousValue?: number | null;
  change?: number | null;
}

interface KeyReadingsTableProps {
  readings: KeyReading[];
  isLoading?: boolean;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-800">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export function KeyReadingsTable({ readings, isLoading }: KeyReadingsTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-950/50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Indicator</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">Value</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">Signal</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">Status</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden lg:table-cell">As of</th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            : readings.map((r, idx) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b border-zinc-800 transition-colors hover:bg-zinc-800/40",
                    idx % 2 === 0 ? "bg-zinc-900" : "bg-zinc-900/50",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-100">{r.label}</div>
                    {r.description && (
                      <div className="text-xs text-zinc-500 mt-0.5 hidden md:block">{r.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-base font-semibold text-zinc-100">
                      {r.value >= 0 && r.id !== "t10y" && r.id !== "cpi" && r.id !== "fedfunds" && r.id !== "unrate" ? "" : ""}
                      {r.value.toFixed(r.unit === "" ? 1 : 1)}
                      {r.unit}
                    </span>
                    {r.change != null && r.id === "t10y" && (
                      <div className={cn("text-xs mt-0.5 flex items-center justify-end gap-0.5", r.change > 0 ? "text-red-400" : r.change < 0 ? "text-emerald-400" : "text-zinc-500")}>
                        {r.change > 0 ? <TrendingUp className="h-3 w-3" /> : r.change < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {r.change > 0 ? "+" : ""}{r.change.toFixed(2)}% MoM
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SignalDot signal={r.signal} size="md" />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <SignalBadge signal={r.signal} label={r.signalLabel} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500 hidden lg:table-cell">
                    {formatDate(r.lastUpdated)}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
