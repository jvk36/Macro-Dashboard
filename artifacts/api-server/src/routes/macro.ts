import { Router, type IRouter } from "express";
import {
  buildSeriesHistory,
  getLatestValue,
  getObservations,
  getSeriesInfo,
} from "../lib/fred";

const router: IRouter = Router();

const SERIES = {
  GDP: "A191RL1Q225SBEA",
  CPI: "CPIAUCSL",
  CORE_CPI: "CPILFESL",
  PCE: "PCEPI",
  CORE_PCE: "PCEPILFE",
  PPI: "PPIACO",
  UNRATE: "UNRATE",
  FED_FUNDS: "FEDFUNDS",
  T10Y: "DGS10",
  T2Y: "DGS2",
  T3M: "DGS3MO",
  T1Y: "DGS1",
  T5Y: "DGS5",
  T7Y: "DGS7",
  T20Y: "DGS20",
  T30Y: "DGS30",
  T10Y2Y: "T10Y2Y",
  T10Y3M: "T10Y3M",
  HY_SPREAD: "BAMLH0A0HYM2",
  IG_SPREAD: "BAMLC0A0CM",
  NFP: "PAYEMS",
  ISM_MFG: "INDPRO",
  INITIAL_CLAIMS: "ICSA",
  CONT_CLAIMS: "CCSA",
  JOLTS: "JTSJOL",
  PARTICIPATION: "CIVPART",
  AWE: "CES0500000003",
  IP: "INDPRO",
  RETAIL: "RSAFS",
  RETAIL_EX_AUTO: "RSXFS",
  DURABLE_GOODS: "DGORDER",
  BUILDING_PERMITS: "PERMIT",
  CB_LEI: "USSLIND",
  OECD_MFG_CONF: "BSCICP03USM665S",
  OECD_CLI: "USALOLITONOSTSAM",
  CFNAI: "CFNAIMA3",
  BREAKEVEN_5Y: "T5YIE",
  BREAKEVEN_10Y: "T10YIE",
  RECESSION_PROB: "RECPROUSM156N",
  CONSUMER_SENTIMENT: "UMCSENT",
};

function classifySignal(
  value: number,
  thresholds: { positive: [number, number]; neutral: [number, number]; negative: [number, number]; warning?: [number, number] },
): "positive" | "neutral" | "negative" | "warning" {
  if (value >= thresholds.positive[0] && value <= thresholds.positive[1]) return "positive";
  if (value >= thresholds.neutral[0] && value <= thresholds.neutral[1]) return "neutral";
  if (thresholds.warning && value >= thresholds.warning[0] && value <= thresholds.warning[1]) return "warning";
  return "negative";
}

