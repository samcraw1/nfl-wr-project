# TypeScript Rewrite Plan

> **Status (2026-10-17):** Phases 0–5 are implemented on this branch. Scoring,
> predictions and the ingestion row builders are verified against the Python
> fixtures (`pnpm test`); the three scripts run against live nflverse data with
> `--dry-run`. Not yet done: running the scripts for real against Supabase
> (needs credentials), deploying the web app, and deleting `legacy/`. See
> README.md for the current layout and behaviour notes.

Plan for rewriting the NFL WR project (currently ~1,450 lines of Python across 10
modules: Polars + nflreadpy + Streamlit + Supabase) as a TypeScript codebase.

The guiding rule: **port behaviour first, fix bugs second**. Every scoring and
ranking quirk in the Python is reproduced exactly and locked in with golden tests
before anything is "improved", so the rewrite can be verified against the current
system rather than argued about.

---

## 1. What exists today

| File            | Lines | Role                                                                                                                                                                                | Kind                |
| --------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `formula.py`    | 289   | Tiered points per stat (YAC, yards, TDs, receptions, targets, target share, air yards, first downs, fumbles lost, drops) and `wr_formula()` that sums them into `total_score`       | Pure logic          |
| `prediction.py` | 121   | Rolling-average predictors (3-week, cold-start 2-week/3-week with prior-season average), `calculate_2025_season_score_lol()`, and a top-level script that writes week-2 predictions | Logic + script      |
| `opponent.py`   | 101   | Defense matchup scoring and `apply_opponent_adjustment()`. **Not imported anywhere**                                                                                                | Pure logic (unused) |
| `live.py`       | 51    | Scores the in-progress week straight from nflverse; `current_week_score` rows for leaders and search                                                                                | Logic               |
| `db.py`         | 355   | Supabase client, upserts, reads for the UI, name search with season-total / season-to-date / weekly / live fallbacks                                                                | Data access         |
| `storage.py`    | 48    | Supabase Storage uploads: raw week parquet, training parquet, joblib model                                                                                                          | Data access         |
| `wr.py`         | 80    | Weekly ingestion script: score a week, and if every game has a result, upsert players, stats, rankings, raw parquet                                                                 | Script              |
| `season.py`     | 27    | Season ingestion script: average 2025 weekly scores into `season_rankings`                                                                                                          | Script              |
| `scoreboard.py` | 266   | ESPN scoreboard fetch/parse + Streamlit livescore banner with week picker and paging                                                                                                | UI + logic          |
| `ui.py`         | 117   | Streamlit dashboard: search panel, four tables (2025 standings, week 1 rankings, week 2 predictions, current-week leaders)                                                          | UI                  |

### External dependencies and their TypeScript replacements

| Python          | Purpose                             | TypeScript replacement                                                                                                     |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `nflreadpy`     | Downloads nflverse parquet releases | Direct `fetch()` of the same GitHub release files + `hyparquet` (pure TS parquet reader). URLs verified 2026‑10‑17, see §4 |
| `polars`        | DataFrames                          | None. Plain typed arrays/objects. A week is ~150 WR rows, a season ~3,000; no frame library needed                         |
| `supabase`      | Postgres + Storage                  | `@supabase/supabase-js` with generated `Database` types                                                                    |
| `streamlit`     | UI                                  | Next.js (App Router) + React                                                                                               |
| `requests`      | ESPN API                            | `fetch()`                                                                                                                  |
| `python-dotenv` | Env                                 | Next.js built-in `.env.local`; `dotenv` for scripts                                                                        |

### Supabase schema (project `NFL WR Project`, verified live)

- `players(player_id text PK, player_display_name, position, created_at)`
- `weekly_wr_stats(id, player_id FK, season, week, team, receptions, targets, receiving_yards, receiving_tds, receiving_yards_after_catch, receiving_air_yards, receiving_first_downs, receiving_fumbles_lost, receiving_drop, target_share numeric, created_at)` — upsert conflict key `player_id,season,week`
- `weekly_rankings(id, player_id FK, player_display_name, season, week, total_score **bigint**, rank, score_breakdown jsonb, created_at)` — conflict key `player_id,season,week`
- `season_rankings(id, player_id FK, player_display_name, season, total_score numeric, receptions, receiving_yards, receiving_tds, created_at)` — conflict key `player_id,season`
- `predictions(id, player_id FK, season, week, predicted_score numeric, based_on_weeks jsonb, model_result_id FK, created_at)` — conflict key `player_id,season,week`
- `model_results(id, model_version unique, model_type, target_column, feature_columns jsonb, hyperparameters jsonb, train/test season ranges, mae, rmse, top_15_accuracy, model_file_path, trained_at)` — 0 rows; ML pipeline not built yet

