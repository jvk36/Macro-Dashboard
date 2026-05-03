import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type GlobSig = "positive" | "neutral" | "warning" | "negative" | null;
type TrendColor = "emerald" | "blue" | "amber" | "red" | "teal" | "zinc";

interface PmiEntry {
  value: number;
  formatted: string;
  date: string;
  available: true;
}
interface PmiEntryNA { available: false }

interface PmiRow {
  region: string;
  code: string;
  flag: string;
  mfg: PmiEntry | PmiEntryNA;
  composite: PmiEntry | PmiEntryNA;
  trend: string;
  trendColor: TrendColor;
}

interface IndRow {
  id: string;
  name: string;
  value: number | null;
  formattedValue: string;
  date: string | null;
  source: string;
  signal: GlobSig;
  status: string;
  available: boolean;
  impact: string;
}

interface GlobalTabData {
  pmiTable: PmiRow[];
  indicators: IndRow[];
  pmiNote: string;
  lastRefreshed: string;
}

// ─── Signal palette ────────────────────────────────────────────────────────────
const SIG: Record<NonNullable<GlobSig>, { text: string; bg: string; border: string; dot: string }> = {
  positive: { text: "text-emerald-400", bg: "rgba(52,211,153,0.12)",  border: "border-emerald-500/30", dot: "bg-emerald-400" },
  neutral:  { text: "text-blue-400",    bg: "rgba(96,165,250,0.12)",  border: "border-blue-500/30",    dot: "bg-blue-400"    },
  warning:  { text: "text-amber-400",   bg: "rgba(251,191,36,0.12)",  border: "border-amber-500/30",   dot: "bg-amber-400"   },
  negative: { text: "text-red-400",     bg: "rgba(248,113,113,0.12)", border: "border-red-500/30",     dot: "bg-red-400"     },
};

const TREND_STYLE: Record<TrendColor, { text: string; bg: string; border: string }> = {
  emerald: { text: "text-emerald-400", bg: "rgba(52,211,153,0.12)",  border: "border-emerald-500/30" },
  teal:    { text: "text-teal-400",    bg: "rgba(45,212,191,0.12)",  border: "border-teal-500/30"    },
  blue:    { text: "text-blue-400",    bg: "rgba(96,165,250,0.12)",  border: "border-blue-500/30"    },
  amber:   { text: "text-amber-400",   bg: "rgba(251,191,36,0.12)",  border: "border-amber-500/30"   },
  red:     { text: "text-red-400",     bg: "rgba(248,113,113,0.12)", border: "border-red-500/30"     },
  zinc:    { text: "text-zinc-500",    bg: "rgba(113,113,122,0.12)", border: "border-zinc-700/50"    },
};

function sigText(s: GlobSig)   { return s ? SIG[s].text   : "text-zinc-400"; }

function StatusBadge({ signal, status }: { signal: GlobSig; status: string | null }) {
  if (!signal || !status) return null;
  const c = SIG[signal];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${c.text} ${c.border} whitespace-nowrap`}
      style={{ backgroundColor: c.bg }}
    >
      {status}
    </span>
  );
}

function TrendBadge({ trend, color }: { trend: string; color: TrendColor }) {
  const c = TREND_STYLE[color];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${c.text} ${c.border} whitespace-nowrap`}
      style={{ backgroundColor: c.bg }}
    >
      {trend}
    </span>
  );
}

