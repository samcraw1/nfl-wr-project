import type { DropsRow, SeasonAverageRow, WrWeekStats } from "@/lib/types";
import { wr_formula } from "@/lib/scoring/formula";

/**
 * Port of legacy `prediction.calculate_2025_season_score_lol()`, parameterised.
 *
 * Runs `wr_formula` for every week present in `wrStats` (regular season and
 * playoffs alike), then per display name averages `total_score` and sums
 * receptions / receiving yards / receiving TDs. A player who played N weeks is
 * averaged over N, so a one-week wonder and a 17-game starter are compared on
 * per-game score.
 */
export function seasonAverage(
  wrStats: readonly WrWeekStats[],
  drops: readonly DropsRow[],
): SeasonAverageRow[] {
  const weeks = [...new Set(wrStats.map((r) => r.week))].sort((a, b) => a - b);

  const totals = new Map<
    string,
    {
      scoreSum: number;
      weeks: number;
      receptions: number;
      receiving_yards: number;
      receiving_tds: number;
    }
  >();

  for (const week of weeks) {
    const scored = wr_formula(
      wrStats.filter((r) => r.week === week),
      drops.filter((r) => r.week === week),
    );
    for (const row of scored) {
      const entry = totals.get(row.player_display_name) ?? {
        scoreSum: 0,
        weeks: 0,
        receptions: 0,
        receiving_yards: 0,
        receiving_tds: 0,
      };
      entry.scoreSum += row.total_score;
      entry.weeks += 1;
      entry.receptions += row.receptions;
      entry.receiving_yards += row.receiving_yards;
      entry.receiving_tds += row.receiving_tds;
      totals.set(row.player_display_name, entry);
    }
  }

  return [...totals.entries()].map(([player_display_name, t]) => ({
    player_display_name,
    total_score: t.scoreSum / t.weeks,
    receptions: t.receptions,
    receiving_yards: t.receiving_yards,
    receiving_tds: t.receiving_tds,
  }));
}
