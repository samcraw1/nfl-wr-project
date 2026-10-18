import { fetchParquet, num, str } from "@/lib/nflverse/client";
import type { WrWeekStats } from "@/lib/types";

const COLUMNS = [
  "player_id",
  "player_display_name",
  "position",
  "team",
  "season",
  "week",
  "opponent_team",
  "receptions",
  "targets",
  "receiving_yards",
  "receiving_tds",
  "receiving_yards_after_catch",
  "receiving_air_yards",
  "receiving_first_downs",
  "receiving_fumbles_lost",
  "target_share",
] as const;

export function playerStatsPath(season: number): string {
  return `stats_player/stats_player_week_${season}.parquet`;
}

/**
 * Equivalent of `nflreadpy.load_player_stats([season])` restricted to the
 * columns the app uses. Null counting stats are coerced to 0 (the legacy
 * Polars code would have produced a null score instead; nflverse does not
 * emit nulls for these columns in practice).
 */
export async function loadPlayerStats(season: number): Promise<WrWeekStats[]> {
  const rows = await fetchParquet(playerStatsPath(season), COLUMNS);
  return rows
    .filter((r) => r.player_id !== null && r.player_id !== undefined)
    .map((r) => ({
      player_id: str(r.player_id),
      player_display_name: str(r.player_display_name),
      position: str(r.position),
      team: str(r.team),
      season: num(r.season),
      week: num(r.week),
      opponent_team: r.opponent_team == null ? null : str(r.opponent_team),
      receptions: num(r.receptions),
      targets: num(r.targets),
      receiving_yards: num(r.receiving_yards),
      receiving_tds: num(r.receiving_tds),
      receiving_yards_after_catch: num(r.receiving_yards_after_catch),
      receiving_air_yards: num(r.receiving_air_yards),
      receiving_first_downs: num(r.receiving_first_downs),
      receiving_fumbles_lost: num(r.receiving_fumbles_lost),
      target_share: num(r.target_share),
    }));
}

/** WR rows for one week. */
export async function loadWrWeek(season: number, week: number): Promise<WrWeekStats[]> {
  const all = await loadPlayerStats(season);
  return all.filter((r) => r.position === "WR" && r.week === week);
}

/** WR rows for every week of a season (regular season + playoffs). */
export async function loadWrSeason(season: number): Promise<WrWeekStats[]> {
  const all = await loadPlayerStats(season);
  return all.filter((r) => r.position === "WR");
}
