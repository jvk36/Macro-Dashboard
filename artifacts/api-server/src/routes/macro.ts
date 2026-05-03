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
    const [nfp, unemploymentRate, participationRate, averageHourlyEarnings, joblessClaimsInitial, jolts] = await Promise.all([
      buildSeriesHistory(SERIES.NFP, 60),
      buildSeriesHistory(SERIES.UNRATE, 60),
      buildSeriesHistory(SERIES.PARTICIPATION, 60),
      buildSeriesHistory(SERIES.AWE, 60),
      buildSeriesHistory(SERIES.INITIAL_CLAIMS, 60),
      buildSeriesHistory(SERIES.JOLTS, 60),
    ]);
    res.json({ nfp, unemploymentRate, participationRate, averageHourlyEarnings, joblessClaimsInitial, jolts, keyReadings: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch labor tab");
    res.status(500).json({ error: "Failed to fetch labor data" });
  }
});

router.get("/macro/tab/financial", async (req, res) => {
  try {
    const [hySpread, igSpread, fedFundsRate, treasury10y, treasury2y] = await Promise.all([
      buildSeriesHistory(SERIES.HY_SPREAD, 60),
      buildSeriesHistory(SERIES.IG_SPREAD, 60),
      buildSeriesHistory(SERIES.FED_FUNDS, 60),
      buildSeriesHistory(SERIES.T10Y, 60),
      buildSeriesHistory(SERIES.T2Y, 60),
    ]);

    const maturities = [
      { maturity: "3M", years: 0.25, seriesId: SERIES.T3M },
      { maturity: "1Y", years: 1, seriesId: SERIES.T1Y },
      { maturity: "2Y", years: 2, seriesId: SERIES.T2Y },
      { maturity: "5Y", years: 5, seriesId: SERIES.T5Y },
      { maturity: "10Y", years: 10, seriesId: SERIES.T10Y },
      { maturity: "30Y", years: 30, seriesId: SERIES.T30Y },
    ];
    const [t10y2y, t10y3m, ...matVals] = await Promise.all([
      getLatestValue(SERIES.T10Y2Y),
      getLatestValue(SERIES.T10Y3M),
      ...maturities.map((m) => getLatestValue(m.seriesId)),
    ]);
    const spread2s10s = t10y2y.value * 100;
    const yieldCurve = {
      points: maturities.map((m, i) => ({ maturity: m.maturity, years: m.years, yield: matVals[i].value })),
      spread2s10s,
      spread3m10y: t10y3m.value * 100,
      isInverted: spread2s10s < 0,
      signal: (spread2s10s >= 50 ? "positive" : spread2s10s >= 0 ? "neutral" : spread2s10s >= -50 ? "warning" : "negative") as "positive" | "neutral" | "negative" | "warning",
      interpretation: spread2s10s < 0 ? "Yield curve inverted" : "Yield curve normal",
      asOf: t10y2y.date,
    };
    res.json({ hySpread, igSpread, fedFundsRate, treasury10y, treasury2y, yieldCurve, keyReadings: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch financial tab");
    res.status(500).json({ error: "Failed to fetch financial data" });
  }
});

export default router;
