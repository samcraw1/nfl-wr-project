/**
 * Season/week constants the dashboard is pinned to. The legacy Streamlit app
 * hard-coded these inline; they live here until they are derived from the DB
 * (see docs/typescript-rewrite-plan.md §7 item 4).
 */
export const STANDINGS_SEASON = 2025;
export const CURRENT_SEASON = 2026;
export const RANKINGS_WEEK = 1;
export const PREDICTIONS_WEEK = 2;

/** Every leaderboard query in the legacy app was capped at 15 rows. */
export const TOP_N = 15;

/** Regular-season weeks offered by the search filter (1..17, as in the legacy UI). */
export const SEARCH_WEEKS = Array.from({ length: 17 }, (_, i) => i + 1);

/** Season offered when the DB has no seasons at all. */
export const FALLBACK_SEASON = 2025;
