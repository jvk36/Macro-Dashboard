import { cn } from "@/lib/utils";

type Phase = "early_expansion" | "mid_expansion" | "late_expansion" | "early_contraction" | "recession" | "recovery";

interface MarketCycleGaugeProps {
  phase: Phase;
  label: string;
  confidence: number;
  description: string;
  isLoading?: boolean;
}

const phaseConfig: Record<Phase, { color: string; bgColor: string; ringColor: string; position: number; icon: string }> = {
  recovery:          { color: "text-emerald-300", bgColor: "bg-emerald-900/30", ringColor: "ring-emerald-500/30", position: 0, icon: "↗" },
  early_expansion:   { color: "text-emerald-400", bgColor: "bg-emerald-900/30", ringColor: "ring-emerald-500/30", position: 1, icon: "↑" },
  mid_expansion:     { color: "text-blue-400",    bgColor: "bg-blue-900/30",    ringColor: "ring-blue-500/30",    position: 2, icon: "→" },
  late_expansion:    { color: "text-amber-400",   bgColor: "bg-amber-900/30",   ringColor: "ring-amber-500/30",   position: 3, icon: "↘" },
  early_contraction: { color: "text-orange-400",  bgColor: "bg-orange-900/30",  ringColor: "ring-orange-500/30",  position: 4, icon: "↓" },
  recession:         { color: "text-red-400",      bgColor: "bg-red-900/30",     ringColor: "ring-red-500/30",     position: 5, icon: "↙" },
};

const phases: Phase[] = ["recovery", "early_expansion", "mid_expansion", "late_expansion", "early_contraction", "recession"];

export function MarketCycleGauge({ phase, label, confidence, description, isLoading }: MarketCycleGaugeProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="h-5 bg-zinc-800 rounded animate-pulse w-1/3 mb-4" />
        <div className="h-16 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-full mb-2" />
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-4/5" />
      </div>
    );
  }

  const config = phaseConfig[phase];
  const activeIdx = config.position;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Market Cycle Phase</h3>
        <span className="text-xs text-zinc-500">{confidence}% confidence</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className={cn("text-3xl font-bold", config.color)}>{config.icon}</span>
        <span className={cn("text-xl font-bold", config.color)}>{label}</span>
      </div>

      <div className="flex gap-1 mb-4">
        {phases.map((p, i) => (
          <div
            key={p}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-all",
              i === activeIdx
                ? phaseConfig[p].color.replace("text-", "bg-")
                : i < activeIdx
                ? "bg-zinc-700"
                : "bg-zinc-800",
            )}
          />
        ))}
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>

      <div className="mt-4 grid grid-cols-3 gap-1 text-center">
        {phases.map((p, i) => (
          <span
            key={p}
            className={cn(
              "text-[10px] px-1 py-0.5 rounded",
              i === activeIdx
                ? cn("font-semibold", phaseConfig[p].color, phaseConfig[p].bgColor)
                : "text-zinc-600",
            )}
          >
            {p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        ))}
      </div>
    </div>
  );
}
