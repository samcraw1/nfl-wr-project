import type { DropsRow, ScoredRow, WrWeekStats } from "@/lib/types";

export function wr_yac_points(yac: number): number {
  if (yac >= 50) return 5;
  if (yac >= 30) return 3;
  if (yac >= 15) return 1;
  return 0;
}

export function receiving_yards_points(receiving_yards: number): number {
  if (receiving_yards >= 150) return 5;
  if (receiving_yards >= 100) return 3;
  if (receiving_yards >= 50) return 1;
  return 0;
}

export function receiving_tds_points(receiving_tds: number): number {
  if (receiving_tds >= 2) return 5;
  if (receiving_tds >= 1) return 3;
  return 0;
}

export function receptions_points(receptions: number): number {
  if (receptions >= 7) return 5;
  if (receptions >= 5) return 3;
  if (receptions >= 3) return 1;
  return 0;
}

export function targets_points(targets: number): number {
  if (targets >= 10) return 5;
  if (targets >= 7) return 3;
  if (targets >= 4) return 1;
  return 0;
}

export function target_share_points(target_share: number): number {
  if (target_share >= 0.3) return 5;
  if (target_share >= 0.2) return 3;
  if (target_share >= 0.1) return 1;
  return 0;
}

export function receiving_air_yards_points(air_yards: number): number {
  if (air_yards >= 150) return 5;
  if (air_yards >= 100) return 3;
  if (air_yards >= 50) return 1;
  return 0;
}

export function receiving_first_downs_points(first_downs: number): number {
  if (first_downs >= 6) return 5;
  if (first_downs >= 4) return 3;
  if (first_downs >= 2) return 1;
  return 0;
}

export function receiving_fumbles_lost_points(fumbles_lost: number): number {
  if (fumbles_lost >= 1) return -3;
  return 0;
}

export function receiving_drop_points(drops: number): number {
  if (drops >= 2) return -3;
  if (drops === 1) return -1;
  return 0;
}

export function rushing_yards_points(rushing_yards: number): number {
  if (rushing_yards >= 100) return 5;
  if (rushing_yards >= 50) return 3;
  if (rushing_yards >= 25) return 2;
  if (rushing_yards >= 1) return 1;
  return 0;
}

export function rushing_tds_points(rushing_tds: number): number {
  if (rushing_tds >= 2) return 5;
  if (rushing_tds >= 1) return 3;
  if (rushing_tds > 0) return 1;
  return 0;
}

export function kickoff_return_yards_points(kickoff_return_yards: number): number {
  if (kickoff_return_yards >= 100) return 5;
  if (kickoff_return_yards >= 50) return 3;
  if (kickoff_return_yards >= 25) return 2;
  if (kickoff_return_yards >= 1) return 1;
  return 0;
}

// Covers both punt- and kickoff-return TDs. There is no kickoff-only TD column;
// the pt_* fields are punter stats (TDs allowed on that punter's punts), not returner stats.
export function special_teams_tds_points(special_teams_tds: number): number {
  if (special_teams_tds >= 2) return 5;
  if (special_teams_tds >= 1) return 3;
  return 0;
}

export function calculate_receiving_tds_points(wr_stats: readonly WrWeekStats[]) {
  return wr_stats.map((r) => ({
    player_display_name: r.player_display_name,
    receiving_tds: r.receiving_tds,
    receiving_tds_points: receiving_tds_points(r.receiving_tds),
  }));
}

export function calculate_receiving_yards_points(wr_stats: readonly WrWeekStats[]) {
  return wr_stats.map((r) => ({
    player_display_name: r.player_display_name,
    receiving_yards: r.receiving_yards,
    receiving_yards_points: receiving_yards_points(r.receiving_yards),
  }));
}

export function calculate_yac_points(wr_stats: readonly WrWeekStats[]) {
  return wr_stats.map((r) => ({
    player_display_name: r.player_display_name,
    receiving_yards_after_catch: r.receiving_yards_after_catch,
    yac_points: wr_yac_points(r.receiving_yards_after_catch),
  }));
}

export function calculate_receptions_points(wr_stats: readonly WrWeekStats[]) {
  return wr_stats.map((r) => ({
    player_display_name: r.player_display_name,
    receptions: r.receptions,
    receptions_points: receptions_points(r.receptions),
  }));
}

export function calculate_targets_points(wr_stats: readonly WrWeekStats[]) {
  return wr_stats.map((r) => ({
    player_display_name: r.player_display_name,
    targets: r.targets,
    targets_points: targets_points(r.targets),
  }));
}

export function calculate_target_share_points(wr_stats: readonly WrWeekStats[]) {
  return wr_stats.map((r) => ({
    player_display_name: r.player_display_name,
    target_share: r.target_share,
    target_share_points: target_share_points(r.target_share),
  }));
}

export function calculate_receiving_air_yards_points(wr_stats: readonly WrWeekStats[]) {
  return wr_stats.map((r) => ({
    player_display_name: r.player_display_name,
    receiving_air_yards: r.receiving_air_yards,
    receiving_air_yards_points: receiving_air_yards_points(r.receiving_air_yards),
  }));
}

