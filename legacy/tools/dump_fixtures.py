"""Dump golden fixtures from the legacy Python implementation.

The TypeScript port is verified against these files (tests/fixtures/). Re-run
only when you intentionally want the TS behaviour to change.

Usage (from repo root, with polars + nflreadpy + requests installed):
    python legacy/tools/dump_fixtures.py
"""

import json
import sys
import types
from pathlib import Path

import nflreadpy as nfl
import polars as pl
from requests import get

ROOT = Path(__file__).resolve().parents[2]
LEGACY = ROOT / "legacy"
OUT = ROOT / "tests" / "fixtures"

sys.path.insert(0, str(LEGACY))

# scoreboard.py imports streamlit only for @st.cache_data; stub it.
_st = types.ModuleType("streamlit")
_st.cache_data = lambda **_kw: (lambda fn: fn)
sys.modules["streamlit"] = _st
# prediction.py / live.py import db (supabase); nothing here touches the DB.
sys.modules["db"] = types.ModuleType("db")

import formula  # noqa: E402
import live  # noqa: E402
import scoreboard  # noqa: E402

# prediction.py runs a DB write at import time; exec only the function defs.
_pred_ns = {}
_pred_src = (LEGACY / "prediction.py").read_text().split("\nprediction_score = ")[0]
exec(compile(_pred_src, "prediction.py", "exec"), _pred_ns)
predict_wr_performance = _pred_ns["predict_wr_performance"]
predict_cold_2 = _pred_ns["predict_wr_performance_for_the_first_two_weeks_lol"]
predict_cold_3 = _pred_ns["predict_wr_performance_for_the_first_two_weeks_lol_for_the_third_week"]
calculate_2025_season_score_lol = _pred_ns["calculate_2025_season_score_lol"]

STATS_COLUMNS = [
    "player_id", "player_display_name", "position", "team", "season", "week", "opponent_team",
    "receptions", "targets", "receiving_yards", "receiving_tds", "receiving_yards_after_catch",
    "receiving_air_yards", "receiving_first_downs", "receiving_fumbles_lost", "target_share",
]
DROPS_COLUMNS = ["pfr_player_name", "season", "week", "receiving_drop"]
SCHEDULE_COLUMNS = ["season", "week", "home_team", "away_team", "result"]

WEEK_FIXTURES = [(2025, 1), (2025, 9), (2025, 16), (2025, 17), (2025, 18), (2026, 1)]


def dump(name, payload):
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=1, allow_nan=False, default=str) + "\n")
    print("wrote", path.relative_to(ROOT))


def rows(df):
    return df.to_dicts()


def main():
    stats_cache = {}
    drops_cache = {}
    sched_cache = {}

    def stats(season):
        if season not in stats_cache:
            stats_cache[season] = nfl.load_player_stats([season])
        return stats_cache[season]

    def drops(season):
        if season not in drops_cache:
            drops_cache[season] = nfl.load_pfr_advstats(seasons=[season], stat_type="rec")
        return drops_cache[season]

    def sched(season):
        if season not in sched_cache:
            sched_cache[season] = nfl.load_schedules([season])
        return sched_cache[season]

    print("stats columns:", stats(2025).columns)
    print("stats dtypes :", {c: str(stats(2025)[c].dtype) for c in STATS_COLUMNS})
    print("drops dtypes :", {c: str(drops(2025)[c].dtype) for c in DROPS_COLUMNS})

    scored_by_week = {}
    for season, week in WEEK_FIXTURES:
        wr = stats(season).filter((pl.col("week") == week) & (pl.col("position") == "WR"))
        dr = drops(season).filter(pl.col("week") == week)
        sc = sched(season).filter(pl.col("week") == week)
        scored = formula.wr_formula(wr, dr)
        scored_by_week[(season, week)] = scored
        dump(
            f"weeks/{season}-w{week}.json",
            {
                "season": season,
                "week": week,
                "wr_stats": rows(wr.select(STATS_COLUMNS)),
                "drops": rows(dr.select(DROPS_COLUMNS)),
                "schedule": rows(sc.select(SCHEDULE_COLUMNS)),
                "scored": rows(scored),
                "live_rows": live._to_current_week_score_dicts(season, week, scored),
            },
        )

    # Season average (prediction.calculate_2025_season_score_lol) + its inputs.
    season_avg = calculate_2025_season_score_lol()
    wr_2025 = stats(2025).filter(pl.col("position") == "WR")
    dump(
        "season-2025-inputs.json",
        {
            "season": 2025,
            "wr_stats": rows(wr_2025.select(STATS_COLUMNS)),
            "drops": rows(drops(2025).select(DROPS_COLUMNS)),
        },
    )
    dump("season-2025-average.json", rows(season_avg))

    # Predictors, fed from already-dumped weeks.
    w16, w17, w18 = (scored_by_week[(2025, w)] for w in (16, 17, 18))
    w1_2026 = scored_by_week[(2026, 1)]
    dump(
        "predictions.json",
        {
            "rolling_3": {
                "inputs": ["2025-w18", "2025-w17", "2025-w16"],
                "output": rows(predict_wr_performance(w18, w17, w16)),
            },
            "cold_start_2": {
                "inputs": ["season-2025-average", "2026-w1"],
                "output": rows(predict_cold_2(season_avg, w1_2026)),
            },
            "cold_start_3": {
                "inputs": ["season-2025-average", "2025-w17", "2025-w18"],
                "output": rows(predict_cold_3(season_avg, w17, w18)),
            },
        },
    )

    dump_espn()


def _parsed(payload):
    return {"games": scoreboard.parse_games(payload), "week_options": scoreboard.week_options(payload)}


def dump_espn():
    # Hand-built sample payload (always available) -> expected parse output.
    sample = json.loads((OUT / "espn" / "scoreboard-sample.json").read_text())
    dump("espn/scoreboard-sample-parsed.json", _parsed(sample))

    # Real payloads when the network allows it.
    try:
        current = get(scoreboard.ENDPOINT, timeout=10).json()
        finished = get(
            scoreboard.ENDPOINT, params={"seasontype": 2, "week": 1, "dates": 2025}, timeout=10
        ).json()
    except Exception as exc:  # noqa: BLE001
        print("skipping live ESPN fixtures:", type(exc).__name__)
        return
    dump("espn/scoreboard-current.json", current)
    dump("espn/scoreboard-current-parsed.json", _parsed(current))
    dump("espn/scoreboard-2025-w1.json", finished)
    dump("espn/scoreboard-2025-w1-parsed.json", _parsed(finished))


if __name__ == "__main__":
    if "--espn-only" in sys.argv:
        dump_espn()
    else:
        main()
