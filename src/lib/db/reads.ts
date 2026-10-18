import { TOP_N } from "@/lib/config";
import { getClient, selectAll, unwrap } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";
import { getLiveWeekLeaders } from "@/lib/live";
import type { LiveRow } from "@/lib/types";

export type SeasonRanking = Tables<"season_rankings">;
export type WeeklyRanking = Tables<"weekly_rankings">;
export type WeeklyWrStats = Tables<"weekly_wr_stats">;

export interface WeeklyRankingWithStats extends WeeklyRanking {
  receptions: number | null;
  receiving_yards: number | null;
  receiving_tds: number | null;
  targets: number | null;
}

export interface PredictionWithName {
  player_id: string;
  season: number;
  week: number;
  predicted_score: number | null;
  player_display_name: string;
}

export type LeaderRow = LiveRow | WeeklyRankingWithStats;

/** Top 15 of a season's stored rankings. */
export async function getSeasonRankings(season: number): Promise<SeasonRanking[]> {
  return unwrap(
    await getClient()
      .from("season_rankings")
      .select("*")
      .eq("season", season)
      .order("total_score", { ascending: false })
      .limit(TOP_N),
  );
}

/** Highest week with stored rankings for the season, or null. */
export async function getLatestWeek(season: number): Promise<number | null> {
  const rows = unwrap(
    await getClient()
      .from("weekly_rankings")
      .select("week")
      .eq("season", season)
      .order("week", { ascending: false })
      .limit(1),
  );
  return rows[0]?.week ?? null;
}

/** Top 15 stored rankings for one week, by rank. */
export async function getWeeklyRankings(season: number, week: number): Promise<WeeklyRanking[]> {
  return unwrap(
    await getClient()
      .from("weekly_rankings")
      .select("*")
      .eq("season", season)
      .eq("week", week)
      .order("rank")
      .limit(TOP_N),
  );
}

export async function getWeeklyWrStats(season: number, week: number): Promise<WeeklyWrStats[]> {
  return unwrap(
    await getClient().from("weekly_wr_stats").select("*").eq("season", season).eq("week", week),
  );
}

/** Attach receptions / yards / TDs / targets from weekly_wr_stats to ranking rows. */
export function mergeStats(
  rankings: readonly WeeklyRanking[],
  stats: readonly WeeklyWrStats[],
): WeeklyRankingWithStats[] {
  const byPlayer = new Map(stats.map((s) => [s.player_id, s]));
  return rankings.map((r) => {
    const s = byPlayer.get(r.player_id);
    return {
      ...r,
      receptions: s?.receptions ?? null,
      receiving_yards: s?.receiving_yards ?? null,
      receiving_tds: s?.receiving_tds ?? null,
      targets: s?.targets ?? null,
    };
  });
}

export async function getWeeklyRankingsWithStats(
  season: number,
  week: number,
): Promise<WeeklyRankingWithStats[]> {
  const [rankings, stats] = await Promise.all([
    getWeeklyRankings(season, week),
    getWeeklyWrStats(season, week),
  ]);
  return mergeStats(rankings, stats);
}

/** Top 15 predictions for a week, with the player's display name joined in. */
export async function getPredictions(season: number, week: number): Promise<PredictionWithName[]> {
  const rows = unwrap(
    await getClient()
      .from("predictions")
      .select("player_id, season, week, predicted_score, players(player_display_name)")
      .eq("season", season)
      .eq("week", week)
      .order("predicted_score", { ascending: false })
      .limit(TOP_N),
  );
  return rows.map(({ players, ...rest }) => ({
    ...rest,
    player_display_name: players?.player_display_name ?? "",
  }));
}

/**
 * Leaders for the week after the last stored one, scored live from nflverse.
 * Falls back to the last stored week (merged with its stats) when nflverse has
 * nothing for the candidate week yet, or when the live load fails.
 */
export async function getCurrentWeekLeaders(season: number): Promise<LeaderRow[]> {
  const lastCompletedWeek = await getLatestWeek(season);
  const candidateWeek = (lastCompletedWeek ?? 0) + 1;

  try {
    const liveRows = await getLiveWeekLeaders(season, candidateWeek);
    if (liveRows.length > 0) return liveRows;
  } catch (err) {
    console.warn(`live leaders unavailable for ${season} week ${candidateWeek}:`, err);
  }

  if (lastCompletedWeek === null) return [];
  return getWeeklyRankingsWithStats(season, lastCompletedWeek);
}

export async function weeklyRankingsExist(season: number, week: number): Promise<boolean> {
  const rows = unwrap(
    await getClient()
      .from("weekly_rankings")
      .select("player_id")
      .eq("season", season)
      .eq("week", week)
      .limit(1),
  );
  return rows.length > 0;
}

/** Seasons that have week-by-week data (weekly_rankings). */
export async function getWeeklySeasons(): Promise<number[]> {
  const rows = await selectAll((from, to) =>
    getClient().from("weekly_rankings").select("season").range(from, to),
  );
  return [...new Set(rows.map((r) => r.season))].sort((a, b) => a - b);
}

/**
 * Seasons a "Season Total" search can run for: those stored in season_rankings
 * plus any that only have weekly data so far (aggregated on the fly by search).
 */
export async function getSeasonTotalSeasons(): Promise<number[]> {
  const [stored, weekly] = await Promise.all([
    selectAll((from, to) => getClient().from("season_rankings").select("season").range(from, to)),
    getWeeklySeasons(),
  ]);
  return [...new Set([...stored.map((r) => r.season), ...weekly])].sort((a, b) => a - b);
}
