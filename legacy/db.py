import os

from dotenv import load_dotenv
from supabase import create_client

import live

load_dotenv()

_client = None


def get_client():
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client


def upsert_players(df):
    rows = df.select("player_id", "player_display_name", "position").unique(subset=["player_id"]).to_dicts()
    return get_client().table("players").upsert(rows, on_conflict="player_id").execute()


def upsert_weekly_stats(df):
    rows = df.to_dicts()
    return get_client().table("weekly_wr_stats").upsert(rows, on_conflict="player_id,season,week").execute()


def upsert_weekly_rankings(df):
    rows = df.to_dicts()
    return get_client().table("weekly_rankings").upsert(rows, on_conflict="player_id,season,week").execute()


def upsert_predictions(df):
    rows = df.to_dicts()
    return get_client().table("predictions").upsert(rows, on_conflict="player_id,season,week").execute()


def upsert_season_rankings(df):
    rows = df.to_dicts()
    return get_client().table("season_rankings").upsert(rows, on_conflict="player_id,season").execute()


def get_season_rankings(season):
    result = (
        get_client()
        .table("season_rankings")
        .select("*")
        .eq("season", season)
        .order("total_score", desc=True)
        .limit(15) 
        .execute()
        
    )
    return result.data

def get_latest_week(season):
    result = (
        get_client()
        .table("weekly_rankings")
        .select("week")
        .eq("season", season)
        .order("week", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0]["week"] if result.data else None

def get_current_week_leaders(season):

    last_completed_week = get_latest_week(season)
    candidate_week = (last_completed_week or 0) + 1

    live_rows = live.get_live_week_leaders_dicts(season, candidate_week)
    if live_rows:
        return live_rows

    if last_completed_week is None:
        return []
    rankings = get_weekly_rankings(season, last_completed_week)
    stats = get_weekly_wr_stats(season, last_completed_week)
    stats_by_player = {row["player_id"]: row for row in stats}
    for row in rankings:
        player_stats = stats_by_player.get(row["player_id"], {})
        row["receptions"] = player_stats.get("receptions")
        row["receiving_yards"] = player_stats.get("receiving_yards")
        row["receiving_tds"] = player_stats.get("receiving_tds")
        row["targets"] = player_stats.get("targets")
    return rankings


def get_weekly_rankings(season, week):
    result = (
        get_client()
        .table('weekly_rankings')
        .select("*")
        .eq("season", season)
        .eq("week", week)
        .order("rank")
        .limit(15)
        .execute()
    )
    return result.data

def get_predictions(season, week):
    result = (
        get_client()
        .table('predictions')
        .select("player_id, season, week, predicted_score, players(player_display_name)")
        .eq("season", season)
        .eq("week", week)
        .order("predicted_score", desc=True)
        .limit(15)
        .execute()
    )
    rows = result.data
    for row in rows:
        row["player_display_name"] = row.pop("players")["player_display_name"]
    return rows

def get_weekly_wr_stats(season, week):
    result = (
        get_client()
        .table('weekly_wr_stats')
        .select("*")
        .eq("season", season)
        .eq("week", week)
        .execute()
    )
    return result.data


def record_model_result(
    model_version,
    model_type=None,
    target_column=None,
    feature_columns=None,
    hyperparameters=None,
    train_season_start=None,
    train_season_end=None,
    test_season_start=None,
    test_season_end=None,
    mae=None,
    rmse=None,
    top_15_accuracy=None,
    model_file_path=None,
):
    row = {
        "model_version": model_version,
        "model_type": model_type,
        "target_column": target_column,
        "feature_columns": feature_columns,
        "hyperparameters": hyperparameters,
        "train_season_start": train_season_start,
        "train_season_end": train_season_end,
        "test_season_start": test_season_start,
        "test_season_end": test_season_end,
        "mae": mae,
        "rmse": rmse,
        "top_15_accuracy": top_15_accuracy,
        "model_file_path": model_file_path,
    }
    return get_client().table("model_results").upsert(row, on_conflict="model_version").execute()


def get_model_result_id(model_version):
    result = (
        get_client()
        .table("model_results")
        .select("id")
        .eq("model_version", model_version)
        .single()
        .execute()
    )
    return result.data["id"]

def get_weekly_seasons():
    """Seasons that have week-by-week data (weekly_rankings)."""
    result = get_client().table("weekly_rankings").select("season").execute()
    return sorted({row["season"] for row in result.data})


def get_season_total_seasons():
    """Seasons a 'Season Total' search can be run for: seasons stored directly
    in season_rankings, plus any season that only has weekly data so far and
    can be aggregated on the fly (see _aggregate_season_from_weekly)."""
    stored_result = get_client().table("season_rankings").select("season").execute()
    stored_seasons = {row["season"] for row in stored_result.data}
    return sorted(stored_seasons | set(get_weekly_seasons()))


def search_wrs_by_name(
    name,
    season=2025,
    week=None,
    min_receiving_yards=0,
    min_receiving_tds=0,
    min_receptions=0,
):
    if week is not None:
        return _search_weekly_wrs_by_name(
            name, season, week, min_receiving_yards, min_receiving_tds, min_receptions
        )

    result = (
        get_client()
        .table("season_rankings")
        .select("player_display_name, season, total_score, receptions, receiving_yards, receiving_tds")
        .eq("season", season)
        .ilike("player_display_name", f"%{name}%")
        .gte("receiving_yards", min_receiving_yards)
        .gte("receiving_tds", min_receiving_tds)
        .gte("receptions", min_receptions)
        .order("total_score", desc=True)
        .execute()
    )
    if result.data:
        return result.data

    if season in get_weekly_seasons():
        return _search_season_to_date_by_name(
            name, season, min_receiving_yards, min_receiving_tds, min_receptions
        )
    return result.data


def _aggregate_season_from_weekly(season):
    """Builds season-to-date totals per player from weekly_rankings +
    weekly_wr_stats, for seasons still in progress (not yet in season_rankings)."""
    rankings = (
        get_client()
        .table("weekly_rankings")
        .select("player_id, player_display_name, season, week, total_score")
        .eq("season", season)
        .execute()
        .data
    )
    stats = (
        get_client()
        .table("weekly_wr_stats")
        .select("player_id, week, receptions, receiving_yards, receiving_tds")
        .eq("season", season)
        .execute()
        .data
    )
    stats_by_key = {(row["player_id"], row["week"]): row for row in stats}

    totals = {}
    for row in rankings:
        entry = totals.setdefault(
            row["player_id"],
            {
                "player_display_name": row["player_display_name"],
                "season": season,
                "score_sum": 0.0,
                "weeks": 0,
                "receptions": 0,
                "receiving_yards": 0,
                "receiving_tds": 0,
            },
        )
        entry["score_sum"] += row["total_score"]
        entry["weeks"] += 1
        week_stats = stats_by_key.get((row["player_id"], row["week"]))
        if week_stats:
            entry["receptions"] += week_stats.get("receptions") or 0
            entry["receiving_yards"] += week_stats.get("receiving_yards") or 0
            entry["receiving_tds"] += week_stats.get("receiving_tds") or 0

    return [
        {
            "player_display_name": entry["player_display_name"],
            "season": entry["season"],
            "total_score": entry["score_sum"] / entry["weeks"],
            "receptions": entry["receptions"],
            "receiving_yards": entry["receiving_yards"],
            "receiving_tds": entry["receiving_tds"],
        }
        for entry in totals.values()
    ]


def _search_season_to_date_by_name(name, season, min_receiving_yards, min_receiving_tds, min_receptions):
    name_lower = name.lower()
    rows = [
        row
        for row in _aggregate_season_from_weekly(season)
        if name_lower in row["player_display_name"].lower()
        and row["receiving_yards"] >= min_receiving_yards
        and row["receiving_tds"] >= min_receiving_tds
        and row["receptions"] >= min_receptions
    ]
    rows.sort(key=lambda row: row["total_score"], reverse=True)
    return rows


def _search_weekly_wrs_by_name(name, season, week, min_receiving_yards, min_receiving_tds, min_receptions):

    if not weekly_rankings_exist(season,week):
        return live.search_live_wrs_by_name(name, season, week, min_receiving_yards, min_receiving_tds, min_receptions)
    
    rankings_result = (
        get_client()
        .table("weekly_rankings")
        .select("player_id, player_display_name, season, week, total_score, rank")
        .eq("season", season)
        .eq("week", week)
        .ilike("player_display_name", f"%{name}%")
        .order("total_score", desc=True)
        .execute()
    )
    rows = rankings_result.data
    if not rows:
        return rows

    player_ids = [row["player_id"] for row in rows]
    stats_result = (
        get_client()
        .table("weekly_wr_stats")
        .select("player_id, receptions, receiving_yards, receiving_tds")
        .eq("season", season)
        .eq("week", week)
        .in_("player_id", player_ids)
        .execute()
    )
    stats_by_player = {row["player_id"]: row for row in stats_result.data}

    filtered_rows = []
    for row in rows:
        stats = stats_by_player.get(row["player_id"], {})
        row["receptions"] = stats.get("receptions") or 0
        row["receiving_yards"] = stats.get("receiving_yards") or 0
        row["receiving_tds"] = stats.get("receiving_tds") or 0
        if (
            row["receiving_yards"] >= min_receiving_yards
            and row["receiving_tds"] >= min_receiving_tds
            and row["receptions"] >= min_receptions
        ):
            filtered_rows.append(row)
    return filtered_rows


def weekly_rankings_exist(season, week):
    result = (
        get_client()
        .table("weekly_rankings")
        .select("player_id")
        .eq("season", season)
        .eq("week", week)
        .limit(1)
        .execute()
    )
    return bool(result.data)