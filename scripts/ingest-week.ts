/**
 * Score one week and, if every game that week has a result, persist it:
 * raw parquet to storage, players, weekly_wr_stats and weekly_rankings.
 * Port of legacy/wr.py.
 *
 *   pnpm ingest-week --season 2026 --week 2 [--dry-run] [--force]
 *   pnpm ingest-week --season 2026 --week next        # week after the last stored one
 *
 * --force persists even when the week is not complete.
 */
import { parseCli, printTable } from "./_cli";
import { TOP_N } from "@/lib/config";
import { getLatestWeek } from "@/lib/db/reads";
import { uploadRawWeek } from "@/lib/db/storage";
import { upsertPlayers, upsertWeeklyRankings, upsertWeeklyStats } from "@/lib/db/writes";
import { buildWeeklyRankingRows, buildWeeklyStatsRows } from "@/lib/ingest";
import { loadDropsWeek } from "@/lib/nflverse/pfrAdvstats";
import { loadWrWeek } from "@/lib/nflverse/playerStats";
import { isWeekComplete, loadScheduleWeek } from "@/lib/nflverse/schedules";
import { wr_formula } from "@/lib/scoring/formula";

async function main() {
  const { season, week, dryRun, force } = parseCli(process.argv.slice(2), { requireWeek: true });
  const wk = week === "next" ? ((await getLatestWeek(season)) ?? 0) + 1 : (week as number);

  const [wrStats, schedule, drops] = await Promise.all([
    loadWrWeek(season, wk),
    loadScheduleWeek(season, wk),
    loadDropsWeek(season, wk),
  ]);
  const complete = isWeekComplete(schedule);
  const scored = wr_formula(wrStats, drops);

  console.log(
    `\n${season} week ${wk}: ${wrStats.length} WRs, ${schedule.length} games, complete=${complete}\n`,
  );
  printTable(scored.slice(0, TOP_N), [
    "player_display_name",
    "receiving_yards",
    "receiving_tds",
    "receiving_yards_after_catch",
    "total_score",
  ]);
  console.log();
  printTable([...wrStats].sort((a, b) => b.receiving_yards - a.receiving_yards).slice(0, TOP_N), [
    "player_display_name",
    "team",
    "receiving_yards",
    "receptions",
    "receiving_tds",
  ]);

  if (!complete && !force) {
    console.log("\nWeek is not complete; nothing persisted (use --force to override).");
    return;
  }

  const statsRows = buildWeeklyStatsRows(wrStats, drops);
  const rankingRows = buildWeeklyRankingRows(scored, wrStats, season, wk);

  if (dryRun) {
    console.log(
      `\n--dry-run: would upload raw/${season}/week-${wk}.parquet (${wrStats.length} rows), ` +
        `upsert ${wrStats.length} players, ${statsRows.length} weekly_wr_stats, ${rankingRows.length} weekly_rankings.`,
    );
    console.log("sample weekly_wr_stats:", statsRows[0]);
    console.log("sample weekly_rankings:", rankingRows[0]);
    return;
  }

  await uploadRawWeek(wrStats, season, wk);
  await upsertPlayers(wrStats);
  await upsertWeeklyStats(statsRows);
  await upsertWeeklyRankings(rankingRows);
  console.log(`\nPersisted ${statsRows.length} stats rows and ${rankingRows.length} ranking rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
