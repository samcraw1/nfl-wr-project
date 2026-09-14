import nflreadpy as nfl
import tkinter as tk
import polars as pl
from requests import get
import json

from formula import wr_formula

s = nfl.load_player_stats([2026])
wr_stats = s.filter((pl.col("week") == 1) & (pl.col("position") == "WR"))

schedule = nfl.load_schedules([2026]).filter(pl.col("week") == 1)
complete = schedule.filter(pl.col("result").is_not_null()).height == schedule.height

drops = nfl.load_pfr_advstats(seasons=[2026], stat_type="rec").filter(pl.col("week") == 1)

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


result = wr_formula(wr_stats, drops).select( "player_display_name", "receiving_yards","receiving_tds", "receiving_yards_after_catch", "total_score").head(15)

print(result)

print (top_15_WRS)
