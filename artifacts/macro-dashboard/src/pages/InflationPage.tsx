import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type InflSig = "positive" | "neutral" | "warning" | "negative" | null;

interface HeadlineReading {
  value: number | null;
  date: string | null;
  signal: InflSig;
  status: string | null;
}

interface Component {
  id: string;
  name: string;
  value: number | null;
  date: string | null;
  signal: InflSig;
  status: string | null;
}

interface SuiteRow {
  id: string;
  name: string;
  value: number | null;
  formattedValue: string;
  source: string;
  whyItMatters: string;
  date: string | null;
  available: boolean;
  unavailableReason?: string;
}

interface InflationTabData {
  headlineReadings: {
    cpi: HeadlineReading;
    coreCpi: HeadlineReading;
    pce: HeadlineReading;
    corePce: HeadlineReading;
  };
  components: Component[];
  dataSuite: SuiteRow[];
  lastRefreshed: string;
}

// ─── Signal helpers ──────────────────────────────────────────────────────────
const SIG_COLORS: Record<NonNullable<InflSig>, { text: string; bg: string; border: string }> = {
  positive: { text: "text-emerald-400", bg: "rgba(52,211,153,0.12)", border: "border-emerald-500/30" },
  neutral:  { text: "text-blue-400",    bg: "rgba(96,165,250,0.12)", border: "border-blue-500/30" },
  warning:  { text: "text-amber-400",   bg: "rgba(251,191,36,0.12)", border: "border-amber-500/30" },
  negative: { text: "text-red-400",     bg: "rgba(248,113,113,0.12)", border: "border-red-500/30" },
};

function sigColor(signal: InflSig, part: "text" | "bg" | "border"): string {
  if (!signal) return part === "text" ? "text-zinc-400" : part === "bg" ? "transparent" : "border-zinc-700";
  return SIG_COLORS[signal][part];
}

function StatusBadge({ signal, status }: { signal: InflSig; status: string | null }) {
  if (!signal || !status) return null;
  const c = SIG_COLORS[signal];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${c.text} ${c.border}`}
      style={{ backgroundColor: c.bg }}
    >
      {status}
    </span>
  );
}

function SignalDot({ signal }: { signal: InflSig }) {
  const dots: Record<NonNullable<InflSig>, string> = {
    positive: "bg-emerald-400",
    neutral:  "bg-blue-400",
    warning:  "bg-amber-400",
    negative: "bg-red-400",
  };
  return (
    <span className={`w-2 h-2 rounded-full inline-block ${signal ? dots[signal] : "bg-zinc-700"}`} />
  );
}

// ─── Section A: Headline Reading Card ────────────────────────────────────────
function HeadlineCard({ label, subtitle, data }: { label: string; subtitle: string; data: HeadlineReading }) {
  const { value, date, signal, status } = data;
  return (
    <div
      className="rounded-xl border bg-zinc-900 p-5 flex flex-col gap-3"
      style={{ borderColor: signal ? `${SIG_COLORS[signal].border.replace("border-", "").replace("/30", "")}` : "#27272a" }}
    >
      <div>
        <div className="text-xs font-semibold text-zinc-400 mb-0.5">{label}</div>
        <div className="text-[11px] text-zinc-600">{subtitle}</div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          {value !== null ? (
            <span className={`text-3xl font-bold tabular-nums ${sigColor(signal, "text")}`}>
              {value.toFixed(2)}%
            </span>
          ) : (
            <span className="text-2xl font-bold text-zinc-600">N/A</span>
          )}
          {date && <div className="text-[10px] text-zinc-600 mt-0.5">As of {formatDate(date)}</div>}
        </div>
        <StatusBadge signal={signal} status={status} />
      </div>
      {/* Target bar */}
      {value !== null && (
        <div className="relative h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          {/* Target line at 2% */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-emerald-600/60 z-10" style={{ left: `${Math.min(100, (2 / 8) * 100)}%` }} />
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, (Math.abs(value) / 8) * 100))}%`,
              backgroundColor: signal === "positive" ? "#34d399" : signal === "neutral" ? "#60a5fa" : signal === "warning" ? "#fbbf24" : "#f87171",
            }}
          />
        </div>
      )}
      {value !== null && (
        <div className="text-[10px] text-zinc-600 flex justify-between">
          <span>0%</span>
          <span className="text-emerald-600">← 2% target</span>
          <span>8%+</span>
        </div>
      )}
    </div>
  );
}