The schema does **not** change in this rewrite. Note `weekly_rankings.total_score`
is `bigint` while `season_rankings.total_score` is `numeric`; the TS types must
reflect that (weekly scores are integer sums of tier points, season scores are
averages).

---

## 2. Target stack

| Concern          | Choice                                         | Why                                                                                                                                                                           |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language         | TypeScript 5.x, `strict: true`                 |                                                                                                                                                                               |
| Package manager  | pnpm                                           | Already installed; fast, strict by default                                                                                                                                    |
| Web framework    | **Next.js 15, App Router**                     | Server Components let the dashboard read Supabase with the service-role key without ever shipping it to the browser. Replaces Streamlit's server-rendered model most directly |
| UI               | React + Tailwind CSS                           | Scoreboard banner CSS ports 1:1 to Tailwind or a CSS module                                                                                                                   |
| Tables           | TanStack Table (or plain `<table>` to start)   | Streamlit `st.dataframe` equivalent with column ordering                                                                                                                      |
| Data access      | `@supabase/supabase-js` + `supabase gen types` | Typed queries; the Supabase CLI/MCP can generate the `Database` type from the live project                                                                                    |
| nflverse loading | `hyparquet`                                    | Pure TS parquet reader, works in Node and the browser, no native deps. Parquet is ~10x smaller than the CSV alternative (855 KB vs 8.6 MB for 2025 player stats)              |
| Scripts runner   | `tsx`                                          | Run ingestion scripts directly: `pnpm tsx scripts/ingest-week.ts --season 2026 --week 2`                                                                                      |
| Tests            | Vitest                                         | Golden-file tests against Python output (see §6)                                                                                                                              |
| Lint/format      | ESLint (next config) + Prettier                |                                                                                                                                                                               |
| Hosting          | Vercel (web) + GitHub Actions cron (ingestion) | Recommendation only; see §8                                                                                                                                                   |

Single app, not a monorepo. The project is small; module boundaries inside
`src/lib` give the separation without workspace overhead. Split into packages
later only if a second consumer (e.g. a CLI or mobile app) appears.

---

## 3. Target layout

```
nfl-wr-project/
├── package.json
├── tsconfig.json
├── next.config.ts
├── .env.example                 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server only)
├── src/
│   ├── app/                     Next.js routes (Server Components by default)
│   │   ├── layout.tsx
│   │   ├── page.tsx             Dashboard: scoreboard banner + search + four tables
│   │   └── api/                 Only if the client needs to call back (search, paging)
│   ├── components/
│   │   ├── Scoreboard.tsx       ← scoreboard.py render_header (client component)
│   │   ├── WrSearch.tsx         ← ui.py render_search (client component)
│   │   └── RankingsTable.tsx    shared typed table
│   └── lib/
│       ├── types.ts             WrWeekRow, DropsRow, ScheduleGame, ScoredRow, …
│       ├── scoring/
│       │   ├── formula.ts       ← formula.py (tiers + wr_formula)
│       │   ├── prediction.ts    ← prediction.py predictor functions (pure)
│       │   └── opponent.ts      ← opponent.py (port, still unused, or drop — see §7)
│       ├── nflverse/
│       │   ├── client.ts        fetch + hyparquet + in-memory cache
│       │   ├── playerStats.ts   ← nfl.load_player_stats
│       │   ├── pfrAdvstats.ts   ← nfl.load_pfr_advstats(stat_type="rec")
│       │   └── schedules.ts     ← nfl.load_schedules
│       ├── live.ts              ← live.py
│       ├── espn/
│       │   └── scoreboard.ts    ← scoreboard.py fetch/parse/week_options (pure)
│       └── db/
│           ├── client.ts        singleton service-role client (server only)
│           ├── database.types.ts  generated
│           ├── writes.ts        ← db.py upsert_*
│           ├── reads.ts         ← db.py get_*
│           ├── search.ts        ← db.py search_wrs_by_name + helpers
│           └── storage.ts       ← storage.py
├── scripts/
│   ├── ingest-week.ts           ← wr.py
│   ├── build-season.ts          ← season.py
│   └── predict-week.ts          ← prediction.py (script half)
└── tests/
    ├── fixtures/                golden JSON dumped from the Python code
    └── *.test.ts
```

---

## 4. Replacing nflreadpy

nflreadpy is a thin downloader over GitHub release assets. The TS loader fetches
the same files. Verified URLs (all return 200):

