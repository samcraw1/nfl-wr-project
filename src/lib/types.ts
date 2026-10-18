/**
 * Row shapes shared across the nflverse loader, scoring, live scoring and the
 * ingestion scripts. Only the columns the legacy Python code depended on.
 */

/** One WR row from nflverse `stats_player_week_{season}.parquet`. */
export interface WrWeekStats {
  player_id: string;
  player_display_name: string;
  position: string;
  team: string;
  season: number;
  week: number;
  opponent_team: string | null;
  receptions: number;
  targets: number;
  receiving_yards: number;
  receiving_tds: number;
  receiving_yards_after_catch: number;
  receiving_air_yards: number;
  receiving_first_downs: number;
  receiving_fumbles_lost: number;
  target_share: number;
}

/** One row from nflverse `advstats_week_rec_{season}.parquet` (PFR). */
export interface DropsRow {
  pfr_player_name: string;
  season: number;
  week: number;
  receiving_drop: number | null;
}

/** One game from nflverse `schedules/games.csv`. `result` is null until played. */
export interface ScheduleGame {
  season: number;
  week: number;
  home_team: string;
  away_team: string;
  result: number | null;
}

/** Output of `wrFormula`: the raw stats it scored, each tier result, and the sum. */
export interface ScoredRow {
  player_display_name: string;
  receiving_yards_after_catch: number;
  yac_points: number;
  receiving_yards: number;
  receiving_yards_points: number;
  receiving_tds: number;
  receiving_tds_points: number;
  receptions: number;
  receptions_points: number;
  targets: number;
  targets_points: number;
  target_share: number;
  target_share_points: number;
  receiving_air_yards: number;
  receiving_air_yards_points: number;
  receiving_first_downs: number;
  receiving_first_downs_points: number;
  receiving_fumbles_lost: number;
  receiving_fumbles_lost_points: number;
  receiving_drop_points: number;
  total_score: number;
}

export const SCORE_BREAKDOWN_KEYS = [
  "yac_points",
  "receiving_yards_points",
  "receiving_tds_points",
  "receptions_points",
  "targets_points",
  "target_share_points",
  "receiving_air_yards_points",
  "receiving_first_downs_points",
  "receiving_fumbles_lost_points",
  "receiving_drop_points",
] as const satisfies readonly (keyof ScoredRow)[];

export type ScoreBreakdownKey = (typeof SCORE_BREAKDOWN_KEYS)[number];

/** A scored row for an in-progress week: ranked and labelled, with `total_score`
 *  renamed to `current_week_score` so callers can tell it apart from DB rows. */
export interface LiveRow extends Omit<ScoredRow, "total_score"> {
  rank: number;
  current_week_score: number;
  season: number;
  week: number;
}

/** Minimal shape the predictors need from any scored frame. */
export interface ScoreRow {
  player_display_name: string;
  total_score: number;
}

/** Output of `seasonAverage`: one row per display name. */
export interface SeasonAverageRow {
  player_display_name: string;
  total_score: number;
  receptions: number;
  receiving_yards: number;
  receiving_tds: number;
}

export interface PredictionRow {
  player_display_name: string;
  /** The per-frame `total_score`s that were averaged, in input order. */
  inputs: number[];
  predicted_score: number;
}
