"use server";

import { searchWrsByName, type SearchResultRow } from "@/lib/db/search";

export interface SearchInput {
  name: string;
  season: number;
  /** null = season total */
  week: number | null;
  minReceivingYards: number;
  minReceivingTds: number;
  minReceptions: number;
}

export type SearchOutcome = { ok: true; rows: SearchResultRow[] } | { ok: false; error: string };

export async function searchWrsAction(input: SearchInput): Promise<SearchOutcome> {
  const name = input.name.trim();
  if (!name) return { ok: true, rows: [] };
  try {
    const rows = await searchWrsByName(name, {
      season: input.season,
      week: input.week ?? undefined,
      minReceivingYards: Math.max(0, input.minReceivingYards || 0),
      minReceivingTds: Math.max(0, input.minReceivingTds || 0),
      minReceptions: Math.max(0, input.minReceptions || 0),
    });
    return { ok: true, rows };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
