/**
 * Write predictions for a week. Port of the script half of legacy/prediction.py,
 * generalised to any week:
 *
 *   week 2 -> average of (prior-season average, week 1)
 *   week 3 -> average of (prior-season average, week 1, week 2)
 *   week N -> average of weeks N-1, N-2, N-3
 *
 *   pnpm predict-week --season 2026 --week 2 [--dry-run]
 */
import { parseCli, printTable } from "./_cli";
import { upsertPredictions, type PredictionInsert } from "@/lib/db/writes";
import { nameToPlayerId } from "@/lib/ingest";
import { loadDropsWeek, loadRecAdvstats } from "@/lib/nflverse/pfrAdvstats";
import { loadPlayerStats, loadWrWeek } from "@/lib/nflverse/playerStats";
import {
  predictFromLastThreeWeeks,
  predictWeekThree,
  predictWeekTwo,
} from "@/lib/scoring/prediction";
import { seasonAverage } from "@/lib/scoring/season";
import { wrFormula } from "@/lib/scoring/wrFormula";
import type { PredictionRow, ScoredRow } from "@/lib/types";
import { TOP_N } from "@/lib/config";

async function scoredWeek(season: number, week: number): Promise<ScoredRow[]> {
  const [wr, drops] = await Promise.all([loadWrWeek(season, week), loadDropsWeek(season, week)]);
  return wrFormula(wr, drops);
}

async function priorSeasonAverage(season: number) {
  const [stats, drops] = await Promise.all([
    loadPlayerStats(season - 1),
    loadRecAdvstats(season - 1),
  ]);
  return seasonAverage(
    stats.filter((r) => r.position === "WR"),
    drops,
  );
}

export async function predictWeek(season: number, week: number): Promise<PredictionRow[]> {
  if (week < 2) throw new Error("Nothing to predict from before week 2.");
  if (week === 2) {
    const [prior, w1] = await Promise.all([priorSeasonAverage(season), scoredWeek(season, 1)]);
    return predictWeekTwo(prior, w1);
  }
  if (week === 3) {
    const [prior, w1, w2] = await Promise.all([
      priorSeasonAverage(season),
      scoredWeek(season, 1),
      scoredWeek(season, 2),
    ]);
    return predictWeekThree(prior, w1, w2);
  }
  const [last, two, three] = await Promise.all([
    scoredWeek(season, week - 1),
    scoredWeek(season, week - 2),
    scoredWeek(season, week - 3),
  ]);
  return predictFromLastThreeWeeks(last, two, three);
}

async function main() {
  const { season, week, dryRun } = parseCli(process.argv.slice(2), { requireWeek: true });
  if (week === "next") throw new Error("--week next is only supported by ingest-week");
  const wk = week as number;

  const predictions = await predictWeek(season, wk);
  console.log(`\n${season} week ${wk}: ${predictions.length} predictions\n`);
  printTable(predictions.slice(0, TOP_N), ["player_display_name", "predicted_score"]);

  // WR rows only: the same display name can belong to players at other positions.
  const ids = nameToPlayerId((await loadPlayerStats(season)).filter((r) => r.position === "WR"));
  const rows: PredictionInsert[] = [];
  for (const p of predictions) {
    const player_id = ids.get(p.player_display_name);
    if (!player_id) {
      console.warn(`no player_id for ${p.player_display_name}; skipping`);
      continue;
    }
    rows.push({ player_id, season, week: wk, predicted_score: p.predicted_score });
  }

  if (dryRun) {
    console.log(`\n--dry-run: would upsert ${rows.length} predictions.`);
    return;
  }
  await upsertPredictions(rows);
  console.log(`\nPersisted ${rows.length} predictions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
