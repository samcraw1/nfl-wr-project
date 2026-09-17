import streamlit as st

import db
import scoreboard


st.set_page_config(layout="wide")

scoreboard.render_header()

st.title("NFL WR Predictions")
season_rankings = db.get_season_rankings(season=2025)
week_1_stats = db.get_weekly_wr_stats(season=2026, week=1)
stats_by_player = {row["player_id"]: row for row in week_1_stats}
week_1_winners = db.get_weekly_rankings(season=2026, week=1)

for row in week_1_winners:
    stats = stats_by_player.get(row["player_id"], {})
    row["receptions"] = stats.get("receptions")
    row["receiving_yards"] = stats.get("receiving_yards")
    row["receiving_tds"] = stats.get("receiving_tds")

week_2_predictions = db.get_predictions(season=2026, week=2)

col1, col2, col3 = st.columns(3)

with col1:
    st.header("2025 Top WR Standings")
    st.dataframe(
        season_rankings,
        use_container_width=True,
        column_order=("player_display_name", "season", "total_score", "receptions", "receiving_yards", "receiving_tds"),
    )

with col2:
    st.header("Week 1 Rankings")
    st.dataframe(
        week_1_winners,
        use_container_width=True,
        column_order=("total_score", "rank", "player_display_name", "receptions", "receiving_yards", "receiving_tds"),
    )

with col3:
    st.header("Week 2 Predictions")
    st.dataframe(
        week_2_predictions,
        use_container_width=True,
        column_order=("player_display_name", "predicted_score"),
    )
