/**
 * ESPN NFL scoreboard: fetch and flatten. Port of the pure half of
 * legacy/scoreboard.py; rendering lives in components/Scoreboard.tsx.
 */

export const ESPN_SCOREBOARD_ENDPOINT =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
export const GAMES_PER_PAGE = 3;

// Loose shapes for the parts of the ESPN payload we read.
export interface EspnStatus {
  type?: { state?: string; shortDetail?: string };
  period?: number;
  displayClock?: string;
}
export interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  winner?: boolean;
  team?: { abbreviation?: string; logo?: string };
}
export interface EspnEvent {
  competitions?: { competitors?: EspnCompetitor[] }[];
  status?: EspnStatus;
}
export interface EspnScoreboard {
  events?: EspnEvent[];
  leagues?: {
    calendar?: {
      value?: string | number;
      entries?: { label?: string; value?: string | number }[];
    }[];
  }[];
  season?: { year?: number; type?: number };
  week?: { number?: number };
}

export interface GameSide {
  abbr: string;
  logo: string;
  score: string;
  winner: boolean;
}
export interface Game {
  away: GameSide;
  home: GameSide;
  badge: string;
}
export interface WeekOption {
  label: string;
  seasonType: number;
  week: number;
}

export interface ScoreboardQuery {
  seasonType?: number;
  week?: number;
  year?: number;
}

export function scoreboardUrl({ seasonType, week, year }: ScoreboardQuery = {}): string {
  const params = new URLSearchParams();
  if (seasonType !== undefined) params.set("seasontype", String(seasonType));
  if (week !== undefined) params.set("week", String(week));
  if (year !== undefined) params.set("dates", String(year));
  const qs = params.toString();
  return qs ? `${ESPN_SCOREBOARD_ENDPOINT}?${qs}` : ESPN_SCOREBOARD_ENDPOINT;
}

/** Fetch the ESPN scoreboard. With no arguments, returns the current week. */
export async function fetchScoreboard(
  query: ScoreboardQuery = {},
  init?: RequestInit,
): Promise<EspnScoreboard> {
  const res = await fetch(scoreboardUrl(query), {
    signal: AbortSignal.timeout(10_000),
    ...init,
  });
  if (!res.ok) throw new Error(`ESPN scoreboard ${res.status}`);
  return (await res.json()) as EspnScoreboard;
}

function stripSuffix(s: string, suffix: string): string {
  return s.endsWith(suffix) ? s.slice(0, -suffix.length) : s;
}

/** Short status label: FT for finished games, clock while live, kickoff time before. */
export function badge(status: EspnStatus = {}): string {
  const kind = status.type ?? {};
  const state = kind.state;

  if (state === "post") return "FT";

  if (state === "in") {
    const period = status.period;
    const clock = status.displayClock ?? "";
    if (period) {
      const quarter = period > 4 ? "OT" : `Q${period}`;
      return `${quarter} ${clock}`.trim();
    }
    return clock || "LIVE";
  }

  // Pre-game: "9/17 - 8:15 PM EDT" -> "9/17 8:15 PM"
  const detail = kind.shortDetail ?? "";
  return stripSuffix(stripSuffix(detail.replaceAll(" - ", " "), " EDT"), " EST") || "TBD";
}

function side(competitor: EspnCompetitor, played: boolean): GameSide {
  const team = competitor.team ?? {};
  return {
    abbr: team.abbreviation ?? "???",
    logo: team.logo ?? "",
    score: played ? (competitor.score ?? "0") : "–",
    winner: Boolean(competitor.winner),
  };
}

/** Flatten the ESPN payload into one record per game. */
export function parseGames(data: EspnScoreboard): Game[] {
  const games: Game[] = [];
  for (const event of data.events ?? []) {
    const competitors = event.competitions?.[0]?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");
    if (!home || !away) continue;

    const status = event.status ?? {};
    const played = status.type?.state !== "pre";
    games.push({ away: side(away, played), home: side(home, played), badge: badge(status) });
  }
  return games;
}

/** Every selectable week, from ESPN's own calendar. */
export function weekOptions(data: EspnScoreboard): WeekOption[] {
  const options: WeekOption[] = [];
  for (const section of data.leagues?.[0]?.calendar ?? []) {
    const seasonType = Number(section.value ?? 0);
    for (const entry of section.entries ?? []) {
      options.push({ label: entry.label ?? "", seasonType, week: Number(entry.value ?? 0) });
    }
  }
  return options;
}

/** The (seasonType, week) ESPN reports as current, used to pick the default option. */
export function currentWeek(data: EspnScoreboard): {
  seasonType?: number;
  week?: number;
  year?: number;
} {
  return { seasonType: data.season?.type, week: data.week?.number, year: data.season?.year };
}