// ─── Section B: Component Row ────────────────────────────────────────────────
const COMPONENT_SCALE = { min: -8, max: 12 }; // display scale in percent

function ComponentRow({ comp, isLast }: { comp: Component; isLast: boolean }) {
  const { name, value, date, signal, status } = comp;
  const pct = value !== null
    ? Math.max(0, Math.min(100, ((value - COMPONENT_SCALE.min) / (COMPONENT_SCALE.max - COMPONENT_SCALE.min)) * 100))
    : 0;
  const targetPct = Math.max(0, Math.min(100, ((2 - COMPONENT_SCALE.min) / (COMPONENT_SCALE.max - COMPONENT_SCALE.min)) * 100));

  return (
    <div className={`flex items-center gap-4 px-4 py-3 ${!isLast ? "border-b border-zinc-800/60" : ""} hover:bg-zinc-800/20 transition-colors`}>
      {/* Name + dot */}
      <div className="w-52 flex items-center gap-2.5 shrink-0">
        <SignalDot signal={signal} />
        <span className="text-sm font-medium text-zinc-200">{name}</span>
      </div>

      {/* Bar */}
      <div className="flex-1 relative h-5 flex items-center">
        <div className="w-full h-2 rounded-full bg-zinc-800 relative overflow-hidden">
          {/* Zero line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-zinc-600 z-10"
            style={{ left: `${((0 - COMPONENT_SCALE.min) / (COMPONENT_SCALE.max - COMPONENT_SCALE.min)) * 100}%` }}
          />
          {/* Target line at 2% */}
          <div
            className="absolute top-0 bottom-0 w-px bg-emerald-600/70 z-10"
            style={{ left: `${targetPct}%` }}
          />
          {/* Value bar */}
          {value !== null && (
            <div
              className="absolute top-0 bottom-0 rounded-full transition-all duration-500"
              style={{
                left: value >= 0 ? `${((0 - COMPONENT_SCALE.min) / (COMPONENT_SCALE.max - COMPONENT_SCALE.min)) * 100}%` : `${pct}%`,
                width: value >= 0
                  ? `${Math.min(100, ((value) / (COMPONENT_SCALE.max - COMPONENT_SCALE.min)) * 100)}%`
                  : `${Math.abs(((value) / (COMPONENT_SCALE.max - COMPONENT_SCALE.min)) * 100)}%`,
                backgroundColor: signal === "positive" ? "#34d399" : signal === "neutral" ? "#60a5fa" : signal === "warning" ? "#fbbf24" : "#f87171",
              }}
            />
          )}
        </div>
        {/* Scale labels */}
        <div className="absolute -bottom-3.5 left-0 text-[9px] text-zinc-700">{COMPONENT_SCALE.min}%</div>
        <div className="absolute -bottom-3.5 right-0 text-[9px] text-zinc-700">{COMPONENT_SCALE.max}%</div>
      </div>

      {/* Value + status */}
      <div className="w-40 flex items-center justify-end gap-2.5 shrink-0">
        {value !== null ? (
          <>
            <div className="text-right">
              <span className={`text-sm font-bold tabular-nums ${sigColor(signal, "text")}`}>
                {value >= 0 ? "+" : ""}{value.toFixed(2)}%
              </span>
              {date && <div className="text-[10px] text-zinc-600">{formatDate(date)}</div>}
            </div>
            <StatusBadge signal={signal} status={status} />
          </>
        ) : (
          <span className="text-xs text-zinc-600">N/A</span>
        )}
      </div>
    </div>
  );
}

