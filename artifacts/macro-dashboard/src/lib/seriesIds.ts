export const SERIES_ID_MAP: Record<string, string> = {
  // ── Overview signals ──────────────────────────────────────────────────────
  yield_curve:    "T10Y2Y",
  hy_spreads:     "BAMLH0A0HYM2",
  labor:          "PAYEMS",
  recession_prob: "RECPROUSM156N",

  // ── Overview keyReadings ───────────────────────────────────────────────────
  gdp:      "A191RL1Q225SBEA",
  cpi:      "CPIAUCSL",
  unrate:   "UNRATE",
  fedfunds: "FEDFUNDS",
  t10y:     "DGS10",
  indpro:   "INDPRO",

  // ── Growth indicators ──────────────────────────────────────────────────────
  gdpnow:       "",
  ism_mfg:      "BSCICP03USM665S",
  ism_svc:      "CFNAIMA3",
  sp_pmi:       "USALOLITONOSTSAM",
  cb_lei:       "USSLIND",
  retail_ex_auto: "RSXFS",
  durable_goods:  "DGORDER",
  permits:        "PERMIT",

  // ── Inflation components ───────────────────────────────────────────────────
  shelter:      "CUSR0000SAH1",
  supercore:    "CUSR0000SASLE",
  food_home:    "CUSR0000SAF11",
  energy:       "CPIENGSL",
  new_vehicles: "CUUR0000SETA01",

  // ── Inflation data suite ───────────────────────────────────────────────────
  core_cpi:  "CPILFESL",
  pce:       "PCEPI",
  core_pce:  "PCEPILFE",
  ppi:       "PPIFID",
  import_px: "",
  t5yifr:    "T5YIFR",
  mich:      "MICH",
  oer:       "CUSR0000SEHC",

  // ── Labor health cards ─────────────────────────────────────────────────────
  nfpMoM:  "PAYEMS",
  aweYoY:  "CES0500000003",
  jolts:   "JTSJOL",

  // ── Labor suite ───────────────────────────────────────────────────────────
  nfp:        "PAYEMS",
  adp:        "ADPWNUSNERSA",
  u6:         "U6RATE",
  civpart:    "CIVPART",
  primeage:   "LNS11300060",
  quits:      "JTSQUR",
  icsa:       "ICSA",
  ccsa:       "CCSA",
  challenger: "",
  awht:       "AWHAETP",

  // ── Financial rate cards ───────────────────────────────────────────────────
  ff:     "FEDFUNDS",
  t2y:    "DGS2",
  spread: "T10Y2Y",

  // ── Financial suite ───────────────────────────────────────────────────────
  mortgage: "MORTGAGE30US",
  hy:       "BAMLH0A0HYM2",
  ig:       "BAMLC0A0CM",
  nfci:     "NFCI",
  goldman:  "",
  vix:      "VIXCLS",
  ted:      "TEDRATE",
  dxy:      "DTWEXBGS",
  wti:      "DCOILWTICO",
  m2:       "M2SL",

  // ── Global indicators ─────────────────────────────────────────────────────
  ecb:      "ECBDFR",
  boe:      "IUDSOIA",
  ez_cpi:   "CP0000EZ19M086NEST",
  jp_cpi:   "JPNCPIALLMINMEI",
  gb_cpi:   "GBRCPIALLMINMEI",
  cn_cpi:   "CHNCPIALLMINMEI",
  ez_unemp: "LRHUTTTTEZM156S",
  brent:    "DCOILBRENTEU",
  eurusd:   "DEXUSEU",
  jpyusd:   "DEXJPUS",
  cnyusd:   "DEXCHUS",
};

export function getSeriesId(id: string): string | null {
  const v = SERIES_ID_MAP[id];
  return v && v.length > 0 ? v : null;
}
