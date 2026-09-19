"""ESPN NFL scoreboard rendered as a livescore strip at the top of the dashboard."""

from requests import get
import streamlit as st

ENDPOINT = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
GAMES_PER_PAGE = 3
BANNER_COLOR = "#003087"

_CSS = """
<style>
/* Streamlit auto-closes raw wrapper divs, so the banner is a keyed container
   styled through the .st-key-* class Streamlit emits for it. */
.st-key-sb_banner {
    background: %s;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 18px;
}
.st-key-sb_banner .stSelectbox div[data-baseweb="select"] > div {
    border: none;
    border-radius: 4px;
}
.sb-title {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.06em;
    margin-top: 8px;
}
.st-key-sb_prev button,
.st-key-sb_next button {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.9);
    font-size: 22px;
    line-height: 1;
    padding: 0;
    min-height: 0;
}
.st-key-sb_prev button:hover,
.st-key-sb_next button:hover {
    background: rgba(255, 255, 255, 0.12);
    color: white;
}
.st-key-sb_prev button:disabled,
.st-key-sb_next button:disabled {
    color: rgba(255, 255, 255, 0.28);
    background: transparent;
}
.sb-card {
    border-left: 1px solid rgba(255, 255, 255, 0.18);
    padding: 2px 4px 2px 14px;
    min-height: 68px;
}
.sb-card.sb-empty { border-left: none; }
.sb-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
}
.sb-tag {
    color: rgba(255, 255, 255, 0.7);
    font-size: 11px;
    font-weight: 700;
}
.sb-badge {
    background: rgba(0, 0, 0, 0.28);
    color: rgba(255, 255, 255, 0.95);
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
}
.sb-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.78);
    font-size: 13px;
    line-height: 1.6;
}
.sb-row img { width: 18px; height: 18px; }
.sb-abbr { flex: 1; }
.sb-score { font-variant-numeric: tabular-nums; }
.sb-win { color: white; font-weight: 700; }
</style>
""" % BANNER_COLOR


@st.cache_data(ttl=60)
def fetch_scoreboard(season_type=None, week=None, year=None) -> dict:
    """Fetch the ESPN scoreboard. With no arguments, returns the current week."""
    params = {}
    if season_type is not None:
        params["seasontype"] = season_type
    if week is not None:
        params["week"] = week
    if year is not None:
        params["dates"] = year

    response = get(ENDPOINT, params=params, timeout=10)
    response.raise_for_status()
    return response.json()


def _badge(status: dict) -> str:
    """Short status label: FT for finished games, clock while live, kickoff time before."""
    kind = status.get("type", {})
    state = kind.get("state")

    if state == "post":
        return "FT"

    if state == "in":
        period = status.get("period")
        clock = status.get("displayClock", "")
        if period:
            quarter = "OT" if period > 4 else "Q%d" % period
            return ("%s %s" % (quarter, clock)).strip()
        return clock or "LIVE"

    # Pre-game: "9/17 - 8:15 PM EDT" -> "9/17 8:15 PM"
    detail = kind.get("shortDetail", "")
    return detail.replace(" - ", " ").removesuffix(" EDT").removesuffix(" EST") or "TBD"


def _side(competitor: dict, played: bool) -> dict:
    team = competitor.get("team", {})
    return {
        "abbr": team.get("abbreviation", "???"),
        "logo": team.get("logo", ""),
        "score": competitor.get("score", "0") if played else "–",
        "winner": bool(competitor.get("winner")),
    }


def parse_games(data: dict) -> list[dict]:
    """Flatten the ESPN payload into one dict per game."""
    games = []

    for event in data.get("events", []):
        competitors = event.get("competitions", [{}])[0].get("competitors", [])
        by_side = {c.get("homeAway"): c for c in competitors}
        if "home" not in by_side or "away" not in by_side:
            continue

        status = event.get("status", {})
        played = status.get("type", {}).get("state") != "pre"

        games.append(
            {
                "away": _side(by_side["away"], played),
                "home": _side(by_side["home"], played),
                "badge": _badge(status),
            }
        )

    return games


def week_options(data: dict) -> list[tuple[str, int, int]]:
    """Every selectable week as (label, seasontype, week), from ESPN's own calendar."""
    options = []

    for section in data.get("leagues", [{}])[0].get("calendar", []):
        season_type = int(section.get("value", 0))
        for entry in section.get("entries", []):
            options.append((entry.get("label", ""), season_type, int(entry.get("value", 0))))

    return options


def _card_html(game: dict | None) -> str:
    if game is None:
        return '<div class="sb-card sb-empty"></div>'

    def row(side):
        return (
            '<div class="sb-row%s"><img src="%s"><span class="sb-abbr">%s</span>'
            '<span class="sb-score">%s</span></div>'
            % (" sb-win" if side["winner"] else "", side["logo"], side["abbr"], side["score"])
        )

    return (
        '<div class="sb-card">'
        '<div class="sb-top"><span class="sb-tag">NFL</span>'
        '<span class="sb-badge">%s</span></div>%s%s</div>'
        % (game["badge"], row(game["away"]), row(game["home"]))
    )


def render_header() -> None:
    """Draw the livescore strip: week picker, arrows, and three game cards."""
    st.markdown(_CSS, unsafe_allow_html=True)

    try:
        current = fetch_scoreboard()
    except Exception:
        st.caption("Live scores unavailable")
        return

    options = week_options(current)
    if not options:
        st.caption("Live scores unavailable")
        return

    season = current.get("season", {})
    year = season.get("year")
    default = (season.get("type"), current.get("week", {}).get("number"))
    default_index = next(
        (i for i, (_, t, w) in enumerate(options) if (t, w) == default), 0
    )

    container = st.container(key="sb_banner")
    col_pick, col_prev, c1, c2, c3, col_next = container.columns(
        [2.2, 0.35, 2.8, 2.8, 2.8, 0.35], vertical_alignment="center"
    )

    with col_pick:
        label = st.selectbox(
            "Week",
            [o[0] for o in options],
            index=default_index,
            key="sb_week_label",
            label_visibility="collapsed",
        )
        st.markdown('<div class="sb-title">LIVESCORES ▸</div>', unsafe_allow_html=True)

    _, season_type, week = next(o for o in options if o[0] == label)

    # Snap back to the first page whenever the selected week changes.
    if st.session_state.get("sb_week") != (season_type, week):
        st.session_state["sb_week"] = (season_type, week)
        st.session_state["sb_page"] = 0

    try:
        data = (
            current
            if (season_type, week) == default
            else fetch_scoreboard(season_type, week, year)
        )
        games = parse_games(data)
    except Exception:
        st.caption("Live scores unavailable")
        return

    last_page = max((len(games) - 1) // GAMES_PER_PAGE, 0)
    page = min(st.session_state.get("sb_page", 0), last_page)

    if col_prev.button("‹", key="sb_prev", disabled=page == 0):
        st.session_state["sb_page"] = page - 1
        st.rerun()

    if col_next.button("›", key="sb_next", disabled=page >= last_page):
        st.session_state["sb_page"] = page + 1
        st.rerun()

    visible = games[page * GAMES_PER_PAGE : (page + 1) * GAMES_PER_PAGE]
    visible += [None] * (GAMES_PER_PAGE - len(visible))

    for column, game in zip((c1, c2, c3), visible):
        column.markdown(_card_html(game), unsafe_allow_html=True)
        