import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type Signal = "positive" | "neutral" | "negative";
type CyclePhase = "early_expansion" | "mid_expansion" | "late_expansion" | "recession";
type IndicatorType = "Leading" | "Coincident" | "Lagging" | "Real-Time";

interface Indicator {
  id: string;
  name: string;
  value: number | null;
  formattedValue: string;
  source: string;
  frequency: string;
  type: IndicatorType;
  signal: Signal | null;
  date: string | null;
  available: boolean;
  isProxy?: boolean;
  proxySource?: string;
  unavailableReason?: string;
}

interface GrowthTabData {
  cyclePhase: {
    phase: CyclePhase;
    label: string;
    confidence: number;
    description: string;
    sliderPosition: number;
  };
  indicators: Indicator[];
  lastRefreshed: string;
}

// ─── Phase config ────────────────────────────────────────────────────────────
const PHASES: { key: CyclePhase; label: string; color: string; bg: string; pct: string }[] = [
  { key: "early_expansion", label: "Early Expansion", color: "#34d399", bg: "rgba(52,211,153,0.12)", pct: "0–25%" },
  { key: "mid_expansion",   label: "Mid Expansion",   color: "#38bdf8", bg: "rgba(56,189,248,0.12)", pct: "25–50%" },
  { key: "late_expansion",  label: "Late Expansion",  color: "#fbbf24", bg: "rgba(251,191,36,0.12)", pct: "50–75%" },
  { key: "recession",       label: "Recession",       color: "#f87171", bg: "rgba(248,113,113,0.12)", pct: "75–100%" },
];

function getPhaseColor(phase: CyclePhase): string {
  return PHASES.find((p) => p.key === phase)?.color ?? "#a1a1aa";
}

// ─── Type badge ──────────────────────────────────────────────────────────────
const TYPE_STYLES: Record<IndicatorType, { text: string; border: string; dot: string }> = {
  Leading:    { text: "text-blue-400",   border: "border-blue-500/40",   dot: "bg-blue-400" },
  Coincident: { text: "text-emerald-400",border: "border-emerald-500/40",dot: "bg-emerald-400" },
  Lagging:    { text: "text-amber-400",  border: "border-amber-500/40",  dot: "bg-amber-400" },
  "Real-Time":{ text: "text-violet-400", border: "border-violet-500/40", dot: "bg-violet-400" },
};

function TypeBadge({ type }: { type: IndicatorType }) {
  const s = TYPE_STYLES[type];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {type}
    </span>
  );
}

// ─── Signal dot ──────────────────────────────────────────────────────────────
function SignalDot({ signal }: { signal: Signal | null }) {
  if (!signal) return <span className="w-2 h-2 rounded-full bg-zinc-700 inline-block" />;
  const colors: Record<Signal, string> = {
    positive: "bg-emerald-400",
    neutral: "bg-blue-400",
    negative: "bg-red-400",
  };
  return <span className={`w-2 h-2 rounded-full ${colors[signal]} inline-block`} />;
}

