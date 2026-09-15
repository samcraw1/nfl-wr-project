import polars as pl


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