export function calculate_receiving_first_downs_points(wr_stats: readonly WrWeekStats[]) {
  return wr_stats.map((r) => ({
    player_display_name: r.player_display_name,
    receiving_first_downs: r.receiving_first_downs,
    receiving_first_downs_points: receiving_first_downs_points(r.receiving_first_downs),
  }));
}

export function calculate_receiving_fumbles_lost_points(wr_stats: readonly WrWeekStats[]) {
  return wr_stats.map((r) => ({
    player_display_name: r.player_display_name,
    receiving_fumbles_lost: r.receiving_fumbles_lost,
    receiving_fumbles_lost_points: receiving_fumbles_lost_points(r.receiving_fumbles_lost),
  }));
}

export function calculate_receiving_drop_points(drops_df: readonly DropsRow[]) {
  return drops_df.map((r) => ({
    pfr_player_name: r.pfr_player_name,
    // A null drop count (PFR gap) scores as 0 drops.
    receiving_drop: r.receiving_drop ?? 0,
    receiving_drop_points: receiving_drop_points(r.receiving_drop ?? 0),
  }));
}

export function calculate_rushing_yards_points(
  rushing_stats: readonly { player_display_name: string; rushing_yards: number }[],
) {
  return rushing_stats.map((r) => ({
    player_display_name: r.player_display_name,
    rushing_yards: r.rushing_yards,
    rushing_yards_points: rushing_yards_points(r.rushing_yards),
  }));
}

export function calculate_rushing_tds_points(
  rushing_stats: readonly { player_display_name: string; rushing_tds: number }[],
) {
  return rushing_stats.map((r) => ({
    player_display_name: r.player_display_name,
    rushing_tds: r.rushing_tds,
    rushing_tds_points: rushing_tds_points(r.rushing_tds),
  }));
}

export function calculate_kickoff_return_yards_points(
  kickoff_return_stats: readonly { player_display_name: string; kickoff_return_yards: number }[],
) {
  return kickoff_return_stats.map((r) => ({
    player_display_name: r.player_display_name,
    kickoff_return_yards: r.kickoff_return_yards,
    kickoff_return_yards_points: kickoff_return_yards_points(r.kickoff_return_yards),
  }));
}

export function calculate_special_teams_tds_points(
  special_teams_stats: readonly { player_display_name: string; special_teams_tds: number }[],
) {
  return special_teams_stats.map((r) => ({
    player_display_name: r.player_display_name,
    special_teams_tds: r.special_teams_tds,
    special_teams_tds_points: special_teams_tds_points(r.special_teams_tds),
  }));
}

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
 *
 * The nine tables built from `wr_stats` share its row order, so the Python inner
 * joins on `player_display_name` become a row-wise zip here.
 */
export function wr_formula(
  wr_stats: readonly WrWeekStats[],
  drops_df: readonly DropsRow[],
): ScoredRow[] {
  const yac = calculate_yac_points(wr_stats);
  const yards = calculate_receiving_yards_points(wr_stats);
  const tds = calculate_receiving_tds_points(wr_stats);
  const receptions = calculate_receptions_points(wr_stats);
  const targets = calculate_targets_points(wr_stats);
  const target_share = calculate_target_share_points(wr_stats);
  const air_yards = calculate_receiving_air_yards_points(wr_stats);
  const first_downs = calculate_receiving_first_downs_points(wr_stats);
  const fumbles_lost = calculate_receiving_fumbles_lost_points(wr_stats);
  const drops = calculate_receiving_drop_points(drops_df);

  const drops_by_name = new Map<string, number[]>();
  for (const d of drops) {
    const list = drops_by_name.get(d.pfr_player_name);
    if (list) list.push(d.receiving_drop_points);
    else drops_by_name.set(d.pfr_player_name, [d.receiving_drop_points]);
  }

  const combined: ScoredRow[] = [];
  for (let i = 0; i < wr_stats.length; i++) {
    const row = {
      ...yac[i]!,
      ...yards[i]!,
      ...tds[i]!,
      ...receptions[i]!,
      ...targets[i]!,
      ...target_share[i]!,
      ...air_yards[i]!,
      ...first_downs[i]!,
      ...fumbles_lost[i]!,
    };
    // left join on drops; no PFR row -> fill_null(0)
    const matches = drops_by_name.get(row.player_display_name) ?? [0];
    for (const receiving_drop_points of matches) {
      combined.push({
        ...row,
        receiving_drop_points,
        total_score:
          row.yac_points +
          row.receiving_yards_points +
          row.receiving_tds_points +
          row.receptions_points +
          row.targets_points +
          row.target_share_points +
          row.receiving_air_yards_points +
          row.receiving_first_downs_points +
          row.receiving_fumbles_lost_points +
          receiving_drop_points,
      });
    }
  }

  return sortByScoreDesc(combined);
}