| nflreadpy call                                    | URL                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `load_player_stats([S])`                          | `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{S}.parquet`            |
| `load_pfr_advstats(seasons=[S], stat_type="rec")` | `https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_week_rec_{S}.parquet`            |
| `load_schedules([S])`                             | `https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv` (all seasons; filter by `season`) |

Each has a `.csv` twin at the same path if parquet ever becomes a problem.

Columns the code depends on (define these as the TS row types; ignore the rest):

- Player stats: `player_id, player_display_name, position, team, season, week, opponent_team, receptions, targets, receiving_yards, receiving_tds, receiving_yards_after_catch, receiving_air_yards, receiving_first_downs, receiving_fumbles_lost, target_share`
- PFR rec advstats: `pfr_player_name, week, receiving_drop`
- Schedules: `season, week, home_team, away_team, result`

Caching: the loader keeps a per-process `Map<url, rows>` so a request that scores
the live week only downloads once. In Next.js, wrap in `unstable_cache` /
`fetch(..., { next: { revalidate: 60 } })` to match Streamlit's 60‑second TTL on
the ESPN call and give the live-week path a similar bound.

---

## 5. Module-by-module port notes

### `formula.py` → `lib/scoring/formula.ts`

- Each `*_points` function ports verbatim as `(x: number) => number`. Keep every
  threshold exactly (`>=` vs `>`, the `-3/-1` drop penalties, the unreachable
  `rushing_tds > 0 → 1` branch can go since `rushing_tds` is an integer).
- `wr_formula` becomes a single pass over the WR rows: compute the ten point
  columns, left-join drops by **display name** (`pfr_player_name ===
player_display_name`, missing → 0), sum into `total_score`, sort descending.
- Preserve the shape: output rows carry the raw stat columns the Python output
  carries (callers select `receptions`, `receiving_yards`, `receiving_tds`,
  `receiving_yards_after_catch` from it).
- The Python joins each points frame back on `player_display_name` with inner
  joins. Because all nine frames come from the same `wr_stats` frame, this only
  matters if two WRs share a display name in one week (it would cross-product).
  The TS version computes per-row and avoids that; the golden test will tell us
  if any historic week actually had a collision.

### `prediction.py` → `lib/scoring/prediction.ts` + `scripts/predict-week.ts`

- Three predictors are all "average `total_score` across N frames, inner-joined
  on display name". Port as one generic `averageScores(frames: ScoredRow[][])`
  that keeps only players present in **every** frame (that is the current
  behaviour: rookies / returning players are dropped), plus thin named wrappers
  so intent stays readable.
- `calculate_2025_season_score_lol` → `seasonAverage(season)`: run `wr_formula`
  per week over REG+POST, then per player average `total_score` and sum
  `receptions / receiving_yards / receiving_tds`. Parameterise the season.
- The module-level side effects (computing and upserting week‑2 2026 predictions
  on import) move into `scripts/predict-week.ts` with `--season --week` flags.

### `opponent.py` → `lib/scoring/opponent.ts`

Unused today. Recommendation: port it (it is 100 lines and pure) so the idea is
not lost, mark `@experimental`, and do not wire it in. Delete instead if you've
abandoned the idea.

### `live.py` → `lib/live.ts`

- `loadScoredWeek(season, week)`, `toCurrentWeekScoreRows()` (rank 1..n, rename
  `total_score → current_week_score`, stamp season/week), `getLiveWeekLeaders`
  (top 15), `searchLiveWrsByName`.

### `db.py` → `lib/db/*`

- One lazily created service-role client; **server only**. Next.js enforces this
  if the module imports `server-only`.
- Upserts take typed row arrays; `on_conflict` columns unchanged.
- Reads keep the exact filters, orderings and `limit(15)`s.
- `get_predictions` joins `players(player_display_name)` via PostgREST embedding;
  `supabase-js` supports the same `select("…, players(player_display_name)")`.
- `search_wrs_by_name` fallback chain must be preserved exactly:
  1. week given and rankings exist → weekly search joined with stats, threshold-filtered
  2. week given and rankings missing → live search from nflverse
  3. no week → `season_rankings` `ilike` + `gte` filters
  4. no week, nothing in `season_rankings`, season has weekly data → aggregate
     season-to-date from `weekly_rankings` + `weekly_wr_stats` (average score,
     summed stats) and filter in memory
- `get_current_week_leaders`: `candidate_week = latest_week + 1`, try live, else
  fall back to the last completed week's rankings merged with stats.