// ─── Section C: Data Suite Table ─────────────────────────────────────────────
function DataSuiteTable({ rows }: { rows: SuiteRow[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="grid grid-cols-[2fr_1fr_1fr_3fr] gap-x-3 px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Indicator</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 text-right">Latest</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Source</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Why It Matters</span>
      </div>
      {rows.map((row, idx) => (
        <div
          key={row.id}
          className={`grid grid-cols-[2fr_1fr_1fr_3fr] gap-x-3 px-4 py-3 items-start ${idx < rows.length - 1 ? "border-b border-zinc-800/60" : ""} hover:bg-zinc-800/20 transition-colors`}
        >
          <div className="text-sm font-medium text-zinc-200">{row.name}</div>
          <div className="text-right">
            {row.available ? (
              <div>
                <span className="text-sm font-bold tabular-nums text-zinc-100">{row.formattedValue}</span>
                {row.date && <div className="text-[10px] text-zinc-600 mt-0.5">{formatDate(row.date)}</div>}
              </div>
            ) : (
              <div>
                <span className="text-xs text-zinc-600">—</span>
                {row.unavailableReason && (
                  <div className="text-[10px] text-zinc-700 mt-0.5">{row.unavailableReason}</div>
                )}
              </div>
            )}
          </div>
          <div className="text-xs text-zinc-400 pt-0.5">{row.source}</div>
          <div className="text-xs text-zinc-500 leading-relaxed">{row.whyItMatters}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function InflationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
        ))}
      </div>
      <div className="h-48 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
      <div className="h-80 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InflationPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<InflationTabData>({
    queryKey: ["tab-inflation-v2"],
    queryFn: () => apiFetch<InflationTabData>("/api/macro/tab/inflation"),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <InflationSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="text-zinc-400 text-sm mb-2">Failed to load inflation data</div>
        <button onClick={() => refetch()} className="text-xs text-blue-400 hover:text-blue-300 underline">
          Try again
        </button>
      </div>
    );
  }

  const { headlineReadings: h, components, dataSuite } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Inflation</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Consumer prices, producer prices, and market-based inflation expectations vs 2% Fed target
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
          A · Headline Readings
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HeadlineCard
            label="CPI (YoY)"
            subtitle="All Urban Consumers"
            data={h.cpi}
          />
          <HeadlineCard
            label="Core CPI (YoY)"
            subtitle="Ex-Food & Energy"
            data={h.coreCpi}
          />
          <HeadlineCard
            label="PCE Deflator (YoY)"
            subtitle="Fed's Primary Gauge"
            data={h.pce}
          />
          <HeadlineCard
            label="Core PCE (YoY)"
            subtitle="Fed's 2% Target Measure"
            data={h.corePce}
          />
        </div>
      </div>

      {/* Section B */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          B · CPI Component Breakdown — Year-over-Year %
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 pb-5">
          {/* Column headers */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-zinc-800 bg-zinc-950 rounded-t-xl">
            <span className="w-52 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 shrink-0">Component</span>
            <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 pl-1">
              YoY % (scale: −8% to +12%&nbsp;&nbsp;
              <span className="text-emerald-600/70">│ = 2% target</span>
            </span>
            <span className="w-40 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 text-right shrink-0">Value / Status</span>
          </div>
          <div className="pt-1">
            {components.map((comp, i) => (
              <ComponentRow key={comp.id} comp={comp} isLast={i === components.length - 1} />
            ))}
          </div>
        </div>
      </div>

      {/* Section C */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          C · Full Inflation Data Suite
        </div>
        <DataSuiteTable rows={dataSuite} />
      </div>

      {/* Footer */}
      <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-4 flex items-center justify-between">
        <span>BLS · BEA · Federal Reserve · University of Michigan · For informational purposes only</span>
        <span className="text-zinc-700">
          Updated {new Date(data.lastRefreshed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
