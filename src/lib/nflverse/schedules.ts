import { fetchText, num, numOrNull, str } from "@/lib/nflverse/client";
import { parseCsv } from "@/lib/nflverse/csv";
import type { ScheduleGame } from "@/lib/types";

export const SCHEDULES_PATH = "schedules/games.csv";

/** Equivalent of `nflreadpy.load_schedules([season])` for the columns the app uses. */
export async function loadSchedules(season: number): Promise<ScheduleGame[]> {
  const text = await fetchText(SCHEDULES_PATH);
  return parseCsv(text)
    .filter((r) => num(r.season, -1) === season)
    .map((r) => ({
      season: num(r.season),
      week: num(r.week),
      home_team: str(r.home_team),
      away_team: str(r.away_team),
      result: numOrNull(r.result),
    }));
}

export async function loadScheduleWeek(season: number, week: number): Promise<ScheduleGame[]> {
  const games = await loadSchedules(season);
  return games.filter((g) => g.week === week);
}

/** True when every game that week has a result, i.e. the week is finished. */
export function isWeekComplete(games: readonly ScheduleGame[]): boolean {
  return games.length > 0 && games.every((g) => g.result !== null);
}
