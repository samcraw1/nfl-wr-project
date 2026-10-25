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

def get_current_nfl_week(season):
    schedule = nfl.load_schedules([season])
    incomplete = schedule.filter(pl.col("result").is_null())
    return incomplete["week"].min() if incomplete.height > 0 else None

def get_future_nfl_week(season):
    current_week = get_current_nfl_week(season)
    if current_week is None:
        return []

    recent_weeks = [current_week - 3, current_week - 2, current_week - 1]

    scores_by_player = {}
    for week in recent_weeks:
        scored = load_scored_wr_week(season, week)
        for row in scored.to_dicts():
            scores_by_player.setdefault(row["player_display_name"], []).append(row["total_score"])

    predicted = [
        {"player_display_name": name, "predicted_score": sum(scores) / len(scores)}
        for name, scores in scores_by_player.items()
    ]
    predicted.sort(key=lambda row: row["predicted_score"], reverse=True)
    return predicted

def get_previous_nfl_week(season):
    current_week = get_current_nfl_week(season)
    previous_week = current_week - 1 if current_week is not None and current_week > 1 else None
    return previous_week

def get_previous_week_leaders_dicts(season):
    week = get_previous_nfl_week(season)
    if week is None:
        return []
    return get_live_week_leaders_dicts(season, week)



