/**
 * Port of legacy/opponent.py. Experimental: nothing in the app calls this yet,
 * exactly as nothing imported opponent.py. Kept so the idea is not lost.
 */
import type { PredictionRow, ScheduleGame, WrWeekStats } from "@/lib/types";

export function yardsAllowedPoints(yds: number): number {
  if (yds > 154) return 5;
  if (yds > 138) return 3;
  if (yds > 127) return 1;
  return 0;
}

export function tdsAllowedPoints(tds: number): number {
  if (tds > 1.0) return 5;
  if (tds > 0.9) return 3;
  if (tds > 0.75) return 1;
  return 0;
}

export function receptionsAllowedPoints(rec: number): number {
  if (rec > 11.8) return 5;
  if (rec > 11.2) return 3;
  if (rec > 10.2) return 1;
  return 0;
}

export interface DefenseMatchupScore {
  opponent_team: string;
  /** 0-15; higher = more favourable matchup for an opposing WR. */
  matchup_score: number;
}

/**
 * Per opponent team: average WR receiving yards / TDs / receptions allowed per
 * game over the given rows, converted to points and summed.
 */
export function calculateDefenseMatchupScores(
  stats: readonly Pick<
    WrWeekStats,
    "opponent_team" | "week" | "receiving_yards" | "receiving_tds" | "receptions"
  >[],
): DefenseMatchupScore[] {
  const perGame = new Map<string, Map<number, { yds: number; tds: number; rec: number }>>();
  for (const s of stats) {
    if (s.opponent_team == null) continue;
    const byWeek = perGame.get(s.opponent_team) ?? new Map();
    const g = byWeek.get(s.week) ?? { yds: 0, tds: 0, rec: 0 };
    g.yds += s.receiving_yards;
    g.tds += s.receiving_tds;
    g.rec += s.receptions;
    byWeek.set(s.week, g);
    perGame.set(s.opponent_team, byWeek);
  }

  const out: DefenseMatchupScore[] = [];
  for (const [opponent_team, byWeek] of perGame) {
    const games = [...byWeek.values()];
    const mean = (pick: (g: { yds: number; tds: number; rec: number }) => number) =>
      games.reduce((a, g) => a + pick(g), 0) / games.length;
    out.push({
      opponent_team,
      matchup_score:
        yardsAllowedPoints(mean((g) => g.yds)) +
        tdsAllowedPoints(mean((g) => g.tds)) +
        receptionsAllowedPoints(mean((g) => g.rec)),
    });
  }
  return out;
}

export function matchupAdjustment(matchupScore: number): number {
  if (matchupScore > 11) return 1.15;
  if (matchupScore > 7) return 1.05;
  if (matchupScore > 3) return 0.95;
  return 0.85;
}

export interface AdjustedPredictionRow extends PredictionRow {
  team: string | null;
  opponent_team: string | null;
  matchup_score: number | null;
  /** null when the player has no team / opponent / defense score (Polars left-join nulls). */
  adjustment: number | null;
  adjusted_predicted_score: number | null;
}

/**
 * Multiply each prediction by its opponent's matchup adjustment.
 * `wrTeams` maps display name -> team; `scheduleForWeek` is the slate being predicted.
 */
export function applyOpponentAdjustment(
  predictions: readonly PredictionRow[],
  wrTeams: ReadonlyMap<string, string>,
  scheduleForWeek: readonly ScheduleGame[],
  defenseScores: readonly DefenseMatchupScore[],
): AdjustedPredictionRow[] {
  const opponents = new Map<string, string>();
  for (const g of scheduleForWeek) {
    opponents.set(g.home_team, g.away_team);
    opponents.set(g.away_team, g.home_team);
  }
  const defense = new Map(defenseScores.map((d) => [d.opponent_team, d.matchup_score]));

  return predictions.map((p) => {
    const team = wrTeams.get(p.player_display_name) ?? null;
    const opponent_team = team === null ? null : (opponents.get(team) ?? null);
    const matchup_score = opponent_team === null ? null : (defense.get(opponent_team) ?? null);
    const adjustment = matchup_score === null ? null : matchupAdjustment(matchup_score);
    return {
      ...p,
      team,
      opponent_team,
      matchup_score,
      adjustment,
      adjusted_predicted_score: adjustment === null ? null : p.predicted_score * adjustment,
    };
  });
}
