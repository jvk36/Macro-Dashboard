import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { KeyReadingsTable } from "@/components/KeyReadingsTable";
import { SignalCard } from "@/components/SignalCard";
import { MarketCycleGauge } from "@/components/MarketCycleGauge";
import { YieldCurveChart } from "@/components/YieldCurveChart";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Signal = "positive" | "neutral" | "negative" | "warning";

interface OverviewData {
  keyReadings: Array<{
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
  }>;
  signals: Array<{
    id: string;
    label: string;
    value: number;
    unit: string;
    signal: Signal;
    signalLabel: string;
    interpretation: string;
    detail?: string;
    lastUpdated: string;
  }>;
  marketCycle: {
    phase: "early_expansion" | "mid_expansion" | "late_expansion" | "early_contraction" | "recession" | "recovery";
    label: string;
    confidence: number;
    description: string;
  };
  lastRefreshed: string;
}

interface YieldCurveData {
  points: Array<{ maturity: string; years: number; yield: number }>;
  spread2s10s: number;
  spread3m10y: number;
  isInverted: boolean;
  signal: Signal;
  interpretation: string;
  asOf: string;
}

export default function OverviewPage() {
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery<OverviewData>({
    queryKey: ["overview"],
    queryFn: () => apiFetch<OverviewData>("/api/macro/overview"),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: yieldCurve, isLoading: yieldLoading } = useQuery<YieldCurveData>({
    queryKey: ["yield-curve"],
    queryFn: () => apiFetch<YieldCurveData>("/api/macro/yield-curve"),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (overviewError && !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="rounded-full bg-red-900/30 p-4 mb-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-200 mb-2">Failed to load data</h2>
        <p className="text-sm text-zinc-400 mb-4">Could not connect to the data service. Check your FRED API key.</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Overview</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Key macroeconomic readings at a glance — live data from FRED &amp; public sources
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          {dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : "Refresh"}
        </button>
      </div>

      {/* Section A: Key Readings At a Glance */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          A &nbsp;·&nbsp; Latest Key Readings At a Glance
        </h2>
        <KeyReadingsTable
          readings={overview?.keyReadings ?? []}
          isLoading={overviewLoading}
        />
      </section>

      {/* Section B: Signal Dashboard */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          B &nbsp;·&nbsp; Signal Dashboard
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overviewLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <SignalCard
                  key={i}
                  id=""
                  label=""
                  value={0}
                  unit=""
                  signal="neutral"
                  signalLabel=""
                  interpretation=""
                  lastUpdated=""
                  isLoading
                />
              ))
            : overview?.signals.map((s) => (
                <SignalCard key={s.id} {...s} />
              ))}
        </div>
      </section>

      {/* Section C: Market Cycle + Yield Curve */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          C &nbsp;·&nbsp; Market Cycle &amp; Yield Curve
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MarketCycleGauge
            phase={overview?.marketCycle.phase ?? "mid_expansion"}
            label={overview?.marketCycle.label ?? ""}
            confidence={overview?.marketCycle.confidence ?? 0}
            description={overview?.marketCycle.description ?? ""}
            isLoading={overviewLoading}
          />
          <YieldCurveChart
            points={yieldCurve?.points ?? []}
            spread2s10s={yieldCurve?.spread2s10s ?? 0}
            isInverted={yieldCurve?.isInverted ?? false}
            isLoading={yieldLoading}
          />
        </div>
      </section>

      {/* Footer */}
      <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-4">
        Data sourced from FRED (Federal Reserve Bank of St. Louis) · Updated {overview?.lastRefreshed ? formatDate(overview.lastRefreshed.split("T")[0]) : "—"} ·{" "}
        <span className="text-zinc-700">For informational purposes only. Not investment advice.</span>
      </div>
    </div>
  );
}
