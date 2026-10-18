/**
 * Single Supabase client using the service-role key. Server-side only: Next.js
 * never ships non-NEXT_PUBLIC_ env vars to the browser, and nothing under
 * src/components imports this module.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

export type Db = SupabaseClient<Database>;

let client: Db | null = null;

export function getClient(): Db {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).");
  }
  client = createClient<Database>(url, key, { auth: { persistSession: false } });
  return client;
}

/** Throw on a PostgREST error, otherwise return the data. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Supabase: ${result.error.message}`);
  if (result.data === null) throw new Error("Supabase: empty response");
  return result.data;
}

/** PostgREST caps a response at 1000 rows; page through `range` to get them all. */
export async function selectAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const rows = unwrap(await page(from, from + pageSize - 1));
    out.push(...rows);
    if (rows.length < pageSize) return out;
  }
}
