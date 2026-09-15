import polars as pl
import nflreadpy as nfl

from formula import wr_formula


def predict_wr_performance(last_game, two_games_ago, three_games_ago):
    """
    last_game, two_games_ago, three_games_ago: each the output of
    wr_formula(week_stats, week_drops) for that week (must include
    player_display_name and total_score).
    """
    combined = (
        last_game.select("player_display_name", "total_score")
        .join(two_games_ago.select("player_display_name", "total_score"), on="player_display_name", suffix="_2")
        .join(three_games_ago.select("player_display_name", "total_score"), on="player_display_name", suffix="_3")
    )

    return combined.with_columns(
        ((pl.col("total_score") + pl.col("total_score_2") + pl.col("total_score_3")) / 3)
        .alias("predicted_score")
    ).sort("predicted_score", descending=True)


def predict_wr_performance_for_the_first_two_weeks_lol(year_2025_score, week_1_score):
    """
    Used for predicting week 2, when there's no 3-week rolling history yet.
    year_2025_score, week_1_score: each the output of wr_formula() (must
    include player_display_name and total_score).
    """
    combined = (
        year_2025_score.select("player_display_name", "total_score")
        .join(week_1_score.select("player_display_name", "total_score"), on="player_display_name", suffix="_2")
    )

    return combined.with_columns(
        ((pl.col("total_score") + pl.col("total_score_2")) / 2)
        .alias("predicted_score")
    ).sort("predicted_score", descending=True)


def predict_wr_performance_for_the_first_two_weeks_lol_for_the_third_week(year_2025_score, week_1_score, week_2_score):
    """
    Used for predicting week 3, when there's still only 2 weeks of current-season history.
    """
    combined = (
        year_2025_score.select("player_display_name", "total_score")
        .join(week_1_score.select("player_display_name", "total_score"), on="player_display_name", suffix="_2")
        .join(week_2_score.select("player_display_name", "total_score"), on="player_display_name", suffix="_3")
    )

    return combined.with_columns(
        ((pl.col("total_score") + pl.col("total_score_2") + pl.col("total_score_3")) / 3)
        .alias("predicted_score")
    ).sort("predicted_score", descending=True)
 


def calculate_2025_season_score_lol():
    """
    Runs wr_formula() across every week (REG + POST) of the 2025 season and
    averages each player's total_score into one season-long number, in the
    same (player_display_name, total_score) shape a single week's wr_formula()
    output has - so it drops straight into the cold-start prediction functions
    above as year_2025_score.
    """
    season = 2025
    all_stats = nfl.load_player_stats([season]).filter(pl.col("position") == "WR")
    all_drops = nfl.load_pfr_advstats(seasons=[season], stat_type="rec")

    weeks = all_stats["week"].unique().sort().to_list()

    scored_weeks = [
        wr_formula(
            all_stats.filter(pl.col("week") == week),
            all_drops.filter(pl.col("week") == week),
        ).select("player_display_name", "total_score")
        for week in weeks
    ]

    return (
        pl.concat(scored_weeks)
        .group_by("player_display_name")
        .agg(pl.col("total_score").mean().alias("total_score"))
    )
