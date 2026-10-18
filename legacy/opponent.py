import polars as pl


def yards_allowed_points(yds):
    if yds > 154:
        return 5
    if yds > 138:
        return 3
    if yds > 127:
        return 1
    return 0


def tds_allowed_points(tds):
    if tds > 1.0:
        return 5
    if tds > 0.9:
        return 3
    if tds > 0.75:
        return 1
    return 0


def receptions_allowed_points(rec):
    if rec > 11.8:
        return 5
    if rec > 11.2:
        return 3
    if rec > 10.2:
        return 1
    return 0


def calculate_defense_matchup_scores(stats_df):
    """
    stats_df: WR rows from load_player_stats for whatever weeks count as
    "so far" (caller decides, same philosophy as formula.py/prediction.py).
    Returns one row per team: opponent_team, matchup_score (0-15, higher =
    more favorable matchup for an opposing WR).
    """
    per_game = (
        stats_df.group_by(["opponent_team", "week"])
        .agg(
            pl.col("receiving_yards").sum().alias("yds"),
            pl.col("receiving_tds").sum().alias("tds"),
            pl.col("receptions").sum().alias("rec"),
        )
    )
    return (
        per_game.group_by("opponent_team")
        .agg(
            pl.col("yds").mean().alias("yds"),
            pl.col("tds").mean().alias("tds"),
            pl.col("rec").mean().alias("rec"),
        )
        .with_columns(
            pl.col("yds").map_elements(yards_allowed_points, return_dtype=pl.Int64).alias("yds_points"),
            pl.col("tds").map_elements(tds_allowed_points, return_dtype=pl.Int64).alias("tds_points"),
            pl.col("rec").map_elements(receptions_allowed_points, return_dtype=pl.Int64).alias("rec_points"),
        )
        .with_columns(
            (pl.col("yds_points") + pl.col("tds_points") + pl.col("rec_points")).alias("matchup_score")
        )
        .select("opponent_team", "matchup_score")
    )


def matchup_adjustment(matchup_score):
    if matchup_score > 11:
        return 1.15
    if matchup_score > 7:
        return 1.05
    if matchup_score > 3:
        return 0.95
    return 0.85


def apply_opponent_adjustment(predictions_df, wr_teams, schedule_for_week, defense_scores):
    """
    predictions_df: output of a predict_* function (player_display_name, predicted_score, ...).
    wr_teams: player_display_name -> team (e.g. select() off any wr_stats frame).
    schedule_for_week: load_schedules() filtered to the week being predicted.
    defense_scores: output of calculate_defense_matchup_scores().
    """
    opponents = pl.concat([
        schedule_for_week.select(pl.col("home_team").alias("team"), pl.col("away_team").alias("opponent_team")),
        schedule_for_week.select(pl.col("away_team").alias("team"), pl.col("home_team").alias("opponent_team")),
    ])

    return (
        predictions_df
        .join(wr_teams, on="player_display_name", how="left")
        .join(opponents, on="team", how="left")
        .join(defense_scores, on="opponent_team", how="left")
        .with_columns(
            pl.col("matchup_score").map_elements(matchup_adjustment, return_dtype=pl.Float64).alias("adjustment")
        )
        .with_columns(
            (pl.col("predicted_score") * pl.col("adjustment")).alias("adjusted_predicted_score")
        )
    )
