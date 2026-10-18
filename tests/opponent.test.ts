import { describe, expect, it } from "vitest";
import {
  applyOpponentAdjustment,
  calculateDefenseMatchupScores,
  matchupAdjustment,
} from "@/lib/scoring/opponent";

describe("opponent (experimental port of opponent.py)", () => {
  it("averages per-game totals allowed and converts to points", () => {
    const stats = [
      // Two WRs vs KC in week 1: 160 yds, 2 TD, 12 rec -> 5 + 5 + 5
      { opponent_team: "KC", week: 1, receiving_yards: 100, receiving_tds: 1, receptions: 7 },
      { opponent_team: "KC", week: 1, receiving_yards: 60, receiving_tds: 1, receptions: 5 },
      // vs KC in week 2: 100 yds, 0 TD, 8 rec -> averages 130 / 1.0 / 10 -> 1 + 3 + 0
      { opponent_team: "KC", week: 2, receiving_yards: 100, receiving_tds: 0, receptions: 8 },
      { opponent_team: "BUF", week: 1, receiving_yards: 50, receiving_tds: 0, receptions: 3 },
    ];
    expect(calculateDefenseMatchupScores(stats)).toEqual([
      { opponent_team: "KC", matchup_score: 4 },
      { opponent_team: "BUF", matchup_score: 0 },
    ]);
  });

  it("matchupAdjustment tiers", () => {
    expect(matchupAdjustment(12)).toBe(1.15);
    expect(matchupAdjustment(8)).toBe(1.05);
    expect(matchupAdjustment(4)).toBe(0.95);
    expect(matchupAdjustment(3)).toBe(0.85);
  });

  it("applyOpponentAdjustment multiplies by the opponent's adjustment", () => {
    const predictions = [
      { player_display_name: "A", inputs: [10], predicted_score: 10 },
      { player_display_name: "Unknown", inputs: [8], predicted_score: 8 },
    ];
    const schedule = [{ season: 2026, week: 3, home_team: "DAL", away_team: "KC", result: null }];
    const out = applyOpponentAdjustment(predictions, new Map([["A", "DAL"]]), schedule, [
      { opponent_team: "KC", matchup_score: 12 },
    ]);
    expect(out[0]).toMatchObject({
      team: "DAL",
      opponent_team: "KC",
      matchup_score: 12,
      adjustment: 1.15,
    });
    expect(out[0]!.adjusted_predicted_score).toBeCloseTo(11.5, 9);
    expect(out[1]).toMatchObject({
      team: null,
      opponent_team: null,
      matchup_score: null,
      adjustment: null,
      adjusted_predicted_score: null,
    });
  });
});