- `record_model_result` / `get_model_result_id`: port the functions; nothing
  calls them yet.

### `storage.py` → `lib/db/storage.ts`

- `upload_raw_week` writes parquet. Options: (a) `hyparquet-writer` to keep
  parquet, (b) switch to JSON/CSV at `raw/{season}/week-{week}.json`. Recommend
  **(a)** so existing files and any future Python/pandas consumer keep working.
- `upload_training_data` and `upload_model` (joblib) belong to the unbuilt ML
  path. Port `upload_training_data`; leave `upload_model` out until there is a
  model to upload (joblib is Python-specific anyway; see §8).

### `wr.py` → `scripts/ingest-week.ts`

- Becomes a CLI: `--season --week [--force]`. Same gate: upload/upsert only when
  every scheduled game that week has a non-null `result`.
- Reproduce the exact `weekly_wr_stats` row (drops left-joined and filled to 0,
  `target_share` as numeric) and `weekly_rankings` row (`rank` is 1-based
  position in the score-sorted list, `score_breakdown` is an object of every
  `*_points` field).
- Keep the console preview (top 15 by score, top 15 by yards) as `--print`.

### `season.py` → `scripts/build-season.ts`

- `--season` flag. Upsert players then `season_rankings`.

### `scoreboard.py` → `lib/espn/scoreboard.ts` + `components/Scoreboard.tsx`

- Pure parts (`parseGames`, `weekOptions`, `badge`, `side`) port to TS with the
  same string rules (`FT`, `Q3 4:12`, `OT`, kickoff text with `-` and
  `EDT/EST` stripped, `TBD`).
- The banner is a client component: week `<select>`, prev/next buttons, three
  cards per page, reset page to 0 on week change. Fetch via a route handler
  (`/api/scoreboard?seasontype=&week=&dates=`) or call ESPN directly from the
  browser; ESPN's site API allows cross-origin reads, but a route handler lets
  us cache for 60 s server-side like `st.cache_data(ttl=60)`.
- Fail closed to a "Live scores unavailable" caption on any error, as today.

### `ui.py` → `app/page.tsx` + `components/WrSearch.tsx`

- Page is a Server Component: fetch `season_rankings(2025)`, `weekly_rankings(2026,1)`
  merged with stats, `predictions(2026,2)`, `current_week_leaders(2026)` in
  parallel with `Promise.all`, render four columns.
- Search panel is a client component posting to a server action or route handler;
  filter popover holds week (Season Total / 1–17), season (options depend on
  week, defaulting to the latest), min yards/TDs/receptions.
- Column order logic ("preferred order, keep only columns present") ports as-is.
- The hard-coded `2025 / 2026 / week 1 / week 2` should become derived values
  (`latest completed week`, `next week`) **after** the port is verified, not during.

---

## 6. Verification: golden tests

A rewrite without a reference is just a second implementation. Before writing TS:

