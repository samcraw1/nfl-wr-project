import { describe, expect, it } from "vitest";
import {
  badge,
  currentWeek,
  parseGames,
  scoreboardUrl,
  weekOptions,
  type EspnScoreboard,
  type Game,
} from "@/lib/espn/scoreboard";
import { loadFixture } from "./helpers";

interface ParsedFixture {
  games: Game[];
  week_options: [string, number, number][];
}

describe("ESPN scoreboard parsing matches legacy scoreboard.py", () => {
  const payload = loadFixture<EspnScoreboard>("espn/scoreboard-sample.json");
  const expected = loadFixture<ParsedFixture>("espn/scoreboard-sample-parsed.json");

  it("parseGames", () => {
    expect(parseGames(payload)).toEqual(expected.games);
  });

  it("weekOptions", () => {
    expect(weekOptions(payload)).toEqual(
      expected.week_options.map(([label, seasonType, week]) => ({ label, seasonType, week })),
    );
  });

  it("currentWeek", () => {
    expect(currentWeek(payload)).toEqual({ seasonType: 2, week: 2, year: 2025 });
  });
});

describe("badge", () => {
  it("covers every state", () => {
    expect(badge({ type: { state: "post" } })).toBe("FT");
    expect(badge({ type: { state: "in" }, period: 2, displayClock: "1:00" })).toBe("Q2 1:00");
    expect(badge({ type: { state: "in" }, period: 6, displayClock: "" })).toBe("OT");
    expect(badge({ type: { state: "in" }, displayClock: "" })).toBe("LIVE");
    expect(badge({ type: { state: "pre", shortDetail: "9/17 - 8:15 PM EDT" } })).toBe(
      "9/17 8:15 PM",
    );
    expect(badge({ type: { state: "pre", shortDetail: "9/17 - 1:00 PM EST" } })).toBe(
      "9/17 1:00 PM",
    );
    expect(badge({ type: { state: "pre" } })).toBe("TBD");
    expect(badge()).toBe("TBD");
  });
});

describe("scoreboardUrl", () => {
  it("omits params when none given", () => {
    expect(scoreboardUrl()).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    );
  });
  it("maps year to the dates param", () => {
    expect(scoreboardUrl({ seasonType: 2, week: 1, year: 2025 })).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=1&dates=2025",
    );
  });
});
