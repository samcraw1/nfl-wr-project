import nflreadpy as nfl
import polars as pl
from requests import get
import json

from formula import wr_formula
import db
import storage

SEASON = 2026
WEEK = 1

s = nfl.load_player_stats([SEASON])
wr_stats = s.filter((pl.col("week") == WEEK) & (pl.col("position") == "WR"))

schedule = nfl.load_schedules([SEASON]).filter(pl.col("week") == WEEK)
complete = schedule.filter(pl.col("result").is_not_null()).height == schedule.height

drops = nfl.load_pfr_advstats(seasons=[SEASON], stat_type="rec").filter(pl.col("week") == WEEK)

def showYAC():
    for r in wr_stats.select("player_display_name", "team", "receiving_yards", "receiving_tds", "receiving_yards_after_catch").iter_rows(named=True):
        if r['receiving_yards_after_catch'] > 15:
            print(f"{r['player_display_name']} had {r['receiving_yards_after_catch']} receiving yards after catch in week 1")
#showYAC()

top_15_WRS = (
    wr_stats.sort("receiving_yards", descending=True)
    .select("player_display_name", "team", "receiving_yards", "receptions",
  "receiving_tds").head(15)
)


scored = wr_formula(wr_stats, drops)

result = scored.select("player_display_name", "receiving_yards", "receiving_tds", "receiving_yards_after_catch", "total_score").head(15)

print(result)

print (top_15_WRS)

if complete:
    storage.upload_raw_week(wr_stats, SEASON, WEEK)

    db.upsert_players(wr_stats)

    stats_for_db = (
        wr_stats
        .join(
            drops.select("pfr_player_name", "receiving_drop").rename({"pfr_player_name": "player_display_name"}),
            on="player_display_name",
            how="left",
        )
        .with_columns(pl.col("receiving_drop").fill_null(0).cast(pl.Int64))
        .select(
            "player_id", "season", "week", "team",
            "receptions", "targets", "receiving_yards", "receiving_tds",
            "receiving_yards_after_catch", "receiving_air_yards", "receiving_first_downs",
            "receiving_fumbles_lost", "receiving_drop", "target_share",
        )
    )
    db.upsert_weekly_stats(stats_for_db)

    score_columns = [c for c in scored.columns if c.endswith("_points")]
    rankings_for_db = (
        scored
        .with_row_index("rank", offset=1)
        .join(
            wr_stats.select("player_id", "player_display_name").unique(subset=["player_display_name"]),
            on="player_display_name",
            how="left",
        )
        .with_columns(
            pl.lit(SEASON).alias("season"),
            pl.lit(WEEK).alias("week"),
            pl.struct(score_columns).alias("score_breakdown"),
        )
        .select("player_id", "player_display_name", "season", "week", "total_score", "rank", "score_breakdown")
    )
    db.upsert_weekly_rankings(rankings_for_db)
