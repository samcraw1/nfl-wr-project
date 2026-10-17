import RankingsTable from "@/components/RankingsTable";
import Scoreboard from "@/components/Scoreboard";
import WrSearch from "@/components/WrSearch";
import { CURRENT_SEASON, PREDICTIONS_WEEK, RANKINGS_WEEK, STANDINGS_SEASON } from "@/lib/config";
import {
  getCurrentWeekLeaders,
  getPredictions,
  getSeasonRankings,
  getSeasonTotalSeasons,
  getWeeklyRankingsWithStats,
  getWeeklySeasons,
} from "@/lib/db/reads";
import {
  currentWeek,
  fetchScoreboard,
  weekOptions,
  type EspnScoreboard,
} from "@/lib/espn/scoreboard";

export const dynamic = "force-dynamic";

async function loadScoreboard() {
  let initial: EspnScoreboard | null = null;
  try {
    initial = await fetchScoreboard({}, { next: { revalidate: 60 } });
  } catch {
    initial = null;
  }
  const options = initial ? weekOptions(initial) : [];
  const now = initial ? currentWeek(initial) : {};
  const defaultOption =
    options.find((o) => o.seasonType === now.seasonType && o.week === now.week) ??
    options[0] ??
    null;
  return { initial, options, defaultOption, year: now.year };
}

export default async function Page() {
  const [
    scoreboard,
    seasonRankings,
    weekRankings,
    predictions,
    leaders,
    weeklySeasons,
    seasonTotalSeasons,
  ] = await Promise.all([
    loadScoreboard(),
    getSeasonRankings(STANDINGS_SEASON),
    getWeeklyRankingsWithStats(CURRENT_SEASON, RANKINGS_WEEK),
    getPredictions(CURRENT_SEASON, PREDICTIONS_WEEK),
    getCurrentWeekLeaders(CURRENT_SEASON),
    getWeeklySeasons(),
    getSeasonTotalSeasons(),
  ]);

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-4">
      <Scoreboard {...scoreboard} />

      <WrSearch weeklySeasons={weeklySeasons} seasonTotalSeasons={seasonTotalSeasons} />

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-4">
        <Panel title={`${STANDINGS_SEASON} Top WR Standings`}>
          <RankingsTable
            rows={seasonRankings}
            preferredColumns={[
              "player_display_name",
              "season",
              "total_score",
              "receptions",
              "receiving_yards",
              "receiving_tds",
            ]}
          />
        </Panel>

        <Panel title={`Week ${RANKINGS_WEEK} Rankings`}>
          <RankingsTable
            rows={weekRankings}
            preferredColumns={[
              "total_score",
              "rank",
              "player_display_name",
              "receptions",
              "receiving_yards",
              "receiving_tds",
            ]}
          />
        </Panel>

        <Panel title={`Week ${PREDICTIONS_WEEK} Predictions`}>
          <RankingsTable
            rows={predictions}
            preferredColumns={["player_display_name", "predicted_score"]}
          />
        </Panel>

        <Panel title="Current Week Leaders">
          <RankingsTable
            rows={leaders}
            preferredColumns={[
              "current_week_score",
              "total_score",
              "rank",
              "player_display_name",
              "receptions",
              "receiving_yards",
              "receiving_tds",
            ]}
            emptyMessage="No current week data available yet"
          />
        </Panel>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
