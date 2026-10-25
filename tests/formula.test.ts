import { describe, expect, it } from "vitest";
import { wr_formula } from "@/lib/scoring/formula";
import { toCurrentWeekScoreRows } from "@/lib/live";
import { byScoreThenName, expectNonIncreasing, loadWeek, WEEK_FIXTURES } from "./helpers";

describe("wr_formula matches legacy formula.wr_formula", () => {
  for (const name of WEEK_FIXTURES) {
    it(name, () => {
      const fx = loadWeek(name);
      const scored = wr_formula(fx.wr_stats, fx.drops);

      expect(scored).toHaveLength(fx.scored.length);
      expectNonIncreasing(scored.map((r) => r.total_score));

      const cmp = byScoreThenName<{ player_display_name: string; total_score: number }>(
        (r) => r.total_score,
      );
      expect([...scored].sort(cmp)).toEqual([...fx.scored].sort(cmp));
    });
  }
});

describe("toCurrentWeekScoreRows matches legacy live._to_current_week_score_dicts", () => {
  for (const name of WEEK_FIXTURES) {
    it(name, () => {
      const fx = loadWeek(name);
      const live = toCurrentWeekScoreRows(fx.season, fx.week, wr_formula(fx.wr_stats, fx.drops));

      expect(live).toHaveLength(fx.live_rows.length);
      expect(live.map((r) => r.rank)).toEqual(live.map((_, i) => i + 1));
      expectNonIncreasing(live.map((r) => r.current_week_score));

      // Polars' sort is not stable, so ranks inside a tie group may be permuted
      // between implementations. Compare everything except rank row-by-row, and
      // compare the multiset of ranks per score.
      const strip = (r: object) =>
        Object.fromEntries(Object.entries(r).filter(([k]) => k !== "rank"));
      const cmp = byScoreThenName<{ player_display_name: string; current_week_score: number }>(
        (r) => r.current_week_score,
      );
      expect([...live].sort(cmp).map(strip)).toEqual([...fx.live_rows].sort(cmp).map(strip));

      const ranksByScore = (rows: readonly { rank: number; current_week_score: number }[]) => {
        const m = new Map<number, number[]>();
        for (const r of rows)
          m.set(
            r.current_week_score,
            [...(m.get(r.current_week_score) ?? []), r.rank].sort((a, b) => a - b),
          );
        return m;
      };
      expect(ranksByScore(live)).toEqual(ranksByScore(fx.live_rows));
    });
  }
});

describe("wr_formula edge cases", () => {
  const base = loadWeek("2025-w1");
  const one = base.wr_stats[0]!;

  it("gives 0 drop points when the player has no PFR row", () => {
    const [row] = wr_formula([one], []);
    expect(row?.receiving_drop_points).toBe(0);
  });

  it("treats a null receiving_drop as 0 drops", () => {
    const [row] = wr_formula(
      [one],
      [
        {
          pfr_player_name: one.player_display_name,
          season: one.season,
          week: one.week,
          receiving_drop: null,
        },
      ],
    );
    expect(row?.receiving_drop_points).toBe(0);
  });

  it("emits one row per matching PFR row, like the Polars left join", () => {
    const drops = [1, 2].map((receiving_drop) => ({
      pfr_player_name: one.player_display_name,
      season: one.season,
      week: one.week,
      receiving_drop,
    }));
    const rows = wr_formula([one], drops);
    expect(rows.map((r) => r.receiving_drop_points).sort((a, b) => a - b)).toEqual([-3, -1]);
  });
});
