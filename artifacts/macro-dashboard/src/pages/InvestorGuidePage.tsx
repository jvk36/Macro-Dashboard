// ─── DIY Investor Guide ───────────────────────────────────────────────────────

interface Indicator {
  id: string;
  title: string;
  tagline: string;
  body: string;
  source: string;
  cadence: string;
  icon: string;
}

const INDICATORS: Indicator[] = [
  {
    id: "pmi",
    title: "PMI (Purchasing Managers' Index)",
    tagline: "Above 50 = expansion · Below 50 = contraction",
    body: "A survey of corporate purchasing managers that measures new orders, production, employment, and supplier delivery times. One of the fastest leading indicators available — released on the first business day of every month. Compare manufacturing vs. services to see where the economy is bifurcating: divergence often signals a sector-specific slowdown before it shows up in GDP.",
    source: "ISM (US) · S&P Global (global)",
    cadence: "Released: Monthly (1st business day)",
    icon: "📊",
  },
  {
    id: "yield-curve",
    title: "Yield Curve (2s10s Spread)",
    tagline: "Inverted = historically a recession warning",
    body: "The difference between the 10-year and 2-year Treasury yields. When negative (inverted), it has preceded every US recession in modern history by 6–18 months. It is not a timing tool — inversion can persist for 12–24 months before a downturn materialises. Watch for re-steepening after inversion as the more actionable signal: that often marks the start of the deterioration phase, not the end.",
    source: "Federal Reserve / US Treasury",
    cadence: "Watch: Daily",
    icon: "📉",
  },
  {
    id: "nfp",
    title: "Nonfarm Payrolls (NFP)",
    tagline: "The single most market-moving monthly release",
    body: "Released the first Friday of every month. Above ~150K additions is generally consistent with a healthy labour market; below 100K signals softening; negative prints signal contraction. The headline number is only the starting point — watch average hourly earnings (wage inflation) and the U-6 underemployment rate for a fuller picture of labour market slack and inflation pressure.",
    source: "BLS (Bureau of Labor Statistics)",
    cadence: "Released: First Friday of each month",
    icon: "👷",
  },
  {
    id: "pce-cpi",
    title: "PCE vs. CPI — What's the Difference?",
    tagline: "The Fed targets PCE, not CPI",
    body: "PCE (Personal Consumption Expenditures) adjusts for consumer substitution — if beef gets expensive, people buy chicken, and PCE captures that shift. CPI does not. As a result, PCE tends to run 0.3–0.5% lower than CPI. Core PCE (ex-food & energy) is the single most important inflation number for Fed policy decisions. When reading CPI headlines, mentally subtract ~0.3–0.5% to estimate what the Fed is actually seeing.",
    source: "BEA (Bureau of Economic Analysis)",
    cadence: "Released: Monthly, ~4 weeks after month-end",
    icon: "💹",
  },
  {
    id: "credit-spreads",
    title: "Credit Spreads",
    tagline: "Tightening = risk-on · Widening = risk-off",
    body: "The extra yield investors demand to hold corporate bonds over risk-free Treasuries. High-yield (junk) spreads above 500–600bps have historically signalled recession stress and equity drawdowns. Credit markets often price in deterioration before equity markets react — watch HY spreads as an early warning system for equities. A rapid widening of 100–150bps in a short period warrants attention regardless of the absolute level.",
    source: "ICE BofA Index · Bloomberg / FRED",
    cadence: "Watch: Weekly",
    icon: "🏦",
  },
  {
    id: "leading-lagging",
    title: "Leading vs. Lagging Indicators",
    tagline: "Build your view on leading data; validate with coincident",
    body: "Leading indicators signal what is coming: PMIs, the Conference Board LEI, yield curve, building permits, and initial jobless claims all tend to turn before the broader economy. Coincident indicators confirm current state: payrolls, industrial production, and retail sales move with the cycle. Lagging indicators confirm what already happened: GDP (revised), the unemployment rate, and CPI typically peak and trough after turning points. Most investors over-weight lagging data and under-weight leading signals.",
    source: "Conference Board framework",
    cadence: "Classification: varies by indicator",
    icon: "🔭",
  },
];

interface CalendarRow {
  frequency: string;
  badge: string;
  badgeColor: string;
  releases: string[];
}

