import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { DropsRow, ScheduleGame, ScoredRow, WrWeekStats } from "@/lib/types";

export function loadFixture<T>(relativePath: string): T {
  const url = new URL(`./fixtures/${relativePath}`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as T;
}

/** Shape of tests/fixtures/weeks/*.json as dumped by legacy/tools/dump_fixtures.py. */
export interface WeekFixture {
  season: number;
  week: number;
  wr_stats: WrWeekStats[];
  drops: DropsRow[];
  schedule: ScheduleGame[];
  scored: ScoredRow[];
  live_rows: (Omit<ScoredRow, "total_score"> & {
    rank: number;
    current_week_score: number;
    season: number;
    week: number;
  })[];
}

export const WEEK_FIXTURES = ["2025-w1", "2025-w9", "2025-w16", "2025-w17", "2025-w18", "2026-w1"];

export function loadWeek(name: string): WeekFixture {
  return loadFixture<WeekFixture>(`weeks/${name}.json`);
}

/** Deterministic order for comparing frames whose sort was not stable in Polars. */
export function byScoreThenName<T extends { player_display_name: string }>(
  key: (row: T) => number,
): (a: T, b: T) => number {
  return (a, b) => key(b) - key(a) || a.player_display_name.localeCompare(b.player_display_name);
}

export function expectNonIncreasing(values: readonly number[]): void {
  for (let i = 1; i < values.length; i++) {
    if ((values[i] as number) > (values[i - 1] as number)) {
      throw new Error(`not sorted descending at index ${i}: ${values[i - 1]} then ${values[i]}`);
    }
  }
}
