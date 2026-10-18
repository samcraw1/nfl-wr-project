/**
 * Network integration test for the nflverse loader. Skipped unless
 * NFLVERSE_LIVE=1 (behind a corporate proxy also set NODE_USE_ENV_PROXY=1).
 * Cross-checks the downloaded 2025 week 1 WR rows against the committed fixture.
 */
import { describe, expect, it } from "vitest";
import { loadWrWeek } from "@/lib/nflverse/playerStats";
import { loadDropsWeek } from "@/lib/nflverse/pfrAdvstats";
import { loadScheduleWeek } from "@/lib/nflverse/schedules";
import { loadWeek } from "./helpers";

const live = process.env.NFLVERSE_LIVE === "1";

describe.skipIf(!live)("nflverse loader (network)", () => {
  it("2025 week 1 matches the Python-dumped fixture", async () => {
    const fx = loadWeek("2025-w1");
    const byId = <T extends { player_id: string }>(rows: T[]) =>
      [...rows].sort((a, b) => a.player_id.localeCompare(b.player_id));

    const wr = await loadWrWeek(2025, 1);
    expect(byId(wr)).toEqual(byId(fx.wr_stats));

    const drops = await loadDropsWeek(2025, 1);
    const byName = <T extends { pfr_player_name: string }>(rows: T[]) =>
      [...rows].sort((a, b) => a.pfr_player_name.localeCompare(b.pfr_player_name));
    expect(byName(drops)).toEqual(byName(fx.drops));

    const sched = await loadScheduleWeek(2025, 1);
    const byTeams = <T extends { home_team: string }>(rows: T[]) =>
      [...rows].sort((a, b) => a.home_team.localeCompare(b.home_team));
    expect(byTeams(sched)).toEqual(byTeams(fx.schedule));
  }, 120_000);
});
