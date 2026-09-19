import streamlit as st
import db
import scoreboard


st.set_page_config(layout="wide")

scoreboard.render_header()

def render_search():
    st.title("search WRs")
    search_query_for_stats = st.text_input(label="Search WRs by name", placeholder="Enter WR name", type="search")

    search_col, filter_col = st.columns([1, 1])
    with search_col:
        search_clicked = st.button("Search")
    with filter_col:
        with st.popover("Filter Options"):
            season = st.selectbox("Select Season", options=[2024, 2025, 2026], index=1)
            week = st.selectbox(
                "Select Week",
                options=[None] + list(range(1, 18)),
                format_func=lambda w: "Season Total" if w is None else f"Week {w}",
            )
            yardage = st.number_input("Minimum Receiving Yards", min_value=0, step=10)
            tds = st.number_input("Minimum Receiving TDs", min_value=0, step=1)
            receptions = st.number_input("Minimum Receptions", min_value=0, step=1)

    if search_query_for_stats and search_clicked:
        try:
            search_results = db.search_wrs_by_name(
                search_query_for_stats,
                season=season,
                week=week,
                min_receiving_yards=yardage,
                min_receiving_tds=tds,
                min_receptions=receptions,
            )
            if search_results:
                preferred_column_order = (
                    "player_display_name", "season", "week", "rank",
                    "total_score", "receptions", "receiving_yards", "receiving_tds",
                )
                column_order = tuple(c for c in preferred_column_order if c in search_results[0])
                st.dataframe(
                    search_results,
                    use_container_width=True,
                    column_order=column_order,
                )
            else:
                st.write("No WRs found with that name.")
        except Exception as e:
            st.write(f"An error occurred: {e}")



render_search()



season_rankings = db.get_season_rankings(season=2025)
week_1_stats = db.get_weekly_wr_stats(season=2026, week=1)
stats_by_player = {row["player_id"]: row for row in week_1_stats}
week_1_winners = db.get_weekly_rankings(season=2026, week=1)
current_week_leaders = db.get_current_week_leaders(season=2026)

for row in week_1_winners:
    stats = stats_by_player.get(row["player_id"], {})
    row["receptions"] = stats.get("receptions")
    row["receiving_yards"] = stats.get("receiving_yards")
    row["receiving_tds"] = stats.get("receiving_tds")

week_2_predictions = db.get_predictions(season=2026, week=2)

col1, col2, col3, col4 = st.columns(4)

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
with col4:
    st.header("Current Week Leaders")
    st.dataframe(
        current_week_leaders,
        use_container_width=True,
        column_order=("total_score", "rank", "player_display_name", "receptions", "receiving_yards", "receiving_tds"),
    )
