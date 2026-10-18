import { fetchParquet, num, numOrNull, str } from "@/lib/nflverse/client";
import type { DropsRow } from "@/lib/types";

const COLUMNS = ["pfr_player_name", "season", "week", "receiving_drop"] as const;

export function pfrRecAdvstatsPath(season: number): string {
  return `pfr_advstats/advstats_week_rec_${season}.parquet`;
}

/** Equivalent of `nflreadpy.load_pfr_advstats(seasons=[season], stat_type="rec")`. */
export async function loadRecAdvstats(season: number): Promise<DropsRow[]> {
  const rows = await fetchParquet(pfrRecAdvstatsPath(season), COLUMNS);
  return rows.map((r) => ({
    pfr_player_name: str(r.pfr_player_name),
    season: num(r.season),
    week: num(r.week),
    receiving_drop: numOrNull(r.receiving_drop),
  }));
}

export async function loadDropsWeek(season: number, week: number): Promise<DropsRow[]> {
  const all = await loadRecAdvstats(season);
  return all.filter((r) => r.week === week);
}
