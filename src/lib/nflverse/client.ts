/**
 * Replacement for the nflreadpy downloader: fetch nflverse GitHub release assets
 * and decode them in-process. Results are cached per URL for the lifetime of
 * the process so a request that scores a live week downloads each file once.
 */
import { parquetReadObjects } from "hyparquet";

export const NFLVERSE_BASE = "https://github.com/nflverse/nflverse-data/releases/download/";

const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let hit = cache.get(key) as Promise<T> | undefined;
  if (!hit) {
    hit = load().catch((err: unknown) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, hit);
  }
  return hit;
}

/** Drop everything cached. Tests and long-lived processes (the live week) use this. */
export function clearNflverseCache(): void {
  cache.clear();
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`nflverse download failed: ${res.status} ${res.statusText} ${url}`);
  return res.arrayBuffer();
}

/**
 * Read selected columns of a parquet release asset. `path` is relative to the
 * release root, e.g. `stats_player/stats_player_week_2025.parquet`.
 * BigInt values (parquet INT64) are converted to numbers.
 */
export function fetchParquet(
  path: string,
  columns: readonly string[],
): Promise<Record<string, unknown>[]> {
  const url = NFLVERSE_BASE + path;
  return cached(`${url}?${columns.join(",")}`, async () => {
    const file = await fetchBytes(url);
    const rows = await parquetReadObjects({ file, columns: [...columns] });
    for (const row of rows) {
      for (const key of columns) {
        const v = row[key];
        if (typeof v === "bigint") row[key] = Number(v);
      }
    }
    return rows;
  });
}

export function fetchText(path: string): Promise<string> {
  const url = NFLVERSE_BASE + path;
  return cached(url, async () => {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok)
      throw new Error(`nflverse download failed: ${res.status} ${res.statusText} ${url}`);
    return res.text();
  });
}

/** Coerce a decoded parquet/CSV value to a number, treating null/undefined/"" as `fallback`. */
export function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

export function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "" || v === "NA") return null;
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return Number.isNaN(n) ? null : n;
}

export function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}
