import "dotenv/config";
import { parseArgs } from "node:util";

export interface CliOptions {
  season: number;
  /** A week number, "next" (the week after the last one stored), or undefined. */
  week: number | "next" | undefined;
  dryRun: boolean;
  force: boolean;
}

/** Shared flags: --season <n> --week <n|next> [--dry-run] [--force]. */
export function parseCli(argv: string[], { requireWeek }: { requireWeek: boolean }): CliOptions {
  const { values } = parseArgs({
    args: argv,
    options: {
      season: { type: "string" },
      week: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values.season) fail("--season is required");
  const season = Number(values.season);
  if (!Number.isInteger(season)) fail(`--season must be an integer, got ${values.season}`);

  let week: number | "next" | undefined;
  if (values.week === "next") {
    week = "next";
  } else if (values.week !== undefined) {
    week = Number(values.week);
    if (!Number.isInteger(week) || week < 1)
      fail(`--week must be a positive integer or "next", got ${values.week}`);
  } else if (requireWeek) {
    fail("--week is required");
  }

  return { season, week, dryRun: values["dry-run"], force: values.force };
}

export function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

/** Pad a table for console output (Polars-style preview without the dependency). */
export function printTable<T extends object>(
  rows: readonly T[],
  columns: readonly (keyof T & string)[],
): void {
  const cells = rows.map((r) => columns.map((c) => formatCell(r[c])));
  const widths = columns.map((c, i) => Math.max(c.length, ...cells.map((row) => row[i]!.length)));
  const line = (parts: string[]) => parts.map((p, i) => p.padEnd(widths[i]!)).join("  ");
  console.log(line([...columns]));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const row of cells) console.log(line(row));
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(3);
  return String(v);
}
