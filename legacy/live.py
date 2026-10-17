import nflreadpy as nfl
import polars as pl

from formula import wr_formula

def load_scored_wr_week(season, week):
    current_wr_score = nfl.load_player_stats([season]).filter((
        (pl.col("week") == week) & (pl.col("position") == "WR")
    ))
    drops = nfl.load_pfr_advstats(seasons=[season], stat_type="rec").filter(
        pl.col("week") == week
    )

    scored = wr_formula(current_wr_score, drops)
    return scored


def _to_current_week_score_dicts(season, week, scored):
    """Ranks the full scored pool, renames total_score -> current_week_score
    (so callers can tell a live row apart from a DB-persisted one), and
    labels each row with season/week."""
    ranked = scored.sort("total_score", descending=True).with_row_index("rank", offset=1)
    return (
        ranked
        .rename({"total_score": "current_week_score"})
        .with_columns(pl.lit(season).alias("season"), pl.lit(week).alias("week"))
        .to_dicts()
    )


def get_live_week_leaders_dicts(season, week):
    scored = load_scored_wr_week(season, week)
    rows = _to_current_week_score_dicts(season, week, scored)
    return rows[:15]


def search_live_wrs_by_name(name, season, week, min_receiving_yards=0, min_receiving_tds=0, min_receptions=0):
    scored_data = load_scored_wr_week(season, week)
    scored_rows = _to_current_week_score_dicts(season, week, scored_data)

    matches = []
    for scored_row in scored_rows:
        if (
            name.lower() in scored_row["player_display_name"].lower()
            and scored_row["receiving_yards"] >= min_receiving_yards
            and scored_row["receiving_tds"] >= min_receiving_tds
            and scored_row["receptions"] >= min_receptions
        ):
            matches.append(scored_row)
    return matches

