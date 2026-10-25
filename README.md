# NFL WR Project

Scores NFL wide receivers week by week with a tiered points formula, keeps the
results in Supabase, predicts next week from recent form, and shows it all on a
dashboard with a live ESPN scoreboard.

TypeScript throughout: Next.js (App Router) for the web app, `tsx` scripts for
ingestion, Vitest for tests. The original Python/Streamlit implementation is kept
in [`legacy/`](legacy/) as the reference the port was verified against; see
[`docs/typescript-rewrite-plan.md`](docs/typescript-rewrite-plan.md).

## Setup

```bash
pnpm install
cp .env.example .env        # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
pnpm dev                    # http://localhost:3000
```

Node 20.9+ and pnpm 10. The service-role key is only ever read on the server
(Server Components, server actions, route handlers, scripts).

## Scripts

| Command                                                     | What it does                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm ingest-week --season 2026 --week 2`                   | Score a week; if every game has a result, upload the raw rows as parquet and upsert `players`, `weekly_wr_stats`, `weekly_rankings`. `--week next` picks the week after the last stored one. `--force` skips the completeness gate. |
| `pnpm build-season --season 2025`                           | Average a season's weekly scores into `season_rankings`.                                                                                                                                                                            |
| `pnpm predict-week --season 2026 --week 2`                  | Write `predictions` for a week: weeks 2 and 3 blend the prior season's average with the current weeks played; later weeks average the previous three.                                                                               |
| `pnpm test` / `pnpm lint` / `pnpm typecheck` / `pnpm build` | The checks CI runs.                                                                                                                                                                                                                 |

Every script accepts `--dry-run`, which fetches and scores but writes nothing.
Behind a corporate proxy, Node's `fetch` needs `NODE_USE_ENV_PROXY=1`.

`.github/workflows/ingest-week.yml` runs the ingestion every Tuesday. It needs the
two Supabase secrets and a `CURRENT_SEASON` repository variable.

## Layout

```
src/app/                 Next.js routes: dashboard page, search server action, /api/scoreboard proxy
src/components/          Scoreboard banner, WR search panel, generic rankings table
src/lib/config.ts        Pinned season/week constants the dashboard shows
src/lib/types.ts         Row shapes shared by loader, scoring and scripts
src/lib/scoring/         formula (point functions + wr_formula), prediction, season average, opponent (experimental)
src/lib/nflverse/        Fetch + decode nflverse release files (parquet via hyparquet, CSV)
src/lib/live.ts          Score an in-progress week straight from nflverse
src/lib/espn/            ESPN scoreboard fetch + parse
src/lib/db/              Supabase client, generated types, reads, writes, search, storage
src/lib/ingest.ts        Pure row builders for the weekly ingestion
scripts/                 ingest-week, build-season, predict-week
tests/                   Vitest suites; tests/fixtures holds golden output from the Python code
legacy/                  Original Python implementation + tools/dump_fixtures.py
```

## How the port was verified

`legacy/tools/dump_fixtures.py` runs the Python scoring over real nflverse data
for 2025 weeks 1, 9, 16, 17, 18 and 2026 week 1, plus the full 2025 season
average and the three predictors, and writes the inputs and outputs to
`tests/fixtures/`. The Vitest suites assert the TypeScript reproduces those
outputs exactly (floats to 1e-9). `tests/nflverse.live.test.ts` additionally
checks the TypeScript loader downloads the same rows the Python loader did
(`NFLVERSE_LIVE=1 pnpm test`).

Re-run the dumper only when you intend to change scoring behaviour.

## Data sources

nflverse GitHub release assets, fetched directly (nflreadpy has no TypeScript
equivalent):

- `stats_player/stats_player_week_{season}.parquet` – player stats
- `pfr_advstats/advstats_week_rec_{season}.parquet` – PFR drops
- `schedules/games.csv` – schedule and results

ESPN's public site API for the scoreboard, proxied through `/api/scoreboard`
with a 60-second cache.

## Behaviour notes

Deliberately preserved from the Python version:

- Scoring joins drops to players by **display name** (PFR has no nflverse id).
- Predictors keep only players present in every input week.
- Season averages are per game played, so a player with one big week ranks high.
- The dashboard is pinned to the seasons/weeks in `src/lib/config.ts`.

Changed on purpose:

- Reads of whole tables page through PostgREST's 1000-row cap instead of
  silently truncating.
- Player-id lookups by name use WR rows only and warn on ambiguous names.
- If the live week cannot be loaded, the leaders panel falls back to the last
  stored week instead of erroring.
- Raw parquet uploads contain the 16 columns the app uses, not every nflverse column.
- No `upload_model` equivalent; model training, if it happens, stays in Python.
