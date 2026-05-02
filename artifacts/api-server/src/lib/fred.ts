import { logger } from "./logger";

const FRED_BASE = "https://api.stlouisfed.org/fred";
const API_KEY = process.env["FRED_API_KEY"];

if (!API_KEY) {
  logger.warn("FRED_API_KEY is not set — FRED requests will fail");
}

export interface FredObservation {
  date: string;
  value: string;
}

export interface FredSeriesInfo {
  id: string;
  title: string;
  units: string;
  frequency: string;
  frequency_short: string;
  seasonal_adjustment: string;
}

// ─── In-memory cache (5 min TTL) ───────────────────────────────────────────
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Concurrency limiter (max 4 parallel FRED requests) ────────────────────
let active = 0;
const queue: Array<() => void> = [];
const MAX_CONCURRENT = 4;

function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => queue.push(resolve));
}

function releaseSlot(): void {
  const next = queue.shift();
  if (next) {
    next();
  } else {
    active--;
  }
}

// ─── Core fetch with cache + retry + concurrency ───────────────────────────
async function fredFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${FRED_BASE}${path}`);
  url.searchParams.set("api_key", API_KEY ?? "");
  url.searchParams.set("file_type", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const cacheKey = `${path}?${new URLSearchParams(params).toString()}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  await acquireSlot();
  try {
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
      try {
        const res = await fetch(url.toString());
        if (!res.ok) {
          const body = await res.text();
          const err = new Error(`FRED API error ${res.status} for ${path}: ${body.slice(0, 200)}`);
          // Don't retry 4xx errors
          if (res.status >= 400 && res.status < 500) throw err;
          throw err;
        }
        const data = (await res.json()) as T;
        setCached(cacheKey, data);
        return data;
      } catch (err) {
        lastErr = err as Error;
        const is4xx = lastErr.message.includes(" 400 ") || lastErr.message.includes(" 404 ") || lastErr.message.includes(" 403 ");
        if (is4xx) throw lastErr;
        if (attempt < 2) {
          logger.warn({ attempt, path, msg: lastErr.message }, "FRED request failed, retrying");
        }
      }
    }
    throw lastErr ?? new Error("FRED fetch failed after retries");
  } finally {
    releaseSlot();
  }
}

// ─── Public helpers ────────────────────────────────────────────────────────
export async function getSeriesInfo(seriesId: string): Promise<FredSeriesInfo> {
  const data = await fredFetch<{ seriess: FredSeriesInfo[] }>("/series", { series_id: seriesId });
  return data.seriess[0];
}

export async function getObservations(
  seriesId: string,
  limit = 60,
): Promise<FredObservation[]> {
  const data = await fredFetch<{ observations: FredObservation[] }>("/series/observations", {
    series_id: seriesId,
    sort_order: "desc",
    limit: String(limit),
    observation_start: "1990-01-01",
  });
  return data.observations
    .filter((o) => o.value !== ".")
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getLatestValue(seriesId: string): Promise<{ value: number; date: string }> {
  const obs = await getObservations(seriesId, 5);
  const valid = obs.filter((o) => o.value !== ".").reverse();
  if (!valid.length) throw new Error(`No valid observations for ${seriesId}`);
  return { value: parseFloat(valid[0].value), date: valid[0].date };
}

export async function buildSeriesHistory(
  seriesId: string,
  limit = 60,
): Promise<{
  seriesId: string;
  title: string;
  units: string;
  frequency: string;
  observations: { date: string; value: number }[];
  latestValue: number;
  latestDate: string;
}> {
  const [info, obs] = await Promise.all([getSeriesInfo(seriesId), getObservations(seriesId, limit)]);
  const parsed = obs.map((o) => ({ date: o.date, value: parseFloat(o.value) }));
  const latest = parsed[parsed.length - 1];
  return {
    seriesId,
    title: info.title,
    units: info.units,
    frequency: info.frequency,
    observations: parsed,
    latestValue: latest.value,
    latestDate: latest.date,
  };
}
