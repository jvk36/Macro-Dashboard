import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type FinSig = "positive" | "neutral" | "warning" | "negative" | null;

interface RateCard {
  value: number;
  formattedValue: string;
  date: string;
  signal: FinSig;
  status: string;
  context: string;
}

interface SuiteRow {
  id: string;
  name: string;
  value: number | null;
  formattedValue: string;
  source: string;
  signal: FinSig;
  status: string | null;
  date: string | null;
  available: boolean;
  whyItMatters: string;
  unavailableReason?: string;
  note?: string;
}

interface FinancialTabData {
  rates: {
    ff: RateCard | null;
    t2y: RateCard | null;
    t10y: RateCard | null;
    spread: RateCard | null;
  };
  suite: SuiteRow[];
  lastRefreshed: string;
}

// ─── Signal palette ───────────────────────────────────────────────────────────
const SIG: Record<NonNullable<FinSig>, { text: string; bg: string; border: string; dot: string }> = {
  positive: { text: "text-emerald-400", bg: "rgba(52,211,153,0.12)",  border: "border-emerald-500/30", dot: "bg-emerald-400" },
  neutral:  { text: "text-blue-400",    bg: "rgba(96,165,250,0.12)",  border: "border-blue-500/30",    dot: "bg-blue-400" },
  warning:  { text: "text-amber-400",   bg: "rgba(251,191,36,0.12)",  border: "border-amber-500/30",   dot: "bg-amber-400" },
  negative: { text: "text-red-400",     bg: "rgba(248,113,113,0.12)", border: "border-red-500/30",     dot: "bg-red-400" },
};

function sigText(s: FinSig)   { return s ? SIG[s].text   : "text-zinc-400"; }
function sigBorder(s: FinSig) { return s ? SIG[s].border : "border-zinc-700"; }

function StatusBadge({ signal, status }: { signal: FinSig; status: string | null }) {
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

function SignalDot({ signal }: { signal: FinSig }) {
  return <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${signal ? SIG[signal].dot : "bg-zinc-700"}`} />;
}

// ─── Section A Card ───────────────────────────────────────────────────────────
const CARD_META: Record<string, { subtitle: string }> = {
  ff:     { subtitle: "Fed Funds Rate" },
  t2y:    { subtitle: "2Y Treasury Yield" },
  t10y:   { subtitle: "10Y Treasury Yield" },
  spread: { subtitle: "2s10s Yield Spread" },
};

function RateCardView({ id, card }: { id: string; card: RateCard | null }) {
  const meta = CARD_META[id];
  if (!card) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
        <div className="text-xs font-semibold text-zinc-400">{meta.subtitle}</div>
        <div className="text-2xl font-bold text-zinc-600">N/A</div>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border bg-zinc-900 p-5 flex flex-col gap-3 ${sigBorder(card.signal)}`}>
      <div className="text-xs font-semibold text-zinc-400">{meta.subtitle}</div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className={`text-3xl font-bold tabular-nums ${sigText(card.signal)}`}>
            {card.formattedValue}
          </div>
          {card.date && (
            <div className="text-[10px] text-zinc-600 mt-0.5">As of {formatDate(card.date)}</div>
          )}
        </div>
        <StatusBadge signal={card.signal} status={card.status} />
      </div>
      <div className="text-[10px] text-zinc-600 leading-relaxed border-t border-zinc-800 pt-2">
        {card.context}
      </div>
    </div>
  );
}

// ─── Section B Table ──────────────────────────────────────────────────────────
function SuiteTable({ rows }: { rows: SuiteRow[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="grid grid-cols-[2.2fr_1fr_1fr_0.9fr_2.8fr] gap-x-3 px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Indicator</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 text-right">Latest</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Source</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Signal</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">What to Watch</span>
      </div>

      {rows.map((row, idx) => (
        <div
          key={row.id}
          className={`grid grid-cols-[2.2fr_1fr_1fr_0.9fr_2.8fr] gap-x-3 px-4 py-3 items-start ${idx < rows.length - 1 ? "border-b border-zinc-800/60" : ""} hover:bg-zinc-800/20 transition-colors`}
        >
          {/* Name */}
          <div className="flex items-center gap-2.5 pt-0.5">
            <SignalDot signal={row.signal} />
            <div>
              <span className="text-sm font-medium text-zinc-200">{row.name}</span>
              {row.note && (
                <span className="ml-2 text-[10px] text-zinc-600">{row.note}</span>
              )}
            </div>
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
                  <div className="text-[10px] text-zinc-700 mt-0.5">{row.unavailableReason}</div>
                )}
              </div>
            )}
          </div>

          {/* Source */}
          <div className="text-xs text-zinc-400 pt-0.5">{row.source}</div>

          {/* Signal badge */}
          <div className="pt-0.5">
            <StatusBadge signal={row.signal} status={row.status} />
          </div>

          {/* What to Watch */}
          <div className="text-xs text-zinc-500 leading-relaxed">{row.whyItMatters}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function FinancialSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
        ))}
      </div>
      <div className="h-[520px] rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FinancialPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<FinancialTabData>({
    queryKey: ["tab-financial-v2"],
    queryFn: () => apiFetch<FinancialTabData>("/api/macro/tab/financial"),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <FinancialSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="text-zinc-400 text-sm mb-2">Failed to load financial conditions data</div>
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
          <h1 className="text-xl font-bold text-zinc-100">Financial Conditions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Interest rates, credit spreads, volatility, and monetary policy indicators
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
          A · Fed &amp; Interest Rates
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <RateCardView id="ff"     card={data.rates.ff}     />
          <RateCardView id="t2y"   card={data.rates.t2y}    />
          <RateCardView id="t10y"  card={data.rates.t10y}   />
          <RateCardView id="spread" card={data.rates.spread} />
        </div>
      </div>

      {/* Section B */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          B · Financial Conditions Indicators
        </div>
        <SuiteTable rows={data.suite} />
      </div>

      {/* Footer */}
      <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-4 flex items-center justify-between">
        <span>FRED · FOMC · ICE BofA · CBOE · Freddie Mac · EIA · Chicago Fed · For informational purposes only</span>
        <span className="text-zinc-700">
          Updated {new Date(data.lastRefreshed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