router.get("/macro/overview", async (req, res) => {
  try {
    const [
      gdpData,
      cpiData,
      unrateData,
      fedFundsData,
      t10yData,
      t2yData,
      ismData,
      hySpreadData,
      nfpData,
      t10y2yData,
      recProbData,
    ] = await Promise.all([
      getLatestValue(SERIES.GDP),
      getObservations(SERIES.CPI, 15),
      getLatestValue(SERIES.UNRATE),
      getLatestValue(SERIES.FED_FUNDS),
      getLatestValue(SERIES.T10Y),
      getLatestValue(SERIES.T2Y),
      getLatestValue(SERIES.ISM_MFG),
      getLatestValue(SERIES.HY_SPREAD),
      getObservations(SERIES.NFP, 3),
      getLatestValue(SERIES.T10Y2Y),
      getLatestValue(SERIES.RECESSION_PROB),
    ]);

    const cpiValid = cpiData.filter((o) => o.value !== ".").map((o) => parseFloat(o.value));
    const cpiYoY =
      cpiValid.length >= 13
        ? ((cpiValid[cpiValid.length - 1] - cpiValid[cpiValid.length - 13]) / cpiValid[cpiValid.length - 13]) * 100
        : null;
    const cpiLatestDate = cpiData[cpiData.length - 1]?.date ?? "";

    const nfpValid = nfpData.filter((o) => o.value !== ".").map((o) => ({ date: o.date, value: parseFloat(o.value) }));
    const nfpChange =
      nfpValid.length >= 2
        ? nfpValid[nfpValid.length - 1].value - nfpValid[nfpValid.length - 2].value
        : null;
    const nfpDate = nfpValid[nfpValid.length - 1]?.date ?? "";

    const t10yPrevData = await getObservations(SERIES.T10Y, 60);
    const t10yObs = t10yPrevData.filter((o) => o.value !== ".");
    const t10yPrev = t10yObs.length >= 22 ? parseFloat(t10yObs[t10yObs.length - 22].value) : null;
    const t10yMoMChange = t10yPrev ? t10yData.value - t10yPrev : null;

    const spread2s10s = t10y2yData.value * 100;
    const isInverted = spread2s10s < 0;

    const gdpSignal: "positive" | "neutral" | "negative" =
      gdpData.value >= 2.5 ? "positive" : gdpData.value >= 0 ? "neutral" : "negative";

    const cpiSignal: "positive" | "neutral" | "negative" | "warning" =
      cpiYoY === null ? "neutral"
        : cpiYoY <= 2.5 ? "positive"
        : cpiYoY <= 4 ? "warning"
        : "negative";

    const unrateSignal: "positive" | "neutral" | "negative" =
      unrateData.value <= 4.5 ? "positive" : unrateData.value <= 6 ? "neutral" : "negative";

    const fedSignal: "positive" | "neutral" | "negative" =
      fedFundsData.value <= 2.5 ? "positive" : fedFundsData.value <= 5 ? "neutral" : "negative";

    const t10ySignal: "positive" | "neutral" | "negative" | "warning" =
      t10yMoMChange === null ? "neutral"
        : t10yMoMChange < -0.1 ? "positive"
        : t10yMoMChange < 0.1 ? "neutral"
        : t10yMoMChange < 0.3 ? "warning"
        : "negative";

    const ipObs = await getObservations(SERIES.ISM_MFG, 14);
    const ipParsed = ipObs.filter((o) => o.value !== ".").map((o) => parseFloat(o.value));
    const ipYoY = ipParsed.length >= 13
      ? ((ipParsed[ipParsed.length - 1] - ipParsed[ipParsed.length - 13]) / ipParsed[ipParsed.length - 13]) * 100
      : null;
    const ipLatestDate = ipObs[ipObs.length - 1]?.date ?? "";
    const ipValue = ipYoY ?? 0;

    const ismSignal: "positive" | "neutral" | "negative" =
      ipValue >= 2 ? "positive" : ipValue >= -1 ? "neutral" : "negative";

    const keyReadings = [
      {
        id: "gdp",
        label: "GDP Growth (Annualized)",
        value: gdpData.value,
        unit: "%",
        signal: gdpSignal,
        signalLabel: gdpData.value >= 2.5 ? "Expansion" : gdpData.value >= 0 ? "Neutral" : "Recessionary",
        description: "Real GDP annualized growth rate",
        lastUpdated: gdpData.date,
        previousValue: null,
        change: null,
      },
      {
        id: "cpi",
        label: "CPI (YoY)",
        value: cpiYoY ?? 0,
        unit: "%",
        signal: cpiSignal,
        signalLabel:
          cpiYoY === null ? "N/A"
            : cpiYoY <= 2.0 ? "Below Target"
            : cpiYoY <= 2.5 ? "At Target"
            : "Above Target",
        description: "Consumer Price Index year-over-year change vs 2% Fed target",
        lastUpdated: cpiLatestDate,
      },
      {
        id: "unrate",
        label: "Unemployment Rate",
        value: unrateData.value,
        unit: "%",
        signal: unrateSignal,
        signalLabel:
          unrateData.value <= 4.0 ? "Full Employment"
            : unrateData.value <= 5.0 ? "Near Full"
            : unrateData.value <= 6.5 ? "Elevated"
            : "High Unemployment",
        description: "Civilian unemployment rate",
        lastUpdated: unrateData.date,
      },
      {
        id: "fedfunds",
        label: "Fed Funds Rate",
        value: fedFundsData.value,
        unit: "%",
        signal: fedSignal,
        signalLabel:
          fedFundsData.value <= 1.5 ? "Accommodative"
            : fedFundsData.value <= 3.5 ? "Neutral"
            : "Restrictive",
        description: "Federal Funds Effective Rate",
        lastUpdated: fedFundsData.date,
      },
      {
        id: "t10y",
        label: "10-Year Treasury Yield",
        value: t10yData.value,
        unit: "%",
        signal: t10ySignal,
        signalLabel:
          t10yMoMChange === null ? "N/A"
            : t10yMoMChange >= 0.1 ? `+${t10yMoMChange.toFixed(2)}% MoM`
            : t10yMoMChange <= -0.1 ? `${t10yMoMChange.toFixed(2)}% MoM`
            : "Stable MoM",
        description: "10-Year US Treasury yield, month-over-month change",
        lastUpdated: t10yData.date,
        change: t10yMoMChange,
      },
      {
        id: "indpro",
        label: "Industrial Production (YoY)",
        value: ipValue,
        unit: "%",
        signal: ismSignal,
        signalLabel:
          ipValue >= 2 ? "Expansion" : ipValue >= -1 ? "Neutral" : "Contraction",
        description: "Industrial Production Index, year-over-year change",
        lastUpdated: ipLatestDate,
      },
    ];

    const yieldCurveSignal: "positive" | "neutral" | "negative" | "warning" =
      spread2s10s >= 50 ? "positive"
        : spread2s10s >= 0 ? "neutral"
        : spread2s10s >= -50 ? "warning"
        : "negative";

    // FRED BAMLH0A0HYM2 is in percent (e.g. 3.5 = 3.5% = 350 bps)
    const hySpreadBps = hySpreadData.value * 100;
    const hySignal: "positive" | "neutral" | "negative" | "warning" =
      hySpreadBps <= 350 ? "positive"
        : hySpreadBps <= 500 ? "neutral"
        : hySpreadBps <= 700 ? "warning"
        : "negative";

    // PAYEMS is in thousands of employees; nfpChange is therefore in thousands (200 = 200K jobs)
    const laborSignal: "positive" | "neutral" | "negative" | "warning" =
      nfpChange === null ? "neutral"
        : nfpChange >= 200 ? "positive"
        : nfpChange >= 100 ? "neutral"
        : nfpChange >= 0 ? "warning"
        : "negative";

    const recSignal: "positive" | "neutral" | "negative" | "warning" =
      recProbData.value <= 15 ? "positive"
        : recProbData.value <= 30 ? "neutral"
        : recProbData.value <= 50 ? "warning"
        : "negative";

    const signals = [
      {
        id: "yield_curve",
        label: "Yield Curve (2s10s)",
        value: spread2s10s,
        unit: "bps",
        signal: yieldCurveSignal,
        signalLabel: isInverted ? "Inverted" : "Normal",
        interpretation: isInverted
          ? "The 2-10 yield curve is inverted, historically a leading indicator of recession. Investors demand more yield for short-term risk than long-term, signaling tight financial conditions."
          : spread2s10s < 50
          ? "The yield curve is flat-to-normal. Modest term premium suggests cautious growth expectations with no near-term recession signal."
          : "A positively sloped yield curve signals healthy growth expectations and accommodative conditions for banks.",
        detail: `${spread2s10s >= 0 ? "+" : ""}${spread2s10s.toFixed(0)} bps`,
        lastUpdated: t10y2yData.date,
      },
      {
        id: "hy_spreads",
        label: "Credit Spreads (HY OAS)",
        value: hySpreadBps,
        unit: "bps",
        signal: hySignal,
        signalLabel:
          hySpreadBps <= 350 ? "Tight (Risk-On)"
            : hySpreadBps <= 500 ? "Normal"
            : hySpreadBps <= 700 ? "Widening (Caution)"
            : "Wide (Stress)",
        interpretation:
          hySpreadBps <= 350
            ? `HY credit spreads are tight at ${hySpreadBps.toFixed(0)} bps, reflecting strong investor risk appetite and easy credit conditions. Typically supportive of equities.`
            : hySpreadBps <= 500
            ? `HY credit spreads (${hySpreadBps.toFixed(0)} bps) are near historical norms. Credit conditions are balanced with moderate risk appetite.`
            : hySpreadBps <= 700
            ? `HY spreads at ${hySpreadBps.toFixed(0)} bps are widening, signaling rising credit stress and potential tightening of financial conditions. Monitor closely.`
            : `HY spreads are elevated at ${hySpreadBps.toFixed(0)} bps, indicating significant credit stress. Historically associated with economic contraction.`,
        detail: `${hySpreadBps.toFixed(0)} bps`,
        lastUpdated: hySpreadData.date,
      },
      {
        id: "labor",
        label: "Labor Market (NFP MoM)",
        value: nfpChange ?? 0,
        unit: "K",
        signal: laborSignal,
        signalLabel:
          nfpChange === null ? "N/A"
            : nfpChange >= 200 ? "Strong"
            : nfpChange >= 100 ? "Moderate"
            : nfpChange >= 0 ? "Weak"
            : "Contracting",
        interpretation:
          nfpChange === null
            ? "NFP data unavailable."
            : nfpChange >= 200
            ? `Non-farm payrolls added ${nfpChange.toFixed(0)}K jobs, well above the ~150K needed to absorb new entrants. Labor market remains robust.`
            : nfpChange >= 100
            ? `Non-farm payrolls added ${nfpChange.toFixed(0)}K jobs — sufficient to maintain a stable labor market but below robust growth thresholds.`
            : nfpChange >= 0
            ? `Non-farm payrolls added only ${nfpChange.toFixed(0)}K jobs, below the pace needed to sustain labor market health. Weakness emerging.`
            : `Non-farm payrolls contracted by ${Math.abs(nfpChange).toFixed(0)}K jobs — a significant warning sign of labor market deterioration.`,
        detail: `${nfpChange !== null ? (nfpChange >= 0 ? "+" : "") + nfpChange.toFixed(0) + "K" : "N/A"}`,
        lastUpdated: nfpDate,
      },
      {
        id: "recession_prob",
        label: "Recession Probability",
        value: recProbData.value,
        unit: "%",
        signal: recSignal,
        signalLabel:
          recProbData.value <= 15 ? "Low Risk"
            : recProbData.value <= 30 ? "Elevated"
            : recProbData.value <= 50 ? "High Risk"
            : "Recessionary",
        interpretation:
          recProbData.value <= 15
            ? `NY Fed model puts 12-month recession probability at ${recProbData.value.toFixed(1)}% — historically consistent with continued expansion.`
            : recProbData.value <= 30
            ? `NY Fed model shows ${recProbData.value.toFixed(1)}% recession probability — elevated but not alarming. Warrants monitoring.`
            : recProbData.value <= 50
            ? `NY Fed model signals ${recProbData.value.toFixed(1)}% recession risk — historically a warning threshold. Defensive positioning warranted.`
            : `NY Fed model indicates ${recProbData.value.toFixed(1)}% recession probability — above the 50% level historically consistent with recession.`,
        detail: `${recProbData.value.toFixed(1)}%`,
        lastUpdated: recProbData.date,
      },
    ];

    const gdpValue = gdpData.value;
    const cpiValue = cpiYoY ?? 0;
    const recProb = recProbData.value;

    let phase: "early_expansion" | "mid_expansion" | "late_expansion" | "early_contraction" | "recession" | "recovery";
    let cycleLabel: string;
    let cycleDescription: string;
    let confidence = 0;

    if (recProb > 50 || gdpValue < -1) {
      phase = "recession";
      cycleLabel = "Recession";
      cycleDescription = "Economic output is contracting. Risk assets typically underperform. Bonds and defensives outperform.";
      confidence = Math.min(90, recProb);
    } else if (recProb > 30 || gdpValue < 0.5) {
      phase = "early_contraction";
      cycleLabel = "Late Cycle / Contraction Risk";
      cycleDescription = "Growth is slowing with elevated recession risk. Consider reducing cyclical exposure and increasing quality.";
      confidence = 60;
    } else if (gdpValue >= 2.5 && cpiValue > 3.5 && fedFundsData.value > 3) {
      phase = "late_expansion";
      cycleLabel = "Late Cycle Expansion";
      cycleDescription = "Strong growth but inflation is elevated and monetary policy is tightening. Historically favors commodities and value over growth.";
      confidence = 70;
    } else if (gdpValue >= 1.5 && cpiValue <= 3.5) {
      phase = "mid_expansion";
      cycleLabel = "Mid-Cycle Expansion";
      cycleDescription = "Solid growth with contained inflation — the 'Goldilocks' scenario. Broadly supportive of equities, especially cyclicals.";
      confidence = 75;
    } else {
      phase = "early_expansion";
      cycleLabel = "Early Expansion / Recovery";
      cycleDescription = "Economy is recovering with slack remaining. Monetary policy likely accommodative. Cyclicals and small caps tend to outperform.";
      confidence = 60;
    }

    res.json({
      keyReadings,
      signals,
      marketCycle: {
        phase,
        label: cycleLabel,
        confidence,
        description: cycleDescription,
      },
      lastRefreshed: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch overview data");
    res.status(500).json({ error: "Failed to fetch overview data" });
  }
});

router.get("/macro/series/:seriesId", async (req, res) => {
  try {
    const { seriesId } = req.params;
    const limit = parseInt(req.query["limit"] as string ?? "60", 10);
    const data = await buildSeriesHistory(seriesId, limit);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch series history");
    res.status(500).json({ error: "Failed to fetch series data" });
  }
});

router.get("/macro/yield-curve", async (req, res) => {
  try {
    const maturities = [
      { maturity: "3M", years: 0.25, seriesId: SERIES.T3M },
      { maturity: "1Y", years: 1, seriesId: SERIES.T1Y },
      { maturity: "2Y", years: 2, seriesId: SERIES.T2Y },
      { maturity: "5Y", years: 5, seriesId: SERIES.T5Y },
      { maturity: "7Y", years: 7, seriesId: SERIES.T7Y },
      { maturity: "10Y", years: 10, seriesId: SERIES.T10Y },
      { maturity: "20Y", years: 20, seriesId: SERIES.T20Y },
      { maturity: "30Y", years: 30, seriesId: SERIES.T30Y },
    ];

    const [points2s10s, points3m10y, ...maturityValues] = await Promise.all([
      getLatestValue(SERIES.T10Y2Y),
      getLatestValue(SERIES.T10Y3M),
      ...maturities.map((m) => getLatestValue(m.seriesId)),
    ]);

    const curvePoints = maturities.map((m, i) => ({
      maturity: m.maturity,
      years: m.years,
      yield: maturityValues[i].value,
    }));

    const spread2s10s = points2s10s.value * 100;
    const spread3m10y = points3m10y.value * 100;
    const isInverted = spread2s10s < 0;

    const signal: "positive" | "neutral" | "negative" | "warning" =
      spread2s10s >= 50 ? "positive"
        : spread2s10s >= 0 ? "neutral"
        : spread2s10s >= -50 ? "warning"
        : "negative";

    res.json({
      points: curvePoints,
      spread2s10s,
      spread3m10y,
      isInverted,
      signal,
      interpretation: isInverted
        ? `The yield curve is inverted (2s10s: ${spread2s10s.toFixed(0)} bps). Every US recession since 1950 has been preceded by an inversion. Monitor duration closely.`
        : `The yield curve is positively sloped (2s10s: +${spread2s10s.toFixed(0)} bps), consistent with a healthy growth outlook.`,
      asOf: points2s10s.date,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch yield curve");
    res.status(500).json({ error: "Failed to fetch yield curve" });
  }
});

router.get("/macro/recession-probability", async (req, res) => {
  try {
    const history = await buildSeriesHistory(SERIES.RECESSION_PROB, 120);
    const latest = history.observations[history.observations.length - 1];
    const signal: "positive" | "neutral" | "negative" | "warning" =
      latest.value <= 15 ? "positive"
        : latest.value <= 30 ? "neutral"
        : latest.value <= 50 ? "warning"
        : "negative";
    res.json({
      probability: latest.value,
      signal,
      model: "NY Fed Yield Curve Model",
      history: history.observations,
      lastUpdated: latest.date,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch recession probability");
    res.status(500).json({ error: "Failed to fetch recession probability" });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function momPct(obs: { value: string }[]): number | null {
  const valid = obs.filter((o) => o.value !== ".").map((o) => parseFloat(o.value));
  if (valid.length < 2) return null;
  const latest = valid[valid.length - 1];
  const prev = valid[valid.length - 2];
  return prev !== 0 ? ((latest - prev) / Math.abs(prev)) * 100 : null;
}

function momAbs(obs: { value: string }[]): number | null {
  const valid = obs.filter((o) => o.value !== ".").map((o) => parseFloat(o.value));
  if (valid.length < 2) return null;
  return valid[valid.length - 1] - valid[valid.length - 2];
}

async function getGDPNow(): Promise<{ value: number; date: string } | null> {
  try {
    const res = await fetch("https://www.atlantafed.org/cqer/research/gdpnow", {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MacroDash/1.0; +https://replit.com)" },
    });
    const html = await res.text();
    // The page contains text like "X.X percent" near GDPNow
    const patterns = [
      /model estimate[^%\d]*([-\d.]+)\s*percent/i,
      /GDPNow[^%\d]*([-\d.]+)\s*percent/i,
      /tracking[^%\d]*([-\d.]+)\s*percent/i,
      /"gdpnow[^"]*"[^>]*>[^<]*([-\d.]+)/i,
    ];
    for (const pat of patterns) {
      const m = html.match(pat);
      if (m) {
        const val = parseFloat(m[1]);
        if (!isNaN(val) && val > -10 && val < 15) {
          return { value: val, date: new Date().toISOString().split("T")[0] };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

router.get("/macro/tab/growth", async (req, res) => {
  try {
    const [
      gdpRes,
      cpiRes,
      fedFundsRes,
      recProbRes,
      ipRes,
      retailExAutoRes,
      durableRes,
      permitsRes,
      cbLeiRes,
      oecdMfgRes,
      cfnaiRes,
      oecdCliRes,
    ] = await Promise.allSettled([
      getObservations(SERIES.GDP, 5),
      getObservations(SERIES.CPI, 15),
      getLatestValue(SERIES.FED_FUNDS),
      getLatestValue(SERIES.RECESSION_PROB),
      getObservations(SERIES.IP, 4),
      getObservations(SERIES.RETAIL_EX_AUTO, 4),
      getObservations(SERIES.DURABLE_GOODS, 4),
      getObservations(SERIES.BUILDING_PERMITS, 4),
      getObservations(SERIES.CB_LEI, 4),
      getLatestValue(SERIES.OECD_MFG_CONF),
      getLatestValue(SERIES.CFNAI),
      getLatestValue(SERIES.OECD_CLI),
    ]);

    const gdpNowRes = await getGDPNow();

    // ── Cycle phase (same logic as overview) ──────────────────────────────────
    const gdpObs = gdpRes.status === "fulfilled" ? gdpRes.value : [];
    const gdpLatest = gdpObs.filter((o) => o.value !== ".").slice(-1)[0];
    const gdpValue = gdpLatest ? parseFloat(gdpLatest.value) : 0;
    const gdpDate = gdpLatest?.date ?? "";

    const cpiObs = cpiRes.status === "fulfilled" ? cpiRes.value : [];
    const cpiValid = cpiObs.filter((o) => o.value !== ".").map((o) => parseFloat(o.value));
    const cpiYoY = cpiValid.length >= 13
      ? ((cpiValid[cpiValid.length - 1] - cpiValid[cpiValid.length - 13]) / cpiValid[cpiValid.length - 13]) * 100
      : null;

    const fedFunds = fedFundsRes.status === "fulfilled" ? fedFundsRes.value.value : 0;
    const recProb = recProbRes.status === "fulfilled" ? recProbRes.value.value : 0;
    const cpiValue = cpiYoY ?? 0;

    type CyclePhase = "early_expansion" | "mid_expansion" | "late_expansion" | "recession";
    let phase: CyclePhase;
    let cycleLabel: string;
    let cycleDescription: string;
    let confidence = 0;
    let sliderPosition = 0;

    if (recProb > 50 || gdpValue < -1) {
      phase = "recession";
      cycleLabel = "Recession";
      cycleDescription = "Economic output is contracting. Risk assets typically underperform. Bonds and defensives tend to outperform.";
      confidence = Math.min(90, recProb);
      sliderPosition = 88;
    } else if (recProb > 30 || gdpValue < 0.5) {
      phase = "late_expansion";
      cycleLabel = "Late Expansion";
      cycleDescription = "Growth is slowing with elevated recession risk. Consider reducing cyclical exposure and increasing quality.";
      confidence = 60;
      sliderPosition = 70;
    } else if (gdpValue >= 2.5 && cpiValue > 3.5 && fedFunds > 3) {
      phase = "late_expansion";
      cycleLabel = "Late Expansion";
      cycleDescription = "Strong growth but inflation is elevated and monetary policy is tightening. Historically favors commodities and value over growth.";
      confidence = 70;
      sliderPosition = 65;
    } else if (gdpValue >= 1.5 && cpiValue <= 3.5) {
      phase = "mid_expansion";
      cycleLabel = "Mid Expansion";
      cycleDescription = "Solid growth with contained inflation — the 'Goldilocks' scenario. Broadly supportive of equities, especially cyclicals.";
      confidence = 75;
      sliderPosition = 38;
    } else {
      phase = "early_expansion";
      cycleLabel = "Early Expansion";
      cycleDescription = "Economy is recovering with slack remaining. Monetary policy likely accommodative. Cyclicals and small caps tend to outperform.";
      confidence = 60;
      sliderPosition = 12;
    }

    // ── Indicator computations ────────────────────────────────────────────────
    const ipObs = ipRes.status === "fulfilled" ? ipRes.value : [];
    const ipMoM = momPct(ipObs);
    const ipDate = ipObs.filter((o) => o.value !== ".").slice(-1)[0]?.date ?? "";

    const retailObs = retailExAutoRes.status === "fulfilled" ? retailExAutoRes.value : [];
    const retailMoM = momPct(retailObs);
    const retailDate = retailObs.filter((o) => o.value !== ".").slice(-1)[0]?.date ?? "";

    const durableObs = durableRes.status === "fulfilled" ? durableRes.value : [];
    const durableMoM = momPct(durableObs);
    const durableDate = durableObs.filter((o) => o.value !== ".").slice(-1)[0]?.date ?? "";

    const permitsObs = permitsRes.status === "fulfilled" ? permitsRes.value : [];
    const permitsValid = permitsObs.filter((o) => o.value !== ".");
    const permitsLatest = permitsValid.slice(-1)[0];
    const permitsValue = permitsLatest ? parseFloat(permitsLatest.value) : null;
    const permitsDate = permitsLatest?.date ?? "";

    const cbLeiObs = cbLeiRes.status === "fulfilled" ? cbLeiRes.value : [];
    const cbLeiMoM = momAbs(cbLeiObs);
    const cbLeiDate = cbLeiObs.filter((o) => o.value !== ".").slice(-1)[0]?.date ?? "";

    // ── PMI proxies ────────────────────────────────────────────────────────────
    // OECD Mfg Business Confidence → ISM Mfg proxy: centered at 100, range ~97–103
    // Transform: pmi = 50 + (value − 100) × 1.5
    const oecdMfg = oecdMfgRes.status === "fulfilled" ? oecdMfgRes.value : null;
    const ismMfgProxy = oecdMfg
      ? { value: parseFloat((50 + (oecdMfg.value - 100) * 1.5).toFixed(1)), date: oecdMfg.date }
      : null;

    // Chicago Fed CFNAI-MA3 → ISM Services proxy: centered at 0, range ~−3 to +1
    // Transform: pmi = 50 + value × 3
    const cfnai = cfnaiRes.status === "fulfilled" ? cfnaiRes.value : null;
    const ismSvcProxy = cfnai
      ? { value: parseFloat((50 + cfnai.value * 3).toFixed(1)), date: cfnai.date }
      : null;

    // OECD Composite Leading Indicator → S&P Global Composite proxy
    // Transform: pmi = 50 + (value − 100) × 1.5
    const oecdCli = oecdCliRes.status === "fulfilled" ? oecdCliRes.value : null;
    const spPmiProxy = oecdCli
      ? { value: parseFloat((50 + (oecdCli.value - 100) * 1.5).toFixed(1)), date: oecdCli.date }
      : null;

    type Signal = "positive" | "neutral" | "negative";

    const indicators = [
      {
        id: "gdp",
        name: "Real GDP (Annualized)",
        value: gdpValue,
        formattedValue: `${gdpValue.toFixed(1)}%`,
        source: "BEA",
        frequency: "Quarterly",
        type: "Lagging" as const,
        signal: (gdpValue >= 2.5 ? "positive" : gdpValue >= 0 ? "neutral" : "negative") as Signal,
        date: gdpDate,
        available: true,
      },
      {
        id: "gdpnow",
        name: "Atlanta Fed GDPNow",
        value: gdpNowRes?.value ?? null,
        formattedValue: gdpNowRes ? `${gdpNowRes.value.toFixed(1)}%` : "N/A",
        source: "Atlanta Fed",
        frequency: "Continuous",
        type: "Real-Time" as const,
        signal: gdpNowRes
          ? ((gdpNowRes.value >= 2.5 ? "positive" : gdpNowRes.value >= 0 ? "neutral" : "negative") as Signal)
          : null,
        date: gdpNowRes?.date ?? null,
        available: gdpNowRes !== null,
        unavailableReason: gdpNowRes ? undefined : "Live fetch unavailable",
      },
      {
        id: "ism_mfg",
        name: "ISM Manufacturing PMI",
        value: ismMfgProxy?.value ?? null,
        formattedValue: ismMfgProxy ? `~${ismMfgProxy.value.toFixed(1)}` : "N/A",
        source: "OECD proxy",
        frequency: "Monthly",
        type: "Leading" as const,
        signal: ismMfgProxy
          ? ((ismMfgProxy.value > 52 ? "positive" : ismMfgProxy.value > 48 ? "neutral" : "negative") as Signal)
          : null,
        date: ismMfgProxy?.date ?? null,
        available: ismMfgProxy !== null,
        isProxy: true,
        proxySource: "OECD Mfg Business Confidence (BSCICP03USM665S)",
        unavailableReason: ismMfgProxy ? undefined : "No free proxy available",
      },
      {
        id: "ism_svc",
        name: "ISM Services PMI",
        value: ismSvcProxy?.value ?? null,
        formattedValue: ismSvcProxy ? `~${ismSvcProxy.value.toFixed(1)}` : "N/A",
        source: "Chicago Fed proxy",
        frequency: "Monthly",
        type: "Leading" as const,
        signal: ismSvcProxy
          ? ((ismSvcProxy.value > 52 ? "positive" : ismSvcProxy.value > 48 ? "neutral" : "negative") as Signal)
          : null,
        date: ismSvcProxy?.date ?? null,
        available: ismSvcProxy !== null,
        isProxy: true,
        proxySource: "Chicago Fed CFNAI-MA3 (CFNAIMA3)",
        unavailableReason: ismSvcProxy ? undefined : "No free proxy available",
      },
      {
        id: "sp_pmi",
        name: "S&P Global PMI Composite",
        value: spPmiProxy?.value ?? null,
        formattedValue: spPmiProxy ? `~${spPmiProxy.value.toFixed(1)}` : "N/A",
        source: "OECD proxy",
        frequency: "Monthly",
        type: "Leading" as const,
        signal: spPmiProxy
          ? ((spPmiProxy.value > 52 ? "positive" : spPmiProxy.value > 48 ? "neutral" : "negative") as Signal)
          : null,
        date: spPmiProxy?.date ?? null,
        available: spPmiProxy !== null,
        isProxy: true,
        proxySource: "OECD Composite Leading Indicator (USALOLITONOSTSAM)",
        unavailableReason: spPmiProxy ? undefined : "No free proxy available",
      },
      {
        id: "cb_lei",
        name: "Conference Board LEI",
        value: cbLeiMoM,
        formattedValue: cbLeiMoM !== null ? `${cbLeiMoM >= 0 ? "+" : ""}${cbLeiMoM.toFixed(2)}` : "N/A",
        source: "Conference Board",
        frequency: "Monthly",
        type: "Leading" as const,
        signal: cbLeiMoM !== null
          ? ((cbLeiMoM > 0.3 ? "positive" : cbLeiMoM > -0.1 ? "neutral" : "negative") as Signal)
          : null,
        date: cbLeiDate || null,
        available: cbLeiMoM !== null,
        unavailableReason: cbLeiMoM !== null ? undefined : "Data unavailable",
      },
      {
        id: "indpro",
        name: "Industrial Production",
        value: ipMoM,
        formattedValue: ipMoM !== null ? `${ipMoM >= 0 ? "+" : ""}${ipMoM.toFixed(2)}%` : "N/A",
        source: "Federal Reserve",
        frequency: "Monthly",
        type: "Coincident" as const,
        signal: ipMoM !== null
          ? ((ipMoM > 0.5 ? "positive" : ipMoM > -0.2 ? "neutral" : "negative") as Signal)
          : null,
        date: ipDate || null,
        available: ipMoM !== null,
        unavailableReason: ipMoM !== null ? undefined : "Data unavailable",
      },
      {
        id: "retail_ex_auto",
        name: "Retail Sales (ex-auto)",
        value: retailMoM,
        formattedValue: retailMoM !== null ? `${retailMoM >= 0 ? "+" : ""}${retailMoM.toFixed(2)}%` : "N/A",
        source: "Census Bureau",
        frequency: "Monthly",
        type: "Coincident" as const,
        signal: retailMoM !== null
          ? ((retailMoM > 0.5 ? "positive" : retailMoM > -0.2 ? "neutral" : "negative") as Signal)
          : null,
        date: retailDate || null,
        available: retailMoM !== null,
        unavailableReason: retailMoM !== null ? undefined : "Data unavailable",
      },
      {
        id: "durable_goods",
        name: "Durable Goods Orders",
        value: durableMoM,
        formattedValue: durableMoM !== null ? `${durableMoM >= 0 ? "+" : ""}${durableMoM.toFixed(2)}%` : "N/A",
        source: "Census Bureau",
        frequency: "Monthly",
        type: "Leading" as const,
        signal: durableMoM !== null
          ? ((durableMoM > 1 ? "positive" : durableMoM > -2 ? "neutral" : "negative") as Signal)
          : null,
        date: durableDate || null,
        available: durableMoM !== null,
        unavailableReason: durableMoM !== null ? undefined : "Data unavailable",
      },
      {
        id: "permits",
        name: "Building Permits",
        value: permitsValue,
        formattedValue: permitsValue !== null ? `${(permitsValue / 1000).toFixed(2)}M` : "N/A",
        source: "Census Bureau",
        frequency: "Monthly",
        type: "Leading" as const,
        signal: permitsValue !== null
          ? ((permitsValue > 1400 ? "positive" : permitsValue > 1100 ? "neutral" : "negative") as Signal)
          : null,
        date: permitsDate || null,
        available: permitsValue !== null,
        unavailableReason: permitsValue !== null ? undefined : "Data unavailable",
      },
    ];

    res.json({
      cyclePhase: { phase, label: cycleLabel, confidence, description: cycleDescription, sliderPosition },
      indicators,
      lastRefreshed: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch growth tab");
    res.status(500).json({ error: "Failed to fetch growth data" });
  }
});

router.get("/macro/tab/inflation", async (req, res) => {
  try {
    const [
      cpiRes, coreCpiRes, pceRes, corePceRes,
      shelterRes, supercoreRes, foodHomeRes, energyRes, newVehiclesRes,
      ppiRes, michRes, t5yifrRes, oerRes, importPriceRes,
    ] = await Promise.allSettled([
      getObservations(SERIES.CPI, 14),
      getObservations(SERIES.CORE_CPI, 14),
      getObservations(SERIES.PCE, 14),
      getObservations(SERIES.CORE_PCE, 14),
      getObservations("CUSR0000SAH1", 14),
      getObservations("CUSR0000SASLE", 14),
      getObservations("CUSR0000SAF11", 14),
      getObservations("CPIENGSL", 14),
      getObservations("CUUR0000SETA01", 14),
      getObservations("PPIFID", 14),
      getLatestValue("MICH"),
      getLatestValue("T5YIFR"),
      getObservations("CUSR0000SEHC", 14),
      getLatestValue("IR0000").catch(() => null),
    ]);

    function yoyFromObs(res: PromiseSettledResult<{ value: string; date: string }[]>): { value: number; date: string } | null {
      if (res.status !== "fulfilled") return null;
      const obs = res.value.filter((o) => o.value !== ".");
      if (obs.length < 13) return null;
      const latest = parseFloat(obs[obs.length - 1].value);
      const yearAgo = parseFloat(obs[obs.length - 13].value);
      if (!isFinite(latest) || !isFinite(yearAgo) || yearAgo === 0) return null;
      return { value: ((latest - yearAgo) / Math.abs(yearAgo)) * 100, date: obs[obs.length - 1].date };
    }

    type InflSig = "positive" | "neutral" | "warning" | "negative";
    function inflSignal(v: number): { signal: InflSig; status: string } {
      if (v < 0)   return { signal: "positive", status: "Deflationary" };
      if (v < 2.0) return { signal: "positive", status: "Below Target" };
      if (v <= 2.5) return { signal: "neutral",  status: "At Target" };
      if (v <= 4.0) return { signal: "warning",  status: "Above Target" };
      return           { signal: "negative", status: "Well Above Target" };
    }

    const cpiYoY    = yoyFromObs(cpiRes);
    const coreCpiYoY = yoyFromObs(coreCpiRes);
    const pceYoY    = yoyFromObs(pceRes);
    const corePceYoY = yoyFromObs(corePceRes);

    function headlineReading(d: { value: number; date: string } | null) {
      if (!d) return { value: null, date: null, signal: null, status: null };
      const { signal, status } = inflSignal(d.value);
      return { value: d.value, date: d.date, signal, status };
    }

    const shelterYoY     = yoyFromObs(shelterRes);
    const supercoreYoY   = yoyFromObs(supercoreRes);
    const foodHomeYoY    = yoyFromObs(foodHomeRes);
    const energyYoY      = yoyFromObs(energyRes);
    const newVehiclesYoY = yoyFromObs(newVehiclesRes);
    const ppiYoY         = yoyFromObs(ppiRes);
    const oerYoY         = yoyFromObs(oerRes);

    function component(id: string, name: string, data: { value: number; date: string } | null) {
      if (!data) return { id, name, value: null, date: null, signal: null, status: null };
      const { signal, status } = inflSignal(data.value);
      return { id, name, value: data.value, date: data.date, signal, status };
    }

    const mich   = michRes.status === "fulfilled" ? michRes.value : null;
    const t5yifr = t5yifrRes.status === "fulfilled" ? t5yifrRes.value : null;

    const WHY: Record<string, string> = {
      cpi:        "The headline consumer price gauge. Drives Social Security COLA, TIPS adjustments, and real-wage calculations.",
      core_cpi:   "Strips volatile food & energy. The Fed monitors this for underlying price trends in policy meetings.",
      pce:        "The Fed's preferred inflation gauge — uses different weights than CPI and runs ~0.3–0.5 pp lower.",
      core_pce:   "The Fed's 2% target is measured here. The most critical single figure for rate-setting decisions.",
      ppi:        "Upstream producer price pressures. Leads CPI by 1–3 months as costs pass through to consumers.",
      import_px:  "Tracks imported goods prices; FX strength and global commodities flow through to headline CPI.",
      t5yifr:     "Market's 5yr inflation expectation 5yrs forward — the Fed's preferred gauge of long-run price anchoring.",
      mich:       "Survey-based 1yr consumer expectation. Feeds into wage negotiations and can become self-fulfilling.",
      oer:        "~25% of CPI — the single largest component. Tracks implicit rent for homeowners; notoriously lagged.",
      supercore:  "Core services ex-shelter — reflects labor cost pressures and is the 'stickiest' CPI component.",
    };

    function suite(id: string, name: string, value: number | null, date: string | null, source: string) {
      if (value === null) return { id, name, value: null, formattedValue: "N/A", source, whyItMatters: WHY[id] ?? "", date: null, available: false };
      return {
        id, name,
        value,
        formattedValue: `${value >= 0 ? "" : ""}${value.toFixed(2)}%`,
        source,
        whyItMatters: WHY[id] ?? "",
        date,
        available: true,
      };
    }

    res.json({
      headlineReadings: {
        cpi:    headlineReading(cpiYoY),
        coreCpi: headlineReading(coreCpiYoY),
        pce:    headlineReading(pceYoY),
        corePce: headlineReading(corePceYoY),
      },
      components: [
        component("shelter",     "Shelter / OER",                    shelterYoY),
        component("supercore",   "Supercore (Services ex-Energy)",   supercoreYoY),
        component("food_home",   "Food at Home",                     foodHomeYoY),
        component("energy",      "Energy",                           energyYoY),
        component("new_vehicles","New Vehicles",                     newVehiclesYoY),
      ],
      dataSuite: [
        suite("cpi",       "CPI (All Items)",                  cpiYoY?.value ?? null,      cpiYoY?.date ?? null,       "BLS"),
        suite("core_cpi",  "Core CPI (ex-Food & Energy)",      coreCpiYoY?.value ?? null,  coreCpiYoY?.date ?? null,   "BLS"),
        suite("pce",       "PCE Deflator",                     pceYoY?.value ?? null,      pceYoY?.date ?? null,       "BEA"),
        suite("core_pce",  "Core PCE",                         corePceYoY?.value ?? null,  corePceYoY?.date ?? null,   "BEA"),
        suite("ppi",       "PPI (Final Demand)",                ppiYoY?.value ?? null,      ppiYoY?.date ?? null,       "BLS"),
        { id: "import_px", name: "Import Price Index", value: null, formattedValue: "N/A", source: "BLS", whyItMatters: WHY.import_px, date: null, available: false, unavailableReason: "Not on FRED free tier" },
        { id: "t5yifr",   name: "5Y5Y Breakeven Rate",         value: t5yifr?.value ?? null, formattedValue: t5yifr ? `${t5yifr.value.toFixed(2)}%` : "N/A", source: "Fed / TIPS", whyItMatters: WHY.t5yifr, date: t5yifr?.date ?? null, available: t5yifr !== null },
        { id: "mich",     name: "Michigan Inflation Exp. (1Y)", value: mich?.value ?? null,  formattedValue: mich ? `${mich.value.toFixed(1)}%` : "N/A",        source: "UMich",      whyItMatters: WHY.mich,    date: mich?.date ?? null,    available: mich !== null },
        suite("oer",       "Owners' Equivalent Rent (OER)",     oerYoY?.value ?? null,      oerYoY?.date ?? null,       "BLS"),
        suite("supercore", "Supercore CPI",                     supercoreYoY?.value ?? null, supercoreYoY?.date ?? null, "BLS"),
      ],
      lastRefreshed: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch inflation tab");
    res.status(500).json({ error: "Failed to fetch inflation data" });
  }
});

router.get("/macro/tab/labor", async (req, res) => {
  try {
    const [
      nfpRes, adpRes, unrateRes, u6Res, civpartRes, primeAgeRes,
      joltsRes, quitsRes, icsaRes, ccsaRes, awhtRes, aweRes,
    ] = await Promise.allSettled([
      getObservations(SERIES.NFP, 3),
      getObservations("ADPWNUSNERSA", 3),
      getLatestValue(SERIES.UNRATE),
      getLatestValue("U6RATE"),
      getLatestValue(SERIES.PARTICIPATION),
      getLatestValue("LNS11300060"),
      getLatestValue(SERIES.JOLTS),
      getLatestValue("JTSQUR"),
      getLatestValue(SERIES.INITIAL_CLAIMS),
      getLatestValue(SERIES.CONT_CLAIMS),
      getLatestValue("AWHAETP"),
      getObservations(SERIES.AWE, 14),
    ]);

    type LaborSig = "positive" | "neutral" | "warning" | "negative";

    function mom(res: PromiseSettledResult<{ value: string; date: string }[]>): { value: number; date: string } | null {
      if (res.status !== "fulfilled") return null;
      const obs = res.value.filter((o) => o.value !== ".");
      if (obs.length < 2) return null;
      const latest = parseFloat(obs[obs.length - 1].value);
      const prior  = parseFloat(obs[obs.length - 2].value);
      if (!isFinite(latest) || !isFinite(prior)) return null;
      return { value: latest - prior, date: obs[obs.length - 1].date };
    }

    function yoy(res: PromiseSettledResult<{ value: string; date: string }[]>): { value: number; date: string } | null {
      if (res.status !== "fulfilled") return null;
      const obs = res.value.filter((o) => o.value !== ".");
      if (obs.length < 13) return null;
      const latest  = parseFloat(obs[obs.length - 1].value);
      const yearAgo = parseFloat(obs[obs.length - 13].value);
      if (!isFinite(latest) || !isFinite(yearAgo) || yearAgo === 0) return null;
      return { value: ((latest - yearAgo) / Math.abs(yearAgo)) * 100, date: obs[obs.length - 1].date };
    }

    function latest(res: PromiseSettledResult<{ value: number; date: string }>): { value: number; date: string } | null {
      return res.status === "fulfilled" ? res.value : null;
    }

    const nfpMoM    = mom(nfpRes);
    // ADPWNUSNERSA is in actual persons; normalise to thousands to match NFP units
    const adpMoMRaw = mom(adpRes);
    const adpMoM    = adpMoMRaw ? { value: adpMoMRaw.value / 1000, date: adpMoMRaw.date } : null;
    const unrate    = latest(unrateRes);
    const u6        = latest(u6Res);
    const civpart   = latest(civpartRes);
    const primeAge  = latest(primeAgeRes);
    const jolts     = latest(joltsRes);
    const quits     = latest(quitsRes);
    const icsa      = latest(icsaRes);
    const ccsa      = latest(ccsaRes);
    const awht      = latest(awhtRes);
    const aweYoY    = yoy(aweRes);

    function nfpSig(v: number): { signal: LaborSig; status: string } {
      if (v > 200)  return { signal: "positive", status: "Strong" };
      if (v >= 100) return { signal: "positive", status: "Healthy" };
      if (v >= 50)  return { signal: "neutral",  status: "Modest" };
      if (v >= 0)   return { signal: "warning",  status: "Weak" };
      return           { signal: "negative", status: "Contracting" };
    }
    function unrateSig(v: number): { signal: LaborSig; status: string } {
      if (v < 4.0) return { signal: "positive", status: "Full Employment" };
      if (v < 4.5) return { signal: "positive", status: "Healthy" };
      if (v < 5.5) return { signal: "neutral",  status: "Moderate" };
      if (v < 7.0) return { signal: "warning",  status: "Elevated" };
      return          { signal: "negative", status: "High" };
    }
    function u6Sig(v: number): { signal: LaborSig; status: string } {
      if (v < 7.0) return { signal: "positive", status: "Healthy" };
      if (v < 8.5) return { signal: "neutral",  status: "Moderate" };
      if (v < 10)  return { signal: "warning",  status: "Elevated" };
      return          { signal: "negative", status: "High" };
    }
    function civpartSig(v: number): { signal: LaborSig; status: string } {
      if (v >= 63.5) return { signal: "positive", status: "Strong" };
      if (v >= 62.5) return { signal: "neutral",  status: "Healthy" };
      if (v >= 61.0) return { signal: "warning",  status: "Below Trend" };
      return            { signal: "negative", status: "Weak" };
    }
    function primeAgeSig(v: number): { signal: LaborSig; status: string } {
      if (v >= 83.0) return { signal: "positive", status: "Strong" };
      if (v >= 81.5) return { signal: "neutral",  status: "Healthy" };
      if (v >= 79.0) return { signal: "warning",  status: "Below Trend" };
      return            { signal: "negative", status: "Weak" };
    }
    function joltsSig(v: number): { signal: LaborSig; status: string } {
      if (v > 8000) return { signal: "positive", status: "Very Tight" };
      if (v > 7000) return { signal: "positive", status: "Tight" };
      if (v > 6000) return { signal: "neutral",  status: "Balanced" };
      if (v > 5000) return { signal: "warning",  status: "Softening" };
      return           { signal: "negative", status: "Soft" };
    }
    function quitsSig(v: number): { signal: LaborSig; status: string } {
      if (v >= 2.5) return { signal: "positive", status: "Workers Confident" };
      if (v >= 2.0) return { signal: "neutral",  status: "Normal" };
      if (v >= 1.5) return { signal: "warning",  status: "Declining" };
      return           { signal: "negative", status: "Workers Cautious" };
    }
    function icsaSig(v: number): { signal: LaborSig; status: string } {
      if (v < 220000) return { signal: "positive", status: "Low" };
      if (v < 260000) return { signal: "neutral",  status: "Normal" };
      if (v < 320000) return { signal: "warning",  status: "Elevated" };
      return             { signal: "negative", status: "High" };
    }
    function ccsaSig(v: number): { signal: LaborSig; status: string } {
      if (v < 1700000) return { signal: "positive", status: "Low" };
      if (v < 2000000) return { signal: "neutral",  status: "Normal" };
      if (v < 2500000) return { signal: "warning",  status: "Elevated" };
      return              { signal: "negative", status: "High" };
    }
    function awhtSig(v: number): { signal: LaborSig; status: string } {
      if (v >= 34.5) return { signal: "positive", status: "Extended" };
      if (v >= 33.5) return { signal: "neutral",  status: "Normal" };
      if (v >= 32.5) return { signal: "warning",  status: "Below Average" };
      return            { signal: "negative", status: "Shortened" };
    }
    function wageSig(v: number): { signal: LaborSig; status: string } {
      if (v < 2.5)  return { signal: "neutral",  status: "Subdued" };
      if (v < 3.5)  return { signal: "positive", status: "Sustainable" };
      if (v < 4.5)  return { signal: "warning",  status: "Wage Pressure" };
      return           { signal: "negative", status: "High Wage Pressure" };
    }

    function row(id: string, name: string, data: { value: number; date: string } | null, source: string, fmt: (v: number) => string, sig: (v: number) => { signal: LaborSig; status: string }) {
      if (!data) return { id, name, value: null, formattedValue: "N/A", source, signal: null, status: null, date: null, available: false };
      const { signal, status } = sig(data.value);
      return { id, name, value: data.value, formattedValue: fmt(data.value), source, signal, status, date: data.date, available: true };
    }

    const fmtK    = (v: number) => `${v >= 0 ? "+" : ""}${Math.round(v).toLocaleString()}K`;
    const fmtPct  = (v: number) => `${v.toFixed(1)}%`;
    const fmtYoY  = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
    const fmtM    = (v: number) => `${(v / 1000).toFixed(2)}M`;
    const fmtKraw = (v: number) => `${Math.round(v / 1000).toLocaleString()}K`;
    const fmtHrs  = (v: number) => `${v.toFixed(1)} hrs`;

    res.json({
      health: {
        nfpMoM:   nfpMoM  ? { ...nfpSig(nfpMoM.value),  value: nfpMoM.value,  formattedValue: fmtK(nfpMoM.value),  date: nfpMoM.date  } : null,
        unrate:   unrate  ? { ...unrateSig(unrate.value), value: unrate.value,  formattedValue: fmtPct(unrate.value), date: unrate.date  } : null,
        aweYoY:   aweYoY  ? { ...wageSig(aweYoY.value),  value: aweYoY.value,  formattedValue: fmtYoY(aweYoY.value), date: aweYoY.date  } : null,
        jolts:    jolts   ? { ...joltsSig(jolts.value),  value: jolts.value,   formattedValue: fmtM(jolts.value),   date: jolts.date   } : null,
      },
      suite: [
        row("nfp",       "Nonfarm Payrolls (NFP)",         nfpMoM,  "BLS",   fmtK,    nfpSig),
        row("adp",       "ADP Private Payrolls",            adpMoM,  "ADP",   fmtK,    nfpSig),
        row("unrate",    "U-3 Unemployment Rate",           unrate,  "BLS",   fmtPct,  unrateSig),
        row("u6",        "U-6 Underemployment Rate",        u6,      "BLS",   fmtPct,  u6Sig),
        row("civpart",   "Labor Force Participation Rate",  civpart, "BLS",   fmtPct,  civpartSig),
        row("primeage",  "Prime-Age LFPR (25–54)",          primeAge,"BLS",   fmtPct,  primeAgeSig),
        row("jolts",     "Job Openings (JOLTS)",            jolts,   "BLS",   fmtM,    joltsSig),
        row("quits",     "Quits Rate",                      quits,   "BLS",   fmtPct,  quitsSig),
        row("icsa",      "Initial Jobless Claims",          icsa,    "DOL",   fmtKraw, icsaSig),
        row("ccsa",      "Continuing Claims",               ccsa,    "DOL",   fmtKraw, ccsaSig),
        { id: "challenger", name: "Challenger Layoffs", value: null, formattedValue: "N/A", source: "Challenger", signal: null, status: null, date: null, available: false, unavailableReason: "Not on FRED free tier" },
        row("awht",      "Average Weekly Hours",            awht,    "BLS",   fmtHrs,  awhtSig),
      ],
      lastRefreshed: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch labor tab");
    res.status(500).json({ error: "Failed to fetch labor data" });
  }
});

router.get("/macro/tab/financial", async (req, res) => {
  try {
    const [
      ffRes, t2yRes, t10yRes, spreadRes,
      mortgageRes, hyRes, igRes, nfciRes,
      vixRes, tedRes, dxyRes, wtiRes, m2Res,
    ] = await Promise.allSettled([
      getLatestValue(SERIES.FED_FUNDS),
      getLatestValue(SERIES.T2Y),
      getLatestValue(SERIES.T10Y),
      getLatestValue(SERIES.T10Y2Y),
      getLatestValue("MORTGAGE30US"),
      getLatestValue(SERIES.HY_SPREAD),
      getLatestValue(SERIES.IG_SPREAD),
      getLatestValue("NFCI"),
      getLatestValue("VIXCLS"),
      getLatestValue("TEDRATE"),
      getLatestValue("DTWEXBGS"),
      getLatestValue("DCOILWTICO"),
      getObservations("M2SL", 14),
    ]);

    type FinSig = "positive" | "neutral" | "warning" | "negative";

    function lv(r: PromiseSettledResult<{ value: number; date: string }>): { value: number; date: string } | null {
      return r.status === "fulfilled" ? r.value : null;
    }

    // YoY for M2
    function m2YoY(r: PromiseSettledResult<{ value: string; date: string }[]>): { value: number; date: string } | null {
      if (r.status !== "fulfilled") return null;
      const obs = r.value.filter((o) => o.value !== ".");
      if (obs.length < 13) return null;
      const latest  = parseFloat(obs[obs.length - 1].value);
      const yearAgo = parseFloat(obs[obs.length - 13].value);
      if (!isFinite(latest) || !isFinite(yearAgo) || yearAgo === 0) return null;
      return { value: ((latest - yearAgo) / Math.abs(yearAgo)) * 100, date: obs[obs.length - 1].date };
    }

    const ff      = lv(ffRes);
    const t2y     = lv(t2yRes);
    const t10y    = lv(t10yRes);
    const spread  = lv(spreadRes);   // in %, multiply ×100 for bps
    const mortgage = lv(mortgageRes);
    const hy      = lv(hyRes);
    const ig      = lv(igRes);
    const nfci    = lv(nfciRes);
    const vix     = lv(vixRes);
    const ted     = lv(tedRes);
    const dxy     = lv(dxyRes);
    const wti     = lv(wtiRes);
    const m2      = m2YoY(m2Res);

    const spreadBps = spread ? spread.value * 100 : null;
    // HY/IG OAS series are in percent on FRED — convert to bps
    const hyBps  = hy  ? { value: hy.value  * 100, date: hy.date  } : null;
    const igBps  = ig  ? { value: ig.value  * 100, date: ig.date  } : null;

    // ── Signal functions ──────────────────────────────────────────────────
    function ffSig(v: number): { signal: FinSig; status: string; context: string } {
      if (v <= 2.0) return { signal: "positive", status: "Accommodative",  context: "Below neutral; supportive of growth and risk assets" };
      if (v <= 3.5) return { signal: "neutral",  status: "Neutral",        context: "Near neutral; neither stimulative nor restrictive" };
      if (v <= 5.25) return { signal: "warning", status: "Restrictive",    context: "Above neutral; applying brakes to inflation and growth" };
      return            { signal: "negative", status: "Very Restrictive",  context: "Well above neutral; significant drag on credit and growth" };
    }
    function t2ySig(v: number, ff_: number | null): { signal: FinSig; status: string; context: string } {
      const below = ff_ !== null && v < ff_ - 0.25;
      const above = ff_ !== null && v > ff_ + 0.25;
      if (below) return { signal: "positive", status: "Pricing Rate Cuts",  context: "2Y below Fed Funds — market expects policy easing ahead" };
      if (above) return { signal: "warning",  status: "Pricing Rate Hikes", context: "2Y above Fed Funds — market expects further tightening" };
      return            { signal: "neutral",  status: "Rates On Hold",      context: "2Y near Fed Funds — market sees rates stable near-term" };
    }
    function t10ySig(v: number): { signal: FinSig; status: string; context: string } {
      if (v < 3.0)  return { signal: "positive", status: "Low",      context: "Below long-run neutral; very supportive for equities and housing" };
      if (v < 4.0)  return { signal: "neutral",  status: "Moderate", context: "Near long-run neutral; modest competition with equity valuations" };
      if (v < 5.0)  return { signal: "warning",  status: "Elevated", context: "Elevated; pressure on equity multiples, housing, and corporate debt" };
      return            { signal: "negative", status: "High",      context: "High by recent standards; significant drag on rate-sensitive assets" };
    }
    function spreadSig(bps: number): { signal: FinSig; status: string; context: string } {
      if (bps > 75)  return { signal: "positive", status: "Steep Curve",     context: "Normal upward slope; banks earn spread, credit flows freely" };
      if (bps > 10)  return { signal: "neutral",  status: "Flat / Normal",   context: "Low term premium; monitor for continued flattening" };
      if (bps >= -25) return { signal: "warning", status: "Mildly Inverted", context: "Mild inversion; historically precedes economic slowdown" };
      return             { signal: "negative", status: "Inverted",           context: "Sustained inversion; historically leads recession by 12–24 months" };
    }
    function hySig(v: number): { signal: FinSig; status: string } {
      if (v < 300)  return { signal: "positive", status: "Very Tight" };
      if (v < 450)  return { signal: "positive", status: "Tight" };
      if (v < 650)  return { signal: "neutral",  status: "Normal" };
      if (v < 900)  return { signal: "warning",  status: "Wide / Risk-Off" };
      return           { signal: "negative", status: "Distressed" };
    }
    function igSig(v: number): { signal: FinSig; status: string } {
      if (v < 80)   return { signal: "positive", status: "Very Tight" };
      if (v < 120)  return { signal: "positive", status: "Tight" };
      if (v < 180)  return { signal: "neutral",  status: "Normal" };
      if (v < 250)  return { signal: "warning",  status: "Wide" };
      return           { signal: "negative", status: "Very Wide" };
    }
    function mortgageSig(v: number): { signal: FinSig; status: string } {
      if (v < 5.0)  return { signal: "positive", status: "Low / Supportive" };
      if (v < 6.5)  return { signal: "neutral",  status: "Moderate" };
      if (v < 8.0)  return { signal: "warning",  status: "Elevated" };
      return           { signal: "negative", status: "High / Restrictive" };
    }
    function nfciSig(v: number): { signal: FinSig; status: string } {
      if (v < -0.5)  return { signal: "positive", status: "Very Loose" };
      if (v < 0)     return { signal: "positive", status: "Loose" };
      if (v < 0.3)   return { signal: "neutral",  status: "Neutral" };
      if (v < 0.7)   return { signal: "warning",  status: "Tight" };
      return            { signal: "negative", status: "Very Tight" };
    }
    function vixSig(v: number): { signal: FinSig; status: string } {
      if (v < 15)   return { signal: "positive", status: "Complacency" };
      if (v < 20)   return { signal: "neutral",  status: "Normal" };
      if (v < 30)   return { signal: "warning",  status: "Elevated" };
      return           { signal: "negative", status: "Fear" };
    }
    function dxySig(v: number): { signal: FinSig; status: string } {
      if (v < 108)  return { signal: "positive", status: "Weak USD" };
      if (v < 118)  return { signal: "neutral",  status: "Normal Range" };
      if (v < 128)  return { signal: "warning",  status: "Strong USD" };
      return           { signal: "negative", status: "Very Strong USD" };
    }
    function wtiSig(v: number): { signal: FinSig; status: string } {
      if (v < 50)   return { signal: "positive", status: "Low" };
      if (v < 80)   return { signal: "neutral",  status: "Moderate" };
      if (v < 100)  return { signal: "warning",  status: "Elevated" };
      return           { signal: "negative", status: "High" };
    }
    function m2Sig(v: number): { signal: FinSig; status: string } {
      if (v < 0)    return { signal: "negative", status: "Contracting" };
      if (v < 4)    return { signal: "positive", status: "Modest Growth" };
      if (v < 8)    return { signal: "neutral",  status: "Healthy Growth" };
      return           { signal: "warning",  status: "Rapid Expansion" };
    }
    function tedSig(v: number): { signal: FinSig; status: string } {
      if (v < 0.30)  return { signal: "positive", status: "Low / Normal" };
      if (v < 0.60)  return { signal: "neutral",  status: "Moderate" };
      if (v < 1.00)  return { signal: "warning",  status: "Elevated" };
      return            { signal: "negative", status: "High / Stress" };
    }

    const WATCH: Record<string, string> = {
      ff:       "The FOMC's primary policy tool. Moves in 25bp increments; watch Fed meeting statements and dot-plot projections for the rate path.",
      spread:   "Sustained inversion historically precedes recessions by 12–24 months. Re-steepening after inversion can signal early-cycle turn.",
      mortgage: "Directly impacts housing affordability. Tracks 10Y Treasury + mortgage-backed security spread; key for real estate and consumer spending.",
      hy:       "Risk appetite barometer. Sub-400bps historically tight; >700bps signals stress. Widens sharply during credit events.",
      ig:       "Blue-chip corporate funding costs. Wider spreads raise capex hurdle rates and signal tightening credit standards.",
      nfci:     "Composite of 105 measures across risk, credit, and leverage. Positive = tighter than avg; negative = looser. Sustained tightening pressures growth.",
      goldman:  "Goldman's proprietary blend of rates, credit, equity, and FX conditions. Not available on FRED; requires Bloomberg/GS data subscription.",
      vix:      "<15 = complacency; 15–25 = normal; >30 = fear. Sustained low VIX supports carry strategies; spikes often mark equity lows.",
      ted:      "Interbank stress indicator (LIBOR minus T-bill). Discontinued Apr 2023 when LIBOR was replaced by SOFR — final reading shown.",
      dxy:      "Broad USD strength. Strong USD tightens global financial conditions, pressures EM debt, weakens commodity prices, and headwinds US multinationals.",
      wti:      "Key inflation input and demand proxy. Rising oil boosts CPI and energy sector; falling oil signals demand weakness or supply glut.",
      m2:       "Broad money stock growth. Rapid M2 expansion risks future inflation; contraction historically associated with credit stress and slowdowns.",
    };

    function suiteRow(id: string, name: string, data: { value: number; date: string } | null, source: string, fmt: (v: number) => string, sig: (v: number) => { signal: FinSig; status: string }, extra?: object) {
      const watch = WATCH[id] ?? "";
      if (!data) return { id, name, value: null, formattedValue: "N/A", source, signal: null, status: null, date: null, available: false, whyItMatters: watch, ...extra };
      const { signal, status } = sig(data.value);
      return { id, name, value: data.value, formattedValue: fmt(data.value), source, signal, status, date: data.date, available: true, whyItMatters: watch, ...extra };
    }

    const fmtPct  = (v: number) => `${v.toFixed(2)}%`;
    const fmtBps  = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}bps`;
    const fmtOas  = (v: number) => `${v.toFixed(0)} bps`;
    const fmtUsd  = (v: number) => v.toFixed(1);
    const fmtWti  = (v: number) => `$${v.toFixed(1)}`;
    const fmtYoY  = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

    // Section A — 4 key rate cards
    const ffCard     = ff     ? { value: ff.value,         date: ff.date,     formattedValue: fmtPct(ff.value),     ...ffSig(ff.value) }    : null;
    const t2yCard    = t2y    ? { value: t2y.value,        date: t2y.date,    formattedValue: fmtPct(t2y.value),    ...t2ySig(t2y.value, ff?.value ?? null) } : null;
    const t10yCard   = t10y   ? { value: t10y.value,       date: t10y.date,   formattedValue: fmtPct(t10y.value),   ...t10ySig(t10y.value) } : null;
    const spreadCard = spreadBps !== null && spread ? {
      value: spreadBps, date: spread.date,
      formattedValue: fmtBps(spreadBps),
      ...spreadSig(spreadBps),
    } : null;

    // Section B — 12 suite rows
    const spreadForRow = spreadBps !== null && spread ? { value: spreadBps, date: spread.date } : null;

    res.json({
      rates: { ff: ffCard, t2y: t2yCard, t10y: t10yCard, spread: spreadCard },
      suite: [
        suiteRow("ff",       "Federal Funds Rate",        ff,          "FOMC",       fmtPct,  ffSig),
        suiteRow("spread",   "2Y–10Y Yield Spread",       spreadForRow,"FRED",       fmtBps,  spreadSig),
        suiteRow("mortgage", "30Y Mortgage Rate",         mortgage,    "Freddie Mac",fmtPct,  mortgageSig),
        suiteRow("hy",       "HY Credit Spread (OAS)",    hyBps,       "ICE BofA",   fmtOas,  hySig),
        suiteRow("ig",       "IG Credit Spread (OAS)",    igBps,       "ICE BofA",   fmtOas,  igSig),
        suiteRow("nfci",     "Chicago Fed NFCI",          nfci,        "Chicago Fed",fmtUsd,  nfciSig),
        { id: "goldman", name: "Goldman FCI Index", value: null, formattedValue: "N/A", source: "Goldman Sachs", signal: null, status: null, date: null, available: false, whyItMatters: WATCH.goldman, unavailableReason: "Not on FRED free tier" },
        suiteRow("vix",      "VIX (Implied Volatility)",  vix,         "CBOE",       fmtUsd,  vixSig),
        suiteRow("ted",      "TED Spread",                ted,         "BBA/FRED",   fmtPct,  tedSig, { note: "Discontinued Apr 2023" }),
        suiteRow("dxy",      "USD Index (Broad)",         dxy,         "Fed",        fmtUsd,  dxySig),
        suiteRow("wti",      "WTI Crude Oil",             wti,         "EIA",        fmtWti,  wtiSig),
        suiteRow("m2",       "M2 Money Supply (YoY)",     m2,          "Fed",        fmtYoY,  m2Sig),
      ],
      lastRefreshed: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch financial tab");
    res.status(500).json({ error: "Failed to fetch financial data" });
  }
});

// ── Global Tab ────────────────────────────────────────────────────────────────
router.get("/macro/tab/global", async (req, res) => {
  try {
    const [
      usBciRes, ezBciRes, gbBciRes, jpBciRes, cnBciRes, inBciRes,
      usCliRes, gbCliRes, jpCliRes, cnCliRes, inCliRes, oecdCliRes,
      ecbRes, soniaRes,
      ezHicpRes, jpCpiRes, gbCpiRes, cnCpiRes,
      ezUnempRes, brentRes, eurusdRes, jpyusdRes, cnyusdRes,
    ] = await Promise.allSettled([
      getObservations("BSCICP03USM665S", 3),
      getObservations("BSCICP03EZM665S", 3),
      getObservations("BSCICP03GBM665S", 3),
      getObservations("BSCICP03JPM665S", 3),
      getObservations("BSCICP03CNM665S", 3),
      getObservations("BSCICP03INM665S", 3),
      getObservations("USALOLITONOSTSAM", 3),
      getObservations("GBRLOLITONOSTSAM", 3),
      getObservations("JPNLOLITONOSTSAM", 3),
      getObservations("CHNLOLITONOSTSAM", 3),
      getObservations("INDLOLITONOSTSAM", 3),
      getObservations("OECDLOLITONOSTSAM", 3),
      getLatestValue("ECBDFR"),
      getLatestValue("IUDSOIA"),
      getObservations("CP0000EZ19M086NEST", 14),
      getObservations("JPNCPIALLMINMEI", 14),
      getObservations("GBRCPIALLMINMEI", 14),
      getObservations("CHNCPIALLMINMEI", 14),
      getLatestValue("LRHUTTTTEZM156S"),
      getLatestValue("DCOILBRENTEU"),
      getLatestValue("DEXUSEU"),
      getLatestValue("DEXJPUS"),
      getLatestValue("DEXCHUS"),
    ]);

    type GlobSig = "positive" | "neutral" | "warning" | "negative";

    function lvObs(r: PromiseSettledResult<{ value: string; date: string }[]>): { value: number; date: string } | null {
      if (r.status !== "fulfilled") return null;
      const obs = r.value.filter((o) => o.value !== ".");
      if (!obs.length) return null;
      const last = obs[obs.length - 1];
      const v = parseFloat(last.value);
      return isFinite(v) ? { value: v, date: last.date } : null;
    }

    function lv(r: PromiseSettledResult<{ value: number; date: string }>): { value: number; date: string } | null {
      return r.status === "fulfilled" ? r.value : null;
    }

    // OECD BCI/CLI centered at 100 → PMI-like centered at 50
    function toPmi(r: PromiseSettledResult<{ value: string; date: string }[]>): { value: number; date: string } | null {
      const v = lvObs(r);
      if (!v) return null;
      return { value: parseFloat((v.value - 50).toFixed(2)), date: v.date };
    }

    function yoyFromIdx(r: PromiseSettledResult<{ value: string; date: string }[]>): { value: number; date: string } | null {
      if (r.status !== "fulfilled") return null;
      const obs = r.value.filter((o) => o.value !== ".");
      if (obs.length < 13) return null;
      const latest   = parseFloat(obs[obs.length - 1].value);
      const yearAgo  = parseFloat(obs[obs.length - 13].value);
      if (!isFinite(latest) || !isFinite(yearAgo) || yearAgo === 0) return null;
      return { value: ((latest - yearAgo) / Math.abs(yearAgo)) * 100, date: obs[obs.length - 1].date };
    }

    type TrendColor = "emerald" | "blue" | "amber" | "red" | "teal" | "zinc";
    function computeTrend(mfg: { value: number } | null, composite: { value: number } | null): { trend: string; color: TrendColor } {
      const m = mfg?.value ?? null;
      const c = composite?.value ?? null;
      if (m === null && c === null) return { trend: "No Data", color: "zinc" };
      if (m !== null && c !== null) {
        if (m >= 50 && c >= 50) {
          if (c - m >= 1.5) return { trend: "Services Led",  color: "blue" };
          if (m - c >= 1.5) return { trend: "Mfg Led",       color: "teal" };
          return { trend: "Broad Growth", color: "emerald" };
        }
        if (m >= 50 && c < 50)  return { trend: "Mixed",    color: "amber" };
        if (m < 50  && c >= 50) return { trend: "Services Led", color: "blue" };
        const avg = (m + c) / 2;
        if (avg < 48) return { trend: "Contraction",  color: "red" };
        return { trend: "Weak / Mixed", color: "amber" };
      }
      const val = (m ?? c)!;
      if (val >= 51)   return { trend: "Expanding",   color: "emerald" };
      if (val >= 49.5) return { trend: "Neutral",      color: "blue" };
      if (val >= 48)   return { trend: "Softening",    color: "amber" };
      return { trend: "Contracting", color: "red" };
    }

    const fmtPmi  = (v: number) => v.toFixed(1);
    const fmtPct  = (v: number) => `${v.toFixed(2)}%`;
    const fmtYoY  = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

    function cpiSig(v: number):   { signal: GlobSig; status: string } {
      if (v <= 2.5) return { signal: "positive", status: "On Target" };
      if (v <= 3.5) return { signal: "neutral",  status: "Elevated"  };
      if (v <= 5.5) return { signal: "warning",  status: "High"      };
      return         { signal: "negative", status: "Very High" };
    }
    function ecbSig(v: number):   { signal: GlobSig; status: string } {
      if (v <= 1.5) return { signal: "positive", status: "Accommodative"    };
      if (v <= 2.5) return { signal: "neutral",  status: "Neutral"          };
      if (v <= 4.0) return { signal: "warning",  status: "Restrictive"      };
      return         { signal: "negative", status: "Very Restrictive" };
    }
    function soniaSig(v: number): { signal: GlobSig; status: string } {
      if (v <= 2.0) return { signal: "positive", status: "Accommodative" };
      if (v <= 3.5) return { signal: "neutral",  status: "Neutral"       };
      if (v <= 5.0) return { signal: "warning",  status: "Restrictive"   };
      return         { signal: "negative", status: "Very Restrictive" };
    }
    function unempSig(v: number): { signal: GlobSig; status: string } {
      if (v <= 7.0)  return { signal: "positive", status: "Low"      };
      if (v <= 9.0)  return { signal: "neutral",  status: "Moderate" };
      if (v <= 11.0) return { signal: "warning",  status: "Elevated" };
      return          { signal: "negative", status: "High"     };
    }
    function brentSig(v: number): { signal: GlobSig; status: string } {
      if (v <= 60)  return { signal: "positive", status: "Low"      };
      if (v <= 80)  return { signal: "neutral",  status: "Moderate" };
      if (v <= 100) return { signal: "warning",  status: "Elevated" };
      return         { signal: "negative", status: "High"     };
    }
    function eurusdSig(v: number): { signal: GlobSig; status: string } {
      if (v >= 1.10) return { signal: "positive", status: "Strong EUR" };
      if (v >= 1.05) return { signal: "neutral",  status: "Neutral"    };
      if (v >= 0.98) return { signal: "warning",  status: "Weak EUR"   };
      return          { signal: "negative", status: "Very Weak EUR" };
    }
    function jpySig(v: number): { signal: GlobSig; status: string } {
      if (v <= 130) return { signal: "positive", status: "Strong JPY"    };
      if (v <= 150) return { signal: "neutral",  status: "Moderate"      };
      if (v <= 160) return { signal: "warning",  status: "Weak JPY"      };
      return         { signal: "negative", status: "Very Weak JPY" };
    }
    function cnySig(v: number): { signal: GlobSig; status: string } {
      if (v <= 7.0) return { signal: "positive", status: "Stable CNY" };
      if (v <= 7.3) return { signal: "neutral",  status: "Moderate"   };
      return         { signal: "warning",  status: "Weak CNY"   };
    }

    function indRow(
      id: string, name: string, data: { value: number; date: string } | null,
      source: string, fmt: (v: number) => string,
      sig: (v: number) => { signal: GlobSig; status: string }, impact: string,
    ) {
      if (!data) return { id, name, value: null, formattedValue: "—", date: null, source, signal: null, status: "N/A", available: false, impact };
      const { signal, status } = sig(data.value);
      return { id, name, value: data.value, formattedValue: fmt(data.value), date: data.date, source, signal, status, available: true, impact };
    }

    function pmiRow(
      region: string, code: string, flag: string,
      mfg: { value: number; date: string } | null,
      composite: { value: number; date: string } | null,
    ) {
      const trend = computeTrend(mfg, composite);
      return {
        region, code, flag,
        mfg:       mfg       ? { value: mfg.value,       formatted: fmtPmi(mfg.value),       date: mfg.date,       available: true  } : { available: false },
        composite: composite ? { value: composite.value, formatted: fmtPmi(composite.value), date: composite.date, available: true  } : { available: false },
        trend: trend.trend, trendColor: trend.color,
      };
    }

    const usMfg  = toPmi(usBciRes);  const usComp   = toPmi(usCliRes);
    const ezMfg  = toPmi(ezBciRes);
    const gbMfg  = toPmi(gbBciRes);  const gbComp   = toPmi(gbCliRes);
    const jpMfg  = toPmi(jpBciRes);  const jpComp   = toPmi(jpCliRes);
    const cnMfg  = toPmi(cnBciRes);  const cnComp   = toPmi(cnCliRes);
    const inMfg  = toPmi(inBciRes);  const inComp   = toPmi(inCliRes);
    const oecdComp = toPmi(oecdCliRes);

    const ecb     = lv(ecbRes);
    const sonia   = lv(soniaRes);
    const ezCpi   = yoyFromIdx(ezHicpRes);
    const jpCpi   = yoyFromIdx(jpCpiRes);
    const gbCpi   = yoyFromIdx(gbCpiRes);
    const cnCpi   = yoyFromIdx(cnCpiRes);
    const ezUnemp = lv(ezUnempRes);
    const brent   = lv(brentRes);
    const eurusd  = lv(eurusdRes);
    const jpyusd  = lv(jpyusdRes);
    const cnyusd  = lv(cnyusdRes);

    res.json({
      pmiTable: [
        pmiRow("United States",   "US",    "🇺🇸", usMfg,  usComp),
        pmiRow("Eurozone",        "EZ",    "🇪🇺", ezMfg,  null),
        pmiRow("United Kingdom",  "UK",    "🇬🇧", gbMfg,  gbComp),
        pmiRow("Japan",           "JP",    "🇯🇵", jpMfg,  jpComp),
        pmiRow("China (Caixin)",  "CN",    "🇨🇳", cnMfg,  cnComp),
        pmiRow("India",           "IN",    "🇮🇳", inMfg,  inComp),
        pmiRow("Global Composite","WORLD", "🌍",  null,   oecdComp),
      ],
      indicators: [
        indRow("ecb",     "ECB Deposit Rate",       ecb,     "ECB",       fmtPct,               ecbSig,   "Drives Euro-area borrowing costs. Key signal for EUR-denominated bonds, bank margins, and European equity multiples."),
        indRow("boe",     "BoE SONIA Rate",          sonia,   "BoE",       fmtPct,               soniaSig, "UK overnight benchmark rate — primary signal for BoE monetary stance and GBP asset pricing."),
        indRow("ez_cpi",  "Eurozone CPI (YoY)",      ezCpi,   "Eurostat",  fmtYoY,               cpiSig,   "Main inflation gauge guiding ECB decisions. Above 3% sustains rate hikes; below 2% opens door to cuts."),
        indRow("jp_cpi",  "Japan CPI (YoY)",         jpCpi,   "MIC Japan", fmtYoY,               cpiSig,   "After decades of deflation, rising Japan CPI reshapes BoJ policy, JPY carry trades, and global bond markets."),
        indRow("gb_cpi",  "UK CPI (YoY)",            gbCpi,   "ONS",       fmtYoY,               cpiSig,   "Sticky UK inflation prolongs restrictive BoE policy, pressures GBP mortgages, and weighs on UK consumer spending."),
        indRow("cn_cpi",  "China CPI (YoY)",         cnCpi,   "NBS",       fmtYoY,               cpiSig,   "Low or negative China CPI signals domestic demand weakness and deflation risk — potentially exported globally via trade prices."),
        indRow("ez_unemp","Eurozone Unemployment",    ezUnemp, "Eurostat",  (v) => `${v.toFixed(1)}%`, unempSig, "Euro-area labor market health. Feeds into ECB wage-growth forecasts and inflation persistence assumptions."),
        indRow("brent",   "Brent Crude ($/bbl)",     brent,   "EIA",       (v) => `$${v.toFixed(1)}`,  brentSig, "Global oil benchmark. Rising prices lift CPI in every economy; falling prices can signal slowing global demand."),
        indRow("eurusd",  "EUR / USD",               eurusd,  "Fed",       (v) => v.toFixed(4),        eurusdSig,"Strong USD tightens global financial conditions; strong EUR signals European competitiveness and capital inflows."),
        indRow("jpyusd",  "USD / JPY",               jpyusd,  "Fed",       (v) => v.toFixed(2),        jpySig,   "Yen weakness signals risk-on carry trade; extreme weakness can trigger BoJ intervention and global volatility."),
        indRow("cnyusd",  "USD / CNY",               cnyusd,  "PBoC/Fed",  (v) => v.toFixed(4),        cnySig,   "Yuan management reflects PBoC stance. Sustained weakness exports deflation globally and pressures Asian FX peers."),
      ],
      pmiNote: "Mfg = OECD Business Confidence Index (BCI); Composite = OECD CLI Normalized. Both centered at 100 — displayed as PMI-equivalent (50 = neutral). Data typically lagged ~3–4 months.",
      lastRefreshed: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch global tab");
    res.status(500).json({ error: "Failed to fetch global data" });
  }
});

export default router;
