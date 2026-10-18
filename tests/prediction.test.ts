import { describe, expect, it } from "vitest";
import {
  averagePredictedScore,
  predictFromLastThreeWeeks,
  predictWeekThree,
  predictWeekTwo,
} from "@/lib/scoring/prediction";
import { seasonAverage } from "@/lib/scoring/season";
import type { DropsRow, SeasonAverageRow, WrWeekStats } from "@/lib/types";
import { loadFixture, loadWeek } from "./helpers";

interface LegacyPrediction {
  player_display_name: string;
  total_score: number;
  total_score_2: number;
  total_score_3?: number;
  predicted_score: number;
}
interface PredictionsFixture {
  rolling_3: { output: LegacyPrediction[] };
  cold_start_2: { output: LegacyPrediction[] };
  cold_start_3: { output: LegacyPrediction[] };
}

const byName = <T extends { player_display_name: string }>(rows: readonly T[]) =>
  new Map(rows.map((r) => [r.player_display_name, r] as const));

function expectMatchesLegacy(
  actual: readonly { player_display_name: string; inputs: number[]; predicted_score: number }[],
  expected: readonly LegacyPrediction[],
) {
  expect(actual).toHaveLength(expected.length);
  const exp = byName(expected);
  for (const row of actual) {
    const e = exp.get(row.player_display_name);
    expect(e, row.player_display_name).toBeDefined();
    const legacyInputs = [
      e!.total_score,
      e!.total_score_2,
      ...(e!.total_score_3 === undefined ? [] : [e!.total_score_3]),
    ];
    legacyInputs.forEach((v, i) => expect(row.inputs[i]).toBeCloseTo(v, 9));
    expect(row.predicted_score).toBeCloseTo(e!.predicted_score, 9);
  }
  for (let i = 1; i < actual.length; i++) {
    expect(actual[i]!.predicted_score).toBeLessThanOrEqual(actual[i - 1]!.predicted_score);
  }
}

describe("seasonAverage matches legacy calculate_2025_season_score_lol", () => {
  it("2025", () => {
    const inputs = loadFixture<{ wr_stats: WrWeekStats[]; drops: DropsRow[] }>(
      "season-2025-inputs.json",
    );
    const expected = loadFixture<SeasonAverageRow[]>("season-2025-average.json");
    const actual = seasonAverage(inputs.wr_stats, inputs.drops);

    expect(actual).toHaveLength(expected.length);
    const exp = byName(expected);
    for (const row of actual) {
      const e = exp.get(row.player_display_name);
      expect(e, row.player_display_name).toBeDefined();
      expect(row.total_score).toBeCloseTo(e!.total_score, 9);
      expect(row.receptions).toBe(e!.receptions);
      expect(row.receiving_yards).toBe(e!.receiving_yards);
      expect(row.receiving_tds).toBe(e!.receiving_tds);
    }
  });
});

describe("predictors match legacy prediction.py", () => {
  const fx = loadFixture<PredictionsFixture>("predictions.json");
  const season = loadFixture<SeasonAverageRow[]>("season-2025-average.json");
  const w16 = loadWeek("2025-w16").scored;
  const w17 = loadWeek("2025-w17").scored;
  const w18 = loadWeek("2025-w18").scored;
  const w1_2026 = loadWeek("2026-w1").scored;

  it("predict_wr_performance (rolling 3 weeks)", () => {
    expectMatchesLegacy(predictFromLastThreeWeeks(w18, w17, w16), fx.rolling_3.output);
  });

  it("cold start for week 2 (season average + week 1)", () => {
    expectMatchesLegacy(predictWeekTwo(season, w1_2026), fx.cold_start_2.output);
  });

  it("cold start for week 3 (season average + two weeks)", () => {
    expectMatchesLegacy(predictWeekThree(season, w17, w18), fx.cold_start_3.output);
  });

  it("drops players missing from any frame", () => {
    const a = [
      { player_display_name: "A", total_score: 10 },
      { player_display_name: "B", total_score: 4 },
    ];
    const b = [{ player_display_name: "A", total_score: 20 }];
    expect(averagePredictedScore([a, b])).toEqual([
      { player_display_name: "A", inputs: [10, 20], predicted_score: 15 },
    ]);
    expect(averagePredictedScore([])).toEqual([]);
  });
});