function SignalDot({ signal }: { signal: GlobSig }) {
  return <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${signal ? SIG[signal].dot : "bg-zinc-700"}`} />;
}

// ─── PMI value chip ────────────────────────────────────────────────────────────
function PmiChip({ entry }: { entry: PmiEntry | PmiEntryNA }) {
  if (!entry.available) {
    return <span className="text-xs text-zinc-600">—</span>;
  }
  const v = (entry as PmiEntry).value;
  const color = v >= 51 ? "text-emerald-400" : v >= 49.5 ? "text-blue-400" : v >= 48 ? "text-amber-400" : "text-red-400";
  return (
    <div className="text-right">
      <span className={`text-sm font-bold tabular-nums ${color}`}>
        {(entry as PmiEntry).formatted}
      </span>
      <div className="text-[10px] text-zinc-600 mt-0.5">{formatDate((entry as PmiEntry).date)}</div>
    </div>
  );
}

// ─── Section A: PMI Table ──────────────────────────────────────────────────────
function PmiTable({ rows, note }: { rows: PmiRow[]; note: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="grid grid-cols-[2fr_1fr_1fr_1.4fr] gap-x-3 px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Region</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 text-right">Mfg PMI</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 text-right">Composite</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 pl-2">Trend</span>
      </div>

      {rows.map((row, idx) => (
        <div
          key={row.code}
          className={`grid grid-cols-[2fr_1fr_1fr_1.4fr] gap-x-3 px-4 py-3 items-center ${idx < rows.length - 1 ? "border-b border-zinc-800/60" : ""} hover:bg-zinc-800/20 transition-colors`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{row.flag}</span>
            <div>
              <span className="text-sm font-medium text-zinc-200">{row.region}</span>
              <span className="ml-1.5 text-[10px] text-zinc-600 font-mono">{row.code}</span>
            </div>
          </div>
          <PmiChip entry={row.mfg} />
          <PmiChip entry={row.composite} />
          <div className="pl-2">
            <TrendBadge trend={row.trend} color={row.trendColor} />
          </div>
        </div>
      ))}

      <div className="px-4 py-2.5 border-t border-zinc-800/60 bg-zinc-950/50">
        <p className="text-[10px] text-zinc-600 leading-relaxed">{note}</p>
      </div>
    </div>
  );
}

// ─── Section B: Indicators Table ──────────────────────────────────────────────
function IndicatorsTable({ rows }: { rows: IndRow[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="grid grid-cols-[2.2fr_1fr_1fr_0.9fr_2.8fr] gap-x-3 px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Indicator</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 text-right">Latest</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Source</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Signal</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Impact</span>
      </div>

      {rows.map((row, idx) => (
        <div
          key={row.id}
          className={`grid grid-cols-[2.2fr_1fr_1fr_0.9fr_2.8fr] gap-x-3 px-4 py-3 items-start ${idx < rows.length - 1 ? "border-b border-zinc-800/60" : ""} hover:bg-zinc-800/20 transition-colors`}
        >
          <div className="flex items-center gap-2.5 pt-0.5">
            <SignalDot signal={row.signal} />
            <span className="text-sm font-medium text-zinc-200">{row.name}</span>
          </div>

          <div className="text-right">
            {row.available ? (
              <div>
                <span className={`text-sm font-bold tabular-nums ${sigText(row.signal)}`}>
                  {row.formattedValue}
                </span>
                {row.date && (
                  <div className="text-[10px] text-zinc-600 mt-0.5">{formatDate(row.date)}</div>
                )}
              </div>
            ) : (
              <span className="text-xs text-zinc-600">—</span>
            )}
          </div>

          <div className="text-xs text-zinc-400 pt-0.5">{row.source}</div>

          <div className="pt-0.5">
            <StatusBadge signal={row.signal} status={row.status} />
          </div>

          <div className="text-xs text-zinc-500 leading-relaxed">{row.impact}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function GlobalSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-[340px] rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
      <div className="h-[520px] rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GlobalPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<GlobalTabData>({
    queryKey: ["tab-global-v1"],
    queryFn: () => apiFetch<GlobalTabData>("/api/macro/tab/global"),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <GlobalSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="text-zinc-400 text-sm mb-2">Failed to load global macro data</div>
        <button onClick={() => refetch()} className="text-xs text-blue-400 hover:text-blue-300 underline">
          Try again
        </button>
      </div>
    );
  }

  const ts = new Date(data.lastRefreshed);
  const timeStr = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Global Macro</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            International PMI readings, central bank rates, inflation, and FX indicators
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40 border border-zinc-800 rounded-lg px-3 py-1.5"
        >
          <svg className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Section A */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          A · Global PMI Composite Readings
        </div>
        <PmiTable rows={data.pmiTable} note={data.pmiNote} />
      </div>

      {/* Section B */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          B · Key Global Indicators
        </div>
        <IndicatorsTable rows={data.indicators} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-zinc-700 pt-1">
        <span>OECD · ECB · BoE · Eurostat · MIC Japan · NBS China · ONS · EIA · Fed · For informational purposes only</span>
        <span>Updated {timeStr}</span>
      </div>
    </div>
  );
}
