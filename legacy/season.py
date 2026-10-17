import nflreadpy as nfl
import polars as pl
from prediction import calculate_2025_season_score_lol
import db

SEASON = 2025

season_score = calculate_2025_season_score_lol()

player_ids = (
    nfl.load_player_stats([SEASON])
    .filter(pl.col("player_id").is_not_null())
    .select("player_id", "player_display_name", "position")
    .unique(subset=["player_id"])
)

scored = (
    season_score
    .join(player_ids.select("player_id", "player_display_name"), on="player_display_name", how="left")
    .with_columns(pl.lit(SEASON).alias("season"))
    .select("player_id", "player_display_name", "season", "total_score", "receptions", "receiving_yards", "receiving_tds")
)

db.upsert_players(player_ids)
db.upsert_season_rankings(scored)

print(scored.sort("total_score", descending=True).head(15))
