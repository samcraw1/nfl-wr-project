/**
 * Supabase Storage uploads (port of legacy/storage.py). Files are written as
 * parquet so anything that read the Python-era files keeps working.
 *
 * Not ported: `upload_model` (joblib is Python-specific; see the plan, §8.1).
 */
import { parquetWriteBuffer, type ColumnSource } from "hyparquet-writer";
import { getClient } from "@/lib/db/client";
import type { WrWeekStats } from "@/lib/types";

export const BUCKET = "wr-data";

async function uploadBytes(path: string, data: ArrayBuffer, contentType: string): Promise<string> {
  const { error } = await getClient()
    .storage.from(BUCKET)
    .upload(path, data, { contentType, upsert: true });
  if (error) throw new Error(`Supabase storage: ${error.message}`);
  return path;
}

/** Column-orient rows for hyparquet-writer, in the key order of the first row. */
export function toColumnData<T extends object>(
  rows: readonly T[],
  types: Partial<Record<keyof T, ColumnSource["type"]>> = {},
): ColumnSource[] {
  const first = rows[0];
  if (!first) return [];
  return (Object.keys(first) as (keyof T & string)[]).map((name) => {
    const col: ColumnSource = { name, data: rows.map((r) => r[name] ?? null) };
    const type = types[name];
    if (type) col.type = type;
    return col;
  });
}

export async function uploadParquet<T extends object>(
  path: string,
  rows: readonly T[],
  types?: Partial<Record<keyof T, ColumnSource["type"]>>,
): Promise<string> {
  const buffer = parquetWriteBuffer({ columnData: toColumnData(rows, types) });
  return uploadBytes(path, buffer, "application/octet-stream");
}

const WR_STATS_TYPES: Partial<Record<keyof WrWeekStats, ColumnSource["type"]>> = {
  player_id: "STRING",
  player_display_name: "STRING",
  position: "STRING",
  team: "STRING",
  season: "INT32",
  week: "INT32",
  opponent_team: "STRING",
  receptions: "INT32",
  targets: "INT32",
  receiving_yards: "INT32",
  receiving_tds: "INT32",
  receiving_yards_after_catch: "INT32",
  receiving_air_yards: "INT32",
  receiving_first_downs: "INT32",
  receiving_fumbles_lost: "INT32",
  target_share: "DOUBLE",
};

/** raw/{season}/week-{week}.parquet: the WR rows a week was scored from. */
export function uploadRawWeek(
  rows: readonly WrWeekStats[],
  season: number,
  week: number,
): Promise<string> {
  return uploadParquet(`raw/${season}/week-${week}.parquet`, rows, WR_STATS_TYPES);
}

/** processed/training-data.parquet */
export function uploadTrainingData<T extends object>(rows: readonly T[]): Promise<string> {
  return uploadParquet("processed/training-data.parquet", rows);
}
