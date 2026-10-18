import io
import os

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

BUCKET = "wr-data"

_client = None


def get_client():
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _client = create_client(url, key)
    return _client


def _upload_bytes(path, data, content_type):
    get_client().storage.from_(BUCKET).upload(
        path, data, {"content-type": content_type, "upsert": "true"}
    )
    return path


def upload_raw_week(df, season, week):
    buffer = io.BytesIO()
    df.write_parquet(buffer)
    path = f"raw/{season}/week-{week}.parquet"
    return _upload_bytes(path, buffer.getvalue(), "application/octet-stream")


def upload_training_data(df):
    buffer = io.BytesIO()
    df.write_parquet(buffer)
    path = "processed/training-data.parquet"
    return _upload_bytes(path, buffer.getvalue(), "application/octet-stream")


def upload_model(local_path, version):
    with open(local_path, "rb") as f:
        data = f.read()
    path = f"models/wr-model-{version}.joblib"
    return _upload_bytes(path, data, "application/octet-stream")
