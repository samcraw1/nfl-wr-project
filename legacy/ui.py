import requests
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
            week = st.selectbox(
                "Select Week",
                options=[None] + list(range(1, 18)),
                format_func=lambda w: "Season Total" if w is None else f"Week {w}",
            )
            season_options = db.get_season_total_seasons() if week is None else db.get_weekly_seasons()
            if not season_options:
                season_options = [2025]
            season = st.selectbox("Select Season", options=season_options, index=len(season_options) - 1)
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
                    "total_score", "receptions", "receiving_yards", "receiving_tds", "current_week_score"
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
previous_week_leaders = db.previous_week_leaders(season=2026)
current_week_leaders = db.get_current_week_leaders(season=2026)
week_2_predictions = db.next_week_predictions(season=2026)


def _trim(rows):
    return [
        {"player": r["player_display_name"], "score": r.get("current_week_score", r.get("total_score"))}
        for r in rows
    ]


data_context = (
    "You answer questions about NFL wide receiver fantasy data. Use only this data to answer:\n"
    f"2025 season rankings: {_trim(season_rankings)}\n"
    f"Previous week leaders: {_trim(previous_week_leaders)}\n"
    f"Current week leaders: {_trim(current_week_leaders)}\n"
    f"Next week predictions: {_trim(week_2_predictions)}\n"
)

st.header("ask about the data")
if "messages" not in st.session_state:
    st.session_state.messages = []

for m in st.session_state.messages:
    st.chat_message(m["role"]).write(m["content"])

if prompt := st.chat_input("Ask a question"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.chat_message("user").write(prompt)

    messages_to_send = [{"role": "system", "content": data_context}] + st.session_state.messages
    response = requests.post(
        "http://localhost:11434/api/chat",
        json={"model": "llama3.2", "messages": messages_to_send, "stream": False},
    )
    reply = response.json()["message"]["content"]
    st.session_state.messages.append({"role": "assistant", "content": reply})
    st.chat_message("assistant").write(reply)

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.header("2025 Top WR Standings")
    st.dataframe(
        season_rankings,
        use_container_width=True,
        column_order=("player_display_name", "season", "total_score", "receptions", "receiving_yards", "receiving_tds"),
    )

with col2:
    st.header("Previous Week Rankings")
    if previous_week_leaders:
        prev_column_order = tuple(
            c for c in ("current_week_score", "total_score", "rank", "player_display_name", "receptions", "receiving_yards", "receiving_tds")
            if c in previous_week_leaders[0]
        )
        st.dataframe(
            previous_week_leaders,
            use_container_width=True,
            column_order=prev_column_order,
        )
    else:
        st.write("No previous week data available yet.")

with col3:
    st.header("Next Week Predictions")
    st.dataframe(
        week_2_predictions,
        use_container_width=True,
        column_order=("player_display_name", "predicted_score"),
    )
with col4:
    st.header("Current Week Leaders")
    current_week_leaders = db.get_current_week_leaders(season=2026)
    if current_week_leaders:
        leader_column_order = tuple  (c for c in ("current_week_score", "total_score", "rank",
                          "player_display_name",
  "receptions", "receiving_yards", "receiving_tds")
              if c in current_week_leaders[0]
          )
        st.dataframe(
            current_week_leaders,
            use_container_width=True,
            column_order=leader_column_order,
        )
    else:
        st.write("No current week data available yet")