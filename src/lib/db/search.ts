/**
 * WR name search with the legacy fallback chain (db.search_wrs_by_name):
 *
 *   week given, rankings stored  -> weekly_rankings joined with weekly_wr_stats
 *   week given, nothing stored   -> live scoring from nflverse
 *   no week, season_rankings hit -> season_rankings
 *   no week, nothing stored, but weekly data exists
 *                                -> season-to-date aggregate of weekly tables
 */
import { getClient, selectAll, unwrap } from "@/lib/db/client";
import { getWeeklySeasons, weeklyRankingsExist } from "@/lib/db/reads";
import { matchesNameAndThresholds, searchLiveWrsByName, type StatThresholds } from "@/lib/live";
import type { LiveRow } from "@/lib/types";

export interface SeasonSearchRow {
  player_display_name: string;
  season: number;
  total_score: number | null;
  receptions: number | null;
  receiving_yards: number | null;
  receiving_tds: number | null;
}

export interface WeeklySearchRow {
  player_id: string;
  player_display_name: string | null;
  season: number;
  week: number;
  total_score: number | null;
  rank: number | null;
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
}

export type SearchResultRow = SeasonSearchRow | WeeklySearchRow | LiveRow;

export interface SearchParams extends StatThresholds {
  season?: number;
  /** undefined = season total */
  week?: number;
}

export async function searchWrsByName(
  name: string,
  { season = 2025, week, ...thresholds }: SearchParams = {},
): Promise<SearchResultRow[]> {
  const { minReceivingYards = 0, minReceivingTds = 0, minReceptions = 0 } = thresholds;

  if (week !== undefined) {
    return searchWeeklyWrsByName(name, season, week, thresholds);
  }

  const stored = unwrap(
    await getClient()
      .from("season_rankings")
      .select(
        "player_display_name, season, total_score, receptions, receiving_yards, receiving_tds",
      )
      .eq("season", season)
      .ilike("player_display_name", `%${name}%`)
      .gte("receiving_yards", minReceivingYards)
      .gte("receiving_tds", minReceivingTds)
      .gte("receptions", minReceptions)
      .order("total_score", { ascending: false }),
  );
  if (stored.length > 0) return stored;

  if ((await getWeeklySeasons()).includes(season)) {
    return searchSeasonToDateByName(name, season, thresholds);
  }
  return stored;
}

/**
 * Season-to-date totals per player from weekly_rankings + weekly_wr_stats, for
 * a season still in progress: average weekly total_score, summed counting stats.
 */
export async function aggregateSeasonFromWeekly(season: number): Promise<SeasonSearchRow[]> {
  const [rankings, stats] = await Promise.all([
    selectAll((from, to) =>
      getClient()
        .from("weekly_rankings")
        .select("player_id, player_display_name, season, week, total_score")
        .eq("season", season)
        .range(from, to),
    ),
    selectAll((from, to) =>
      getClient()
        .from("weekly_wr_stats")
        .select("player_id, week, receptions, receiving_yards, receiving_tds")
        .eq("season", season)
        .range(from, to),
    ),
  ]);
  const statsByKey = new Map(stats.map((s) => [`${s.player_id}|${s.week}`, s]));

  const totals = new Map<
    string,
    {
      name: string;
      scoreSum: number;
      weeks: number;
      receptions: number;
      receiving_yards: number;
      receiving_tds: number;
    }
  >();
  for (const r of rankings) {
    const entry = totals.get(r.player_id) ?? {
      name: r.player_display_name ?? "",
      scoreSum: 0,
      weeks: 0,
      receptions: 0,
      receiving_yards: 0,
      receiving_tds: 0,
    };
    entry.scoreSum += r.total_score ?? 0;
    entry.weeks += 1;
    const s = statsByKey.get(`${r.player_id}|${r.week}`);
    if (s) {
      entry.receptions += s.receptions ?? 0;
      entry.receiving_yards += s.receiving_yards ?? 0;
      entry.receiving_tds += s.receiving_tds ?? 0;
    }
    totals.set(r.player_id, entry);
  }

  return [...totals.values()].map((e) => ({
    player_display_name: e.name,
    season,
    total_score: e.scoreSum / e.weeks,
    receptions: e.receptions,
    receiving_yards: e.receiving_yards,
    receiving_tds: e.receiving_tds,
  }));
}

async function searchSeasonToDateByName(
  name: string,
  season: number,
  thresholds: StatThresholds,
): Promise<SeasonSearchRow[]> {
  const rows = (await aggregateSeasonFromWeekly(season)).filter((row) =>
    matchesNameAndThresholds(
      {
        player_display_name: row.player_display_name,
        receiving_yards: row.receiving_yards ?? 0,
        receiving_tds: row.receiving_tds ?? 0,
        receptions: row.receptions ?? 0,
      },
      name,
      thresholds,
    ),
  );
  return rows.sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0));
}

async function searchWeeklyWrsByName(
  name: string,
  season: number,
  week: number,
  thresholds: StatThresholds,
): Promise<WeeklySearchRow[] | LiveRow[]> {
  if (!(await weeklyRankingsExist(season, week))) {
    return searchLiveWrsByName(name, season, week, thresholds);
  }

  const rankings = unwrap(
    await getClient()
      .from("weekly_rankings")
      .select("player_id, player_display_name, season, week, total_score, rank")
      .eq("season", season)
      .eq("week", week)
      .ilike("player_display_name", `%${name}%`)
      .order("total_score", { ascending: false }),
  );
  if (rankings.length === 0) return [];

  const stats = unwrap(
    await getClient()
      .from("weekly_wr_stats")
      .select("player_id, receptions, receiving_yards, receiving_tds")
      .eq("season", season)
      .eq("week", week)
      .in(
        "player_id",
        rankings.map((r) => r.player_id),
      ),
  );
  const statsByPlayer = new Map(stats.map((s) => [s.player_id, s]));

  const { minReceivingYards = 0, minReceivingTds = 0, minReceptions = 0 } = thresholds;
  const out: WeeklySearchRow[] = [];
  for (const r of rankings) {
    const s = statsByPlayer.get(r.player_id);
    const row: WeeklySearchRow = {
      ...r,
      receptions: s?.receptions ?? 0,
      receiving_yards: s?.receiving_yards ?? 0,
      receiving_tds: s?.receiving_tds ?? 0,
    };
    if (
      row.receiving_yards >= minReceivingYards &&
      row.receiving_tds >= minReceivingTds &&
      row.receptions >= minReceptions
    ) {
      out.push(row);
    }
  }
  return out;
}
