import os

from dotenv import load_dotenv
from supabase import create_client

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

def search_wrs_by_name(name, season=2025):
    result = (
        get_client()
        .table("season_rankings")
        .select("player_display_name, season, total_score, receptions, receiving_yards, receiving_tds")
        .eq("season", season)
        .ilike("player_display_name", f"%{name}%")
        .order("total_score", desc=True)
        .execute()
    )
    return result.data
