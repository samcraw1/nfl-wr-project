import type { DropsRow, ScoredRow, WrWeekStats } from "@/lib/types";
import {
  receivingAirYardsPoints,
  receivingDropPoints,
  receivingFirstDownsPoints,
  receivingFumblesLostPoints,
  receivingTdsPoints,
  receivingYardsPoints,
  receptionsPoints,
  targetSharePoints,
  targetsPoints,
  yacPoints,
} from "@/lib/scoring/tiers";

/** Stable sort by `total_score` descending (ties keep input order). */
export function sortByScoreDesc<T extends { total_score: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => b.total_score - a.total_score);
}

/**
 * Port of legacy `formula.wr_formula(wr_stats, drops_df)`.
 *
 * Scores every WR row for one week and sorts by `total_score` descending.
 * Drops come from a separate PFR table and are joined on display name
 * (`pfr_player_name == player_display_name`); a WR with no PFR row gets 0 drop
 * points. Like the Polars left join it replaces, a WR whose name matches
 * several PFR rows is emitted once per match.
 */
export function wrFormula(
  wrStats: readonly WrWeekStats[],
  drops: readonly DropsRow[],
): ScoredRow[] {
  const dropsByName = new Map<string, DropsRow[]>();
  for (const d of drops) {
    const list = dropsByName.get(d.pfr_player_name);
    if (list) list.push(d);
    else dropsByName.set(d.pfr_player_name, [d]);
  }

  const scored: ScoredRow[] = [];
  for (const s of wrStats) {
    const matches = dropsByName.get(s.player_display_name);
    const dropPointValues = matches
      ? matches.map((m) => receivingDropPoints(m.receiving_drop ?? 0))
      : [0];
    for (const receiving_drop_points of dropPointValues) {
      scored.push(scoreRow(s, receiving_drop_points));
    }
  }
  return sortByScoreDesc(scored);
}

function scoreRow(s: WrWeekStats, receiving_drop_points: number): ScoredRow {
  const yac_points = yacPoints(s.receiving_yards_after_catch);
  const receiving_yards_points = receivingYardsPoints(s.receiving_yards);
  const receiving_tds_points = receivingTdsPoints(s.receiving_tds);
  const receptions_points = receptionsPoints(s.receptions);
  const targets_points = targetsPoints(s.targets);
  const target_share_points = targetSharePoints(s.target_share);
  const receiving_air_yards_points = receivingAirYardsPoints(s.receiving_air_yards);
  const receiving_first_downs_points = receivingFirstDownsPoints(s.receiving_first_downs);
  const receiving_fumbles_lost_points = receivingFumblesLostPoints(s.receiving_fumbles_lost);

  return {
    player_display_name: s.player_display_name,
    receiving_yards_after_catch: s.receiving_yards_after_catch,
    yac_points,
    receiving_yards: s.receiving_yards,
    receiving_yards_points,
    receiving_tds: s.receiving_tds,
    receiving_tds_points,
    receptions: s.receptions,
    receptions_points,
    targets: s.targets,
    targets_points,
    target_share: s.target_share,
    target_share_points,
    receiving_air_yards: s.receiving_air_yards,
    receiving_air_yards_points,
    receiving_first_downs: s.receiving_first_downs,
    receiving_first_downs_points,
    receiving_fumbles_lost: s.receiving_fumbles_lost,
    receiving_fumbles_lost_points,
    receiving_drop_points,
    total_score:
      yac_points +
      receiving_yards_points +
      receiving_tds_points +
      receptions_points +
      targets_points +
      target_share_points +
      receiving_air_yards_points +
      receiving_first_downs_points +
      receiving_fumbles_lost_points +
      receiving_drop_points,
  };
}
