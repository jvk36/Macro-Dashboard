import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type LaborSig = "positive" | "neutral" | "warning" | "negative" | null;

interface HealthMetric {
  value: number;
  formattedValue: string;
  date: string;
  signal: LaborSig;
  status: string;
}

interface SuiteRow {
  id: string;
  name: string;
  value: number | null;
  formattedValue: string;
  source: string;
  signal: LaborSig;
  status: string | null;
  date: string | null;
  available: boolean;
  unavailableReason?: string;
}

interface LaborTabData {
  health: {
    nfpMoM: HealthMetric | null;
    unrate: HealthMetric | null;
    aweYoY: HealthMetric | null;
    jolts: HealthMetric | null;
  };
  suite: SuiteRow[];
  lastRefreshed: string;
}

// ─── Signal palette ──────────────────────────────────────────────────────────
const SIG: Record<NonNullable<LaborSig>, { text: string; bg: string; border: string; dot: string }> = {
  positive: { text: "text-emerald-400", bg: "rgba(52,211,153,0.12)", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  neutral:  { text: "text-blue-400",    bg: "rgba(96,165,250,0.12)", border: "border-blue-500/30",    dot: "bg-blue-400" },
  warning:  { text: "text-amber-400",   bg: "rgba(251,191,36,0.12)", border: "border-amber-500/30",   dot: "bg-amber-400" },
  negative: { text: "text-red-400",     bg: "rgba(248,113,113,0.12)", border: "border-red-500/30",    dot: "bg-red-400" },
};

function sigText(s: LaborSig)   { return s ? SIG[s].text   : "text-zinc-400"; }
function sigBorder(s: LaborSig) { return s ? SIG[s].border : "border-zinc-700"; }

function StatusBadge({ signal, status }: { signal: LaborSig; status: string | null }) {
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

function SignalDot({ signal }: { signal: LaborSig }) {
  return <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${signal ? SIG[signal].dot : "bg-zinc-700"}`} />;
}

// ─── Health card descriptions ────────────────────────────────────────────────
const HEALTH_META: Record<string, { subtitle: string; context: string }> = {
  nfpMoM:  { subtitle: "Nonfarm Payrolls MoM", context: ">200K strong · 100–200K healthy · <50K weak · <0 contracting" },
  unrate:  { subtitle: "Unemployment Rate (U-3)", context: "<4% full employment · 4–4.5% healthy · >5.5% elevated" },
  aweYoY:  { subtitle: "Avg Hourly Earnings YoY", context: "3–3.5% sustainable · 3.5–4.5% wage pressure · >4.5% high pressure" },
  jolts:   { subtitle: "Job Openings (JOLTS)", context: ">8M very tight · 7–8M tight · 6–7M balanced · <6M softening" },
};

function HealthCard({ id, label, metric }: { id: string; label: string; metric: HealthMetric | null }) {
  const meta = HEALTH_META[id];
  if (!metric) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
        <div className="text-xs font-semibold text-zinc-400">{label}</div>
        <div className="text-2xl font-bold text-zinc-600">N/A</div>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border bg-zinc-900 p-5 flex flex-col gap-3 ${sigBorder(metric.signal)}`}>
      <div>
        <div className="text-xs font-semibold text-zinc-400">{meta.subtitle}</div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className={`text-3xl font-bold tabular-nums ${sigText(metric.signal)}`}>
            {metric.formattedValue}
          </div>
          {metric.date && (
            <div className="text-[10px] text-zinc-600 mt-0.5">As of {formatDate(metric.date)}</div>
          )}
        </div>
        <StatusBadge signal={metric.signal} status={metric.status} />
      </div>
      <div className="text-[10px] text-zinc-600 leading-relaxed border-t border-zinc-800 pt-2">
        {meta.context}
      </div>
    </div>
  );
}

// ─── Full suite table ─────────────────────────────────────────────────────────
function SuiteTable({ rows }: { rows: SuiteRow[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[2.5fr_1fr_0.7fr_1.2fr] gap-x-4 px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Indicator</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 text-right">Latest Value</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Source</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Signal</span>
      </div>

      {rows.map((row, idx) => (
        <div
          key={row.id}
          className={`grid grid-cols-[2.5fr_1fr_0.7fr_1.2fr] gap-x-4 px-4 py-3 items-center ${idx < rows.length - 1 ? "border-b border-zinc-800/60" : ""} hover:bg-zinc-800/20 transition-colors`}
        >
          {/* Name */}
          <div className="flex items-center gap-2.5">
            <SignalDot signal={row.signal} />
            <span className="text-sm font-medium text-zinc-200">{row.name}</span>
          </div>

          {/* Value */}
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
              <div>
                <span className="text-xs text-zinc-600">—</span>
                {row.unavailableReason && (
                  <div className="text-[10px] text-zinc-700 mt-0.5 whitespace-nowrap">{row.unavailableReason}</div>
                )}
              </div>
            )}
          </div>

          {/* Source */}
          <div className="text-xs text-zinc-400">{row.source}</div>

          {/* Signal badge */}
          <div>
            <StatusBadge signal={row.signal} status={row.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function LaborSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
        ))}
      </div>
      <div className="h-96 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LaborPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<LaborTabData>({
    queryKey: ["tab-labor-v2"],
    queryFn: () => apiFetch<LaborTabData>("/api/macro/tab/labor"),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <LaborSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="text-zinc-400 text-sm mb-2">Failed to load labor market data</div>
        <button onClick={() => refetch()} className="text-xs text-blue-400 hover:text-blue-300 underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Labor Market</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Employment, wages, and workforce participation indicators
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
          A · Labor Market Health
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HealthCard id="nfpMoM" label="Nonfarm Payrolls"         metric={data.health.nfpMoM}  />
          <HealthCard id="unrate" label="Unemployment Rate"        metric={data.health.unrate}  />
          <HealthCard id="aweYoY" label="Avg Hourly Earnings"      metric={data.health.aweYoY}  />
          <HealthCard id="jolts"  label="Job Openings (JOLTS)"     metric={data.health.jolts}   />
        </div>
      </div>

      {/* Section B */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          B · Full Labor Data Suite
        </div>
        <SuiteTable rows={data.suite} />
      </div>

      {/* Footer */}
      <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-4 flex items-center justify-between">
        <span>BLS · ADP · DOL · FRED · For informational purposes only</span>
        <span className="text-zinc-700">
          Updated {new Date(data.lastRefreshed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