// ─── Section A: Cycle Phase Indicator ────────────────────────────────────────
function CyclePhaseIndicator({ cycle }: { cycle: GrowthTabData["cyclePhase"] }) {
  const color = getPhaseColor(cycle.phase);
  const pos = Math.max(1, Math.min(99, cycle.sliderPosition));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Current Phase</span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-2xl font-bold" style={{ color }}>{cycle.label}</span>
            <span
              className="text-sm font-semibold px-2.5 py-0.5 rounded-full border"
              style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
            >
              {cycle.confidence}% confidence
            </span>
          </div>
        </div>
      </div>

      {/* Scale bar */}
      <div className="relative mb-2 select-none">
        {/* Segment strips */}
        <div className="flex h-5 rounded-lg overflow-hidden gap-px">
          {PHASES.map((p) => (
            <div
              key={p.key}
              className="flex-1 opacity-60"
              style={{ backgroundColor: p.color }}
            />
          ))}
        </div>

        {/* Marker triangle */}
        <div
          className="absolute -top-1 transition-all duration-700"
          style={{ left: `calc(${pos}% - 6px)` }}
        >
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <polygon points="6,9 0,0 12,0" fill="white" />
          </svg>
        </div>

        {/* Marker pin line */}
        <div
          className="absolute top-0 w-0.5 h-5 bg-white/80 transition-all duration-700"
          style={{ left: `${pos}%` }}
        />
      </div>

      {/* Phase segment labels */}
      <div className="flex mb-4">
        {PHASES.map((p) => (
          <div
            key={p.key}
            className="flex-1 pt-2 text-center"
          >
            <div
              className="text-xs font-semibold leading-tight"
              style={{ color: cycle.phase === p.key ? p.color : "#71717a" }}
            >
              {p.label}
            </div>
            <div className="text-[10px] text-zinc-600 mt-0.5">{p.pct}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      <div
        className="rounded-lg border px-4 py-3 text-sm text-zinc-300 leading-relaxed"
        style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
      >
        {cycle.description}
      </div>
    </div>
  );
}

// ─── Section B: Indicators Table ─────────────────────────────────────────────
function IndicatorsTable({ indicators }: { indicators: Indicator[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr] gap-x-3 px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Indicator</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 text-right">Latest Value</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Source</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Frequency</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Type</span>
      </div>

      {/* Rows */}
      {indicators.map((ind, idx) => (
        <div
          key={ind.id}
          className={`grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr] gap-x-3 px-4 py-3 items-center ${
            idx < indicators.length - 1 ? "border-b border-zinc-800/60" : ""
          } hover:bg-zinc-800/30 transition-colors`}
        >
          {/* Name + signal */}
          <div className="flex items-center gap-2.5 min-w-0">
            <SignalDot signal={ind.signal} />
            <span className="text-sm font-medium text-zinc-200 truncate">{ind.name}</span>
          </div>

          {/* Value */}
          <div className="text-right">
            {ind.available ? (
              <div>
                <div className="flex items-center justify-end gap-1.5">
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{
                      color:
                        ind.signal === "positive" ? "#34d399"
                        : ind.signal === "negative" ? "#f87171"
                        : "#93c5fd",
                    }}
                  >
                    {ind.formattedValue}
                  </span>
                  {ind.isProxy && (
                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded border border-zinc-700 text-zinc-500 uppercase tracking-wide leading-none">
                      est.
                    </span>
                  )}
                </div>
                {ind.date && (
                  <div className="text-[10px] text-zinc-600 mt-0.5">{formatDate(ind.date)}</div>
                )}
                {ind.isProxy && ind.proxySource && (
                  <div className="text-[10px] text-zinc-700 mt-0.5 leading-tight">{ind.proxySource}</div>
                )}
              </div>
            ) : (
              <div>
                <span className="text-xs text-zinc-600">—</span>
                {ind.unavailableReason && (
                  <div className="text-[10px] text-zinc-700 mt-0.5 whitespace-nowrap">{ind.unavailableReason}</div>
                )}
              </div>
            )}
          </div>

          {/* Source */}
          <div className="text-xs text-zinc-400">{ind.source}</div>

          {/* Frequency */}
          <div className="text-xs text-zinc-400">{ind.frequency}</div>

          {/* Type badge */}
          <div>
            <TypeBadge type={ind.type} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton loaders ────────────────────────────────────────────────────────
function GrowthSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-48 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
      <div className="h-80 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GrowthPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<GrowthTabData>({
    queryKey: ["tab-growth"],
    queryFn: () => apiFetch<GrowthTabData>("/api/macro/tab/growth"),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <GrowthSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="text-zinc-400 text-sm mb-2">Failed to load growth data</div>
        <button
          onClick={() => refetch()}
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Growth &amp; Cycle</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Business cycle positioning and GDP activity indicators
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40 border border-zinc-800 rounded-lg px-3 py-1.5"
        >
          <svg
            className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Section A */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            A · Cycle Phase Indicator
          </span>
        </div>
        <CyclePhaseIndicator cycle={data.cyclePhase} />
      </div>

      {/* Section B */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            B · GDP Activity &amp; Indicators
          </span>
        </div>
        <IndicatorsTable indicators={data.indicators} />

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 px-1">
          {(["Leading", "Coincident", "Lagging", "Real-Time"] as IndicatorType[]).map((t) => {
            const s = TYPE_STYLES[t];
            return (
              <div key={t} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                <span className={`text-[10px] font-medium ${s.text}`}>{t}</span>
              </div>
            );
          })}
          <span className="text-zinc-700">·</span>
          {[
            { dot: "bg-emerald-400", label: "Positive" },
            { dot: "bg-blue-400",    label: "Neutral" },
            { dot: "bg-red-400",     label: "Negative" },
            { dot: "bg-zinc-700",    label: "N/A" },
          ].map(({ dot, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <span className="text-[10px] text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-4 flex items-center justify-between">
        <span>
          FRED (Federal Reserve Bank of St. Louis) · Conference Board · Atlanta Fed · For informational purposes only
        </span>
        <span className="text-zinc-700">
          Updated {new Date(data.lastRefreshed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
