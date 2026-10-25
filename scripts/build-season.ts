/**
 * Average a season's weekly WR scores into season_rankings. Port of legacy/season.py.
 *
 *   pnpm build-season --season 2025 [--dry-run]
 */
import { parseCli, printTable } from "./_cli";
import { upsertPlayers, upsertSeasonRankings, type SeasonRankingInsert } from "@/lib/db/writes";
import { nameToPlayerId } from "@/lib/ingest";
import { loadRecAdvstats } from "@/lib/nflverse/pfrAdvstats";
import { loadPlayerStats } from "@/lib/nflverse/playerStats";
import { seasonAverage } from "@/lib/scoring/season";
import { sortByScoreDesc } from "@/lib/scoring/formula";
import { TOP_N } from "@/lib/config";

async function main() {
  const { season, dryRun } = parseCli(process.argv.slice(2), { requireWeek: false });

  const [allStats, drops] = await Promise.all([loadPlayerStats(season), loadRecAdvstats(season)]);
  const wrStats = allStats.filter((r) => r.position === "WR");
  const averages = seasonAverage(wrStats, drops);

  // WR rows only: the same display name can belong to players at other positions.
  const ids = nameToPlayerId(wrStats);
  const rows: SeasonRankingInsert[] = [];
  for (const a of averages) {
    const player_id = ids.get(a.player_display_name);
    if (!player_id) {
      console.warn(`no player_id for ${a.player_display_name}; skipping`);
      continue;
    }
    rows.push({ player_id, season, ...a });
  }

  console.log(
    `\n${season}: ${averages.length} WRs averaged over ${new Set(wrStats.map((r) => r.week)).size} weeks\n`,
  );
  printTable(
    sortByScoreDesc(rows as (SeasonRankingInsert & { total_score: number })[]).slice(0, TOP_N),
    ["player_display_name", "total_score", "receptions", "receiving_yards", "receiving_tds"],
  );

  if (dryRun) {
    const uniquePlayers = new Set(allStats.map((r) => r.player_id)).size;
    console.log(
      `\n--dry-run: would upsert ${uniquePlayers} players and ${rows.length} season_rankings.`,
    );
    return;
  }

  await upsertPlayers(allStats);
  await upsertSeasonRankings(rows);
  console.log(`\nPersisted ${rows.length} season_rankings rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
