/**
 * Row builders for the weekly ingestion (legacy wr.py). Pure, so they can be
 * tested against the fixtures without touching the database.
 */
import type { WeeklyRankingInsert, WeeklyStatsInsert } from "@/lib/db/writes";
import { SCORE_BREAKDOWN_KEYS, type DropsRow, type ScoredRow, type WrWeekStats } from "@/lib/types";

/** Name -> player_id from a stats frame. Warns when one name maps to several ids. */
export function nameToPlayerId(
  rows: readonly { player_id: string; player_display_name: string }[],
  warn: (message: string) => void = console.warn,
): Map<string, string> {
  const map = new Map<string, string>();
  const ambiguous = new Set<string>();
  for (const r of rows) {
    const existing = map.get(r.player_display_name);
    if (existing === undefined) map.set(r.player_display_name, r.player_id);
    else if (existing !== r.player_id) ambiguous.add(r.player_display_name);
  }
  if (ambiguous.size > 0) {
    warn(
      `${ambiguous.size} display name(s) map to more than one player_id; first id used: ${[...ambiguous].join(", ")}`,
    );
  }
  return map;
}

/** weekly_wr_stats rows: the WR stats plus PFR drops joined on display name (0 when absent). */
export function buildWeeklyStatsRows(
  wrStats: readonly WrWeekStats[],
  drops: readonly DropsRow[],
): WeeklyStatsInsert[] {
  const dropsByName = new Map(drops.map((d) => [d.pfr_player_name, d.receiving_drop ?? 0]));
  return wrStats.map((s) => ({
    player_id: s.player_id,
    season: s.season,
    week: s.week,
    team: s.team,
    receptions: s.receptions,
    targets: s.targets,
    receiving_yards: s.receiving_yards,
    receiving_tds: s.receiving_tds,
    receiving_yards_after_catch: s.receiving_yards_after_catch,
    receiving_air_yards: s.receiving_air_yards,
    receiving_first_downs: s.receiving_first_downs,
    receiving_fumbles_lost: s.receiving_fumbles_lost,
    receiving_drop: dropsByName.get(s.player_display_name) ?? 0,
    target_share: s.target_share,
  }));
}

/** weekly_rankings rows: rank is the 1-based position in the score-sorted frame. */
export function buildWeeklyRankingRows(
  scored: readonly ScoredRow[],
  wrStats: readonly WrWeekStats[],
  season: number,
  week: number,
  warn: (message: string) => void = console.warn,
): WeeklyRankingInsert[] {
  const ids = nameToPlayerId(wrStats, warn);
  const rows: WeeklyRankingInsert[] = [];
  scored.forEach((row, i) => {
    const player_id = ids.get(row.player_display_name);
    if (!player_id) {
      warn(`no player_id for ${row.player_display_name}; skipping ranking row`);
      return;
    }
    rows.push({
      player_id,
      player_display_name: row.player_display_name,
      season,
      week,
      total_score: row.total_score,
      rank: i + 1,
      score_breakdown: Object.fromEntries(SCORE_BREAKDOWN_KEYS.map((k) => [k, row[k]])),
    });
  });
  return rows;
}
