import type { Json, TablesInsert } from "@/lib/db/database.types";
import { getClient, unwrap } from "@/lib/db/client";

export type PlayerInsert = TablesInsert<"players">;
export type WeeklyStatsInsert = TablesInsert<"weekly_wr_stats">;
export type WeeklyRankingInsert = TablesInsert<"weekly_rankings">;
export type PredictionInsert = TablesInsert<"predictions">;
export type SeasonRankingInsert = TablesInsert<"season_rankings">;
export type ModelResultInsert = TablesInsert<"model_results">;

/** Upsert players, de-duplicated by player_id (first occurrence wins). */
export async function upsertPlayers(
  rows: readonly Pick<PlayerInsert, "player_id" | "player_display_name" | "position">[],
): Promise<void> {
  const unique = new Map<string, PlayerInsert>();
  for (const r of rows) {
    if (unique.has(r.player_id)) continue;
    // Callers pass full stats rows; keep only the columns the players table has.
    unique.set(r.player_id, {
      player_id: r.player_id,
      player_display_name: r.player_display_name,
      position: r.position,
    });
  }
  if (unique.size === 0) return;
  unwrap(
    await getClient()
      .from("players")
      .upsert([...unique.values()], { onConflict: "player_id" })
      .select("player_id"),
  );
}

export async function upsertWeeklyStats(rows: readonly WeeklyStatsInsert[]): Promise<void> {
  if (rows.length === 0) return;
  unwrap(
    await getClient()
      .from("weekly_wr_stats")
      .upsert([...rows], { onConflict: "player_id,season,week" })
      .select("id"),
  );
}

export async function upsertWeeklyRankings(rows: readonly WeeklyRankingInsert[]): Promise<void> {
  if (rows.length === 0) return;
  unwrap(
    await getClient()
      .from("weekly_rankings")
      .upsert([...rows], { onConflict: "player_id,season,week" })
      .select("id"),
  );
}

export async function upsertPredictions(rows: readonly PredictionInsert[]): Promise<void> {
  if (rows.length === 0) return;
  unwrap(
    await getClient()
      .from("predictions")
      .upsert([...rows], { onConflict: "player_id,season,week" })
      .select("id"),
  );
}

export async function upsertSeasonRankings(rows: readonly SeasonRankingInsert[]): Promise<void> {
  if (rows.length === 0) return;
  unwrap(
    await getClient()
      .from("season_rankings")
      .upsert([...rows], { onConflict: "player_id,season" })
      .select("id"),
  );
}

export interface ModelResult {
  modelVersion: string;
  modelType?: string | null;
  targetColumn?: string | null;
  featureColumns?: Json | null;
  hyperparameters?: Json | null;
  trainSeasonStart?: number | null;
  trainSeasonEnd?: number | null;
  testSeasonStart?: number | null;
  testSeasonEnd?: number | null;
  mae?: number | null;
  rmse?: number | null;
  top15Accuracy?: number | null;
  modelFilePath?: string | null;
}

/** Port of legacy `record_model_result`. Nothing calls this yet (no ML pipeline). */
export async function recordModelResult(m: ModelResult): Promise<void> {
  const row: ModelResultInsert = {
    model_version: m.modelVersion,
    model_type: m.modelType ?? null,
    target_column: m.targetColumn ?? null,
    feature_columns: m.featureColumns ?? null,
    hyperparameters: m.hyperparameters ?? null,
    train_season_start: m.trainSeasonStart ?? null,
    train_season_end: m.trainSeasonEnd ?? null,
    test_season_start: m.testSeasonStart ?? null,
    test_season_end: m.testSeasonEnd ?? null,
    mae: m.mae ?? null,
    rmse: m.rmse ?? null,
    top_15_accuracy: m.top15Accuracy ?? null,
    model_file_path: m.modelFilePath ?? null,
  };
  unwrap(
    await getClient()
      .from("model_results")
      .upsert(row, { onConflict: "model_version" })
      .select("id"),
  );
}

export async function getModelResultId(modelVersion: string): Promise<number> {
  const { data, error } = await getClient()
    .from("model_results")
    .select("id")
    .eq("model_version", modelVersion)
    .single();
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data.id;
}
