/**
 * Port of legacy/live.py: score an in-progress week straight from nflverse,
 * bypassing the database.
 */
import { loadDropsWeek } from "@/lib/nflverse/pfrAdvstats";
import { loadWrWeek } from "@/lib/nflverse/playerStats";
import { sortByScoreDesc, wr_formula } from "@/lib/scoring/formula";
import type { LiveRow, ScoredRow } from "@/lib/types";
import { TOP_N } from "@/lib/config";

export async function loadScoredWrWeek(season: number, week: number): Promise<ScoredRow[]> {
  const [wr, drops] = await Promise.all([loadWrWeek(season, week), loadDropsWeek(season, week)]);
  return wr_formula(wr, drops);
}

/**
 * Rank the full scored pool, rename `total_score` -> `current_week_score` and
 * stamp season/week on each row.
 */
export function toCurrentWeekScoreRows(
  season: number,
  week: number,
  scored: readonly ScoredRow[],
): LiveRow[] {
  return sortByScoreDesc(scored).map((row, i) => {
    const { total_score, ...rest } = row;
    return { rank: i + 1, ...rest, current_week_score: total_score, season, week };
  });
}

export async function getLiveWeekLeaders(season: number, week: number): Promise<LiveRow[]> {
  const scored = await loadScoredWrWeek(season, week);
  return toCurrentWeekScoreRows(season, week, scored).slice(0, TOP_N);
}

export interface StatThresholds {
  minReceivingYards?: number;
  minReceivingTds?: number;
  minReceptions?: number;
}

export function matchesNameAndThresholds(
  row: {
    player_display_name: string;
    receiving_yards: number;
    receiving_tds: number;
    receptions: number;
  },
  name: string,
  { minReceivingYards = 0, minReceivingTds = 0, minReceptions = 0 }: StatThresholds,
): boolean {
  return (
    row.player_display_name.toLowerCase().includes(name.toLowerCase()) &&
    row.receiving_yards >= minReceivingYards &&
    row.receiving_tds >= minReceivingTds &&
    row.receptions >= minReceptions
  );
}

export async function searchLiveWrsByName(
  name: string,
  season: number,
  week: number,
  thresholds: StatThresholds = {},
): Promise<LiveRow[]> {
  const scored = await loadScoredWrWeek(season, week);
  return toCurrentWeekScoreRows(season, week, scored).filter((row) =>
    matchesNameAndThresholds(row, name, thresholds),
  );
}