const CALENDAR: CalendarRow[] = [
  {
    frequency: "Weekly",
    badge: "Every week",
    badgeColor: "text-blue-400 border-blue-500/30",
    releases: [
      "Initial jobless claims (Thursday)",
      "Continuing claims (Thursday)",
      "Baker Hughes rig count (Friday)",
      "Fed balance sheet (Thursday)",
    ],
  },
  {
    frequency: "Monthly",
    badge: "Every month",
    badgeColor: "text-emerald-400 border-emerald-500/30",
    releases: [
      "Nonfarm Payrolls / NFP (1st Friday)",
      "CPI — Consumer Price Index (mid-month)",
      "PPI — Producer Price Index (mid-month)",
      "Retail Sales",
      "JOLTS — Job Openings",
      "PCE / Core PCE (end of month)",
      "PMIs — ISM Manufacturing & Services (1st business days)",
      "Housing Starts & Building Permits",
      "Industrial Production",
      "Consumer Confidence (Conference Board)",
      "Michigan Consumer Sentiment",
    ],
  },
  {
    frequency: "Quarterly",
    badge: "Every quarter",
    badgeColor: "text-amber-400 border-amber-500/30",
    releases: [
      "GDP — advance → second → final estimate",
      "FOMC dot plot & Summary of Economic Projections",
      "Corporate earnings season (major indices)",
      "Employment Cost Index (ECI)",
      "Productivity & Unit Labour Costs",
    ],
  },
  {
    frequency: "As Needed",
    badge: "Scheduled events",
    badgeColor: "text-zinc-400 border-zinc-600/50",
    releases: [
      "FOMC rate decisions (8× per year)",
      "Fed Chair press conferences (post-FOMC)",
      "Fed Beige Book (8× per year, ~2 weeks before FOMC)",
      "IMF World Economic Outlook (April & October)",
      "Jackson Hole Economic Symposium (August)",
      "Treasury quarterly refunding announcements",
    ],
  },
];

// ─── Indicator Card ────────────────────────────────────────────────────────────
function IndicatorCard({ ind }: { ind: Indicator }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{ind.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-zinc-100 leading-snug">{ind.title}</h3>
          <p className="text-[11px] text-blue-400 mt-0.5 font-medium">{ind.tagline}</p>
        </div>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">{ind.body}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-zinc-800">
        <span className="text-[10px] text-zinc-600">
          <span className="text-zinc-500 font-medium">Source:</span> {ind.source}
        </span>
        <span className="text-[10px] text-zinc-600">
          <span className="text-zinc-500 font-medium">{ind.cadence}</span>
        </span>
      </div>
    </div>
  );
}

// ─── Calendar Table ────────────────────────────────────────────────────────────
function CalendarTable() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="grid grid-cols-[160px_1fr] gap-x-4 px-5 py-2.5 border-b border-zinc-800 bg-zinc-950">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Frequency</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Key Releases</span>
      </div>
      {CALENDAR.map((row, idx) => (
        <div
          key={row.frequency}
          className={`grid grid-cols-[160px_1fr] gap-x-4 px-5 py-4 items-start ${idx < CALENDAR.length - 1 ? "border-b border-zinc-800/60" : ""} hover:bg-zinc-800/20 transition-colors`}
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-zinc-200">{row.frequency}</span>
            <span
              className={`inline-flex items-center self-start px-2 py-0.5 rounded-full text-[10px] font-medium border ${row.badgeColor}`}
              style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
            >
              {row.badge}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            {row.releases.map((rel) => (
              <div key={rel} className="flex items-center gap-1.5 min-w-[240px]">
                <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                <span className="text-xs text-zinc-400">{rel}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InvestorGuidePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">DIY Investor Guide</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          How to read macroeconomic indicators and when to watch them
        </p>
      </div>

      {/* Section A */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          A · How To Read Each Indicator
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INDICATORS.map((ind) => (
            <IndicatorCard key={ind.id} ind={ind} />
          ))}
        </div>
      </div>

      {/* Section B */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          B · Data Release Calendar
        </div>
        <CalendarTable />
      </div>

      {/* Footer */}
      <div className="text-[10px] text-zinc-700 pt-1">
        For informational and educational purposes only. Not financial advice.
      </div>
    </div>
  );
}
