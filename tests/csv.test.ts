import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/nflverse/csv";
import { isWeekComplete } from "@/lib/nflverse/schedules";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF and trailing newline", () => {
    const text = 'a,b,c\r\n1,"x, y","say ""hi"""\r\n2,,\n';
    expect(parseCsv(text)).toEqual([
      { a: "1", b: "x, y", c: 'say "hi"' },
      { a: "2", b: "", c: "" },
    ]);
  });

  it("returns [] for an empty document", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("isWeekComplete", () => {
  const game = (result: number | null) => ({
    season: 2026,
    week: 2,
    home_team: "A",
    away_team: "B",
    result,
  });
  it("is true only when every game has a result", () => {
    expect(isWeekComplete([game(3), game(-7)])).toBe(true);
    expect(isWeekComplete([game(3), game(null)])).toBe(false);
    expect(isWeekComplete([])).toBe(false);
  });
});
