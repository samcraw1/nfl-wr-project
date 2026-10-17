import { describe, expect, it } from "vitest";
import { buildWeeklyRankingRows, buildWeeklyStatsRows, nameToPlayerId } from "@/lib/ingest";
import { wrFormula } from "@/lib/scoring/wrFormula";
import { SCORE_BREAKDOWN_KEYS } from "@/lib/types";
import { loadWeek } from "./helpers";

describe("ingestion row builders (legacy wr.py)", () => {
  const fx = loadWeek("2026-w1");
  const scored = wrFormula(fx.wr_stats, fx.drops);

  it("weekly_wr_stats rows carry drops joined on name, 0 when absent", () => {
    const rows = buildWeeklyStatsRows(fx.wr_stats, fx.drops);
    expect(rows).toHaveLength(fx.wr_stats.length);

    const dropNames = new Set(fx.drops.map((d) => d.pfr_player_name));
    const withDrop = rows.find((r) => (r.receiving_drop ?? 0) > 0);
    expect(withDrop).toBeDefined();
    const statsById = new Map(fx.wr_stats.map((s) => [s.player_id, s]));
    for (const r of rows) {
      const s = statsById.get(r.player_id)!;
      if (!dropNames.has(s.player_display_name)) expect(r.receiving_drop).toBe(0);
      expect(r).toMatchObject({
        season: s.season,
        week: s.week,
        team: s.team,
        receptions: s.receptions,
        targets: s.targets,
        receiving_yards: s.receiving_yards,
        target_share: s.target_share,
      });
    }
  });

  it("weekly_rankings rows rank 1..n in score order with a full breakdown", () => {
    const rows = buildWeeklyRankingRows(scored, fx.wr_stats, 2026, 1);
    expect(rows).toHaveLength(scored.length);
    expect(rows.map((r) => r.rank)).toEqual(scored.map((_, i) => i + 1));
    expect(rows[0]).toMatchObject({
      season: 2026,
      week: 1,
      player_display_name: scored[0]!.player_display_name,
      total_score: scored[0]!.total_score,
    });
    const breakdown = rows[0]!.score_breakdown as Record<string, number>;
    expect(Object.keys(breakdown).sort()).toEqual([...SCORE_BREAKDOWN_KEYS].sort());
    expect(Object.values(breakdown).reduce((a, b) => a + b, 0)).toBe(scored[0]!.total_score);
    const idsByName = new Map(fx.wr_stats.map((s) => [s.player_display_name, s.player_id]));
    for (const r of rows) expect(r.player_id).toBe(idsByName.get(r.player_display_name!));
  });

  it("nameToPlayerId warns on ambiguous names and keeps the first id", () => {
    const warnings: string[] = [];
    const map = nameToPlayerId(
      [
        { player_id: "a", player_display_name: "Same Name" },
        { player_id: "b", player_display_name: "Same Name" },
        { player_id: "c", player_display_name: "Other" },
      ],
      (m) => warnings.push(m),
    );
    expect(map.get("Same Name")).toBe("a");
    expect(map.get("Other")).toBe("c");
    expect(warnings).toHaveLength(1);
  });
});