1. Add a tiny Python script (`tools/dump_fixtures.py`, temporary) that, for a fixed
   set of `(season, week)` pairs (say 2025 weeks 1, 9, 18 and 2026 week 1), dumps:
   - the raw WR stats and drops rows used (so TS tests don't hit the network),
   - `wr_formula(...)` output,
   - `live._to_current_week_score_dicts(...)` output,
   - `prediction.calculate_2025_season_score_lol()` output,
   - `scoreboard.parse_games` / `week_options` on a captured ESPN payload.
2. Commit these as JSON under `tests/fixtures/`.
3. Vitest asserts the TS functions reproduce them exactly (integers exact, floats
   to 1e‑9). Sort order must match too.
4. For the DB layer, run the Python `search_wrs_by_name` and the TS version
   against the live project for a handful of queries and diff the JSON once; this
   is a manual check, not a committed test.

Once green, every "fix" in §7 is a deliberate fixture change in its own commit.

---

## 7. Known quirks to decide on (port first, then decide)

| #   | Quirk                                                                                                                                                                         | Recommendation                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | All joins key on `player_display_name`, not `player_id`. Drops only exist by PFR name, so some name mismatch is inherent there, but ranking→stats joins could use `player_id` | Keep for the port; switch internal joins to `player_id` afterwards and keep the name join only for drops |
| 2   | Predictors inner-join, silently dropping any player missing a week                                                                                                            | Keep; later consider treating a missing week as 0 or using available weeks only                          |
| 3   | `prediction.py`, `wr.py`, `season.py` run on import with hard-coded season/week                                                                                               | Fixed by the CLI conversion in the port itself                                                           |
| 4   | `ui.py` hard-codes 2025/2026 and weeks 1/2                                                                                                                                    | Port as constants in one `config.ts`, then derive from DB                                                |
| 5   | Current-week leaders fetched twice in `ui.py`                                                                                                                                 | Fetch once                                                                                               |
| 6   | `weekly_rankings.total_score` is `bigint`, but the season-to-date aggregate averages it                                                                                       | Fine; types just need to express it                                                                      |
| 7   | `opponent.py` unused                                                                                                                                                          | Port as experimental or delete                                                                           |
| 8   | `upload_model` is joblib/Python-specific                                                                                                                                      | Leave out of TS; see §8                                                                                  |
| 9   | Two Supabase clients (`db.py`, `storage.py`)                                                                                                                                  | One client module                                                                                        |
| 10  | Search is `ilike '%name%'` server-side but plain `includes` in the in-memory paths                                                                                            | Same semantics for ASCII; keep                                                                           |

---

## 8. Open decisions

Recommendations given; none block Phase 0–2.

1. **ML path.** `model_results`, `upload_training_data`, `upload_model` imply a
   future scikit-learn model. TypeScript is a poor fit for training. Options:
   keep a small Python `ml/` folder for training only and have TS read its
   outputs from `predictions` / `model_results`, or drop ML from scope. The
   rewrite plan assumes **Python stays for training only**, and the TS app is the
   source of truth for scoring, ingestion and UI.
2. **Hosting.** Vercel for Next.js; GitHub Actions scheduled workflow (Tuesday
   mornings) running `pnpm tsx scripts/ingest-week.ts`. Alternatively a Supabase
   Edge Function, but hyparquet + the 9 MB CSV fallback are easier in Node.
3. **Browser vs server reads.** Plan assumes all Supabase reads happen server-side
   with the service-role key (as today). If you later want client-side reads,
   add an anon key and RLS read policies; RLS is already enabled on every table.
4. **Styling.** Tailwind assumed. Plain CSS modules are equally fine.
5. **Repo cutover.** Build TS alongside Python in the same repo (Python files stay
   until Phase 5), or in a `ts/` folder? Recommendation: TS at the repo root,
   Python moved to `legacy/` in Phase 0 so imports stop being a trip hazard and
   the fixture dumper can still run from there.

---

## 9. Phases

| Phase                  | Scope                                                                                                                         | Exit criteria                                                                                                      | Est.       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- |
| **0. Scaffold**        | pnpm + Next.js + TS strict + Vitest + ESLint/Prettier; move Python to `legacy/`; `.env.example`; generate `database.types.ts` | `pnpm dev`, `pnpm test`, `pnpm lint` all run                                                                       | ½ day      |
| **1. Fixtures**        | Python dumper; commit JSON fixtures for 4 weeks + ESPN payload                                                                | Fixtures reviewed, deterministic                                                                                   | ½ day      |
| **2. Core**            | `types.ts`, `scoring/*`, `nflverse/*`, `live.ts`, `espn/scoreboard.ts`                                                        | Golden tests green for formula, live rows, season average, scoreboard parsing; loader fetches real 2025 data       | 1–2 days   |
| **3. DB layer**        | `db/*` with typed upserts, reads, search chain, storage (parquet via hyparquet-writer)                                        | Manual diff of search results vs Python on 5 queries; dry-run upsert against a Supabase branch or `--dry-run` flag | 1 day      |
| **4. Scripts**         | `ingest-week`, `build-season`, `predict-week` CLIs with `--dry-run`                                                           | Dry runs reproduce current DB rows for an already-ingested week byte-for-byte                                      | ½–1 day    |
| **5. Web UI**          | Dashboard page, search component, scoreboard banner                                                                           | Feature parity with Streamlit screen; works on phone width                                                         | 1–2 days   |
| **6. Cutover**         | Deploy; GitHub Actions cron; README; delete `legacy/` (or keep `legacy/ml`)                                                   | Production URL serving; one real weekly ingest run via Actions                                                     | ½ day      |
| **7. Post-port fixes** | Items from §7 you choose, each with its fixture update                                                                        | Separate PRs                                                                                                       | as desired |

Roughly **5–8 working days** for parity, with the UI the least certain part.

---

## 10. First concrete steps

1. Decide §8.1 (ML stays Python?) and §8.5 (layout). Defaults above are fine.
2. Phase 0 commit: scaffold + `legacy/` move + generated DB types.
3. Phase 1 commit: fixtures.
4. Phase 2 begins with `tiers.ts` and its test, the cheapest end-to-end proof that
   the golden-test loop works.
