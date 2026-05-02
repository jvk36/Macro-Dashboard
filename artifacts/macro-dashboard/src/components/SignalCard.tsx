import { cn, formatDate } from "@/lib/utils";
import { SignalDot, SignalBadge } from "./SignalDot";

type Signal = "positive" | "neutral" | "negative" | "warning";

interface SignalCardProps {
  id: string;
  label: string;
  value: number;
  unit: string;
  signal: Signal;
  signalLabel: string;
  interpretation: string;
  detail?: string;
  lastUpdated: string;
  isLoading?: boolean;
}

const signalBorderMap: Record<Signal, string> = {
  positive: "border-l-emerald-500",
  neutral: "border-l-blue-400",
  warning: "border-l-amber-400",
  negative: "border-l-red-500",
};

const signalBgMap: Record<Signal, string> = {
  positive: "bg-emerald-500/5",
  neutral: "bg-blue-500/5",
  warning: "bg-amber-500/5",
  negative: "bg-red-500/5",
};

export function SignalCard({ label, value, unit, signal, signalLabel, interpretation, detail, lastUpdated, isLoading }: SignalCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 border-l-4 border-l-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/3" />
          <div className="h-5 bg-zinc-800 rounded-full animate-pulse w-16" />
        </div>
        <div className="h-8 bg-zinc-800 rounded animate-pulse w-1/4 mb-3" />
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-full mb-2" />
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-4/5" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 p-5 border-l-4 transition-all hover:border-zinc-700",
        signalBorderMap[signal],
        signalBgMap[signal],
        "bg-zinc-900",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SignalDot signal={signal} size="md" />
          <span className="text-sm font-medium text-zinc-300">{label}</span>
        </div>
        <SignalBadge signal={signal} label={signalLabel} />
      </div>

      <div className="mb-3">
        <span className="text-2xl font-bold font-mono text-zinc-100">
          {detail ?? `${value.toFixed(unit === "bps" ? 0 : 1)}${unit}`}
        </span>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">{interpretation}</p>

      <div className="mt-3 text-xs text-zinc-600">As of {formatDate(lastUpdated)}</div>
    </div>
  );
}
