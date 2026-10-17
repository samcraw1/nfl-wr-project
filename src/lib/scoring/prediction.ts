import type { PredictionRow, ScoreRow } from "@/lib/types";

/**
 * Average `total_score` across several scored frames, keeping only players that
 * appear in every frame (the legacy predictors inner-joined on display name, so
 * a player missing any week is dropped). Output order follows the first frame,
 * then sorts by `predicted_score` descending.
 *
 * This is the single implementation behind the three legacy predictors:
 * `predict_wr_performance` (3 recent weeks), and the two cold-start variants
 * (prior-season average + 1 or 2 current-season weeks).
 */
export function averagePredictedScore(frames: readonly (readonly ScoreRow[])[]): PredictionRow[] {
  if (frames.length === 0) return [];
  const [first, ...rest] = frames as [readonly ScoreRow[], ...(readonly ScoreRow[])[]];
  const lookups = rest.map(
    (frame) => new Map(frame.map((r) => [r.player_display_name, r.total_score] as const)),
  );

  const out: PredictionRow[] = [];
  for (const row of first) {
    const inputs = [row.total_score];
    let present = true;
    for (const lookup of lookups) {
      const score = lookup.get(row.player_display_name);
      if (score === undefined) {
        present = false;
        break;
      }
      inputs.push(score);
    }
    if (!present) continue;
    const predicted_score = inputs.reduce((a, b) => a + b, 0) / inputs.length;
    out.push({ player_display_name: row.player_display_name, inputs, predicted_score });
  }
  return out.sort((a, b) => b.predicted_score - a.predicted_score);
}

/** Legacy `predict_wr_performance(last_game, two_games_ago, three_games_ago)`. */
export function predictFromLastThreeWeeks(
  lastGame: readonly ScoreRow[],
  twoGamesAgo: readonly ScoreRow[],
  threeGamesAgo: readonly ScoreRow[],
): PredictionRow[] {
  return averagePredictedScore([lastGame, twoGamesAgo, threeGamesAgo]);
}

/** Legacy cold-start for week 2: prior-season average + week 1. */
export function predictWeekTwo(
  priorSeasonAverage: readonly ScoreRow[],
  week1: readonly ScoreRow[],
): PredictionRow[] {
  return averagePredictedScore([priorSeasonAverage, week1]);
}

/** Legacy cold-start for week 3: prior-season average + weeks 1 and 2. */
export function predictWeekThree(
  priorSeasonAverage: readonly ScoreRow[],
  week1: readonly ScoreRow[],
  week2: readonly ScoreRow[],
): PredictionRow[] {
  return averagePredictedScore([priorSeasonAverage, week1, week2]);
}
