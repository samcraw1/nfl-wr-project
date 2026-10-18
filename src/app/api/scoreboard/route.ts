/**
 * Server-side proxy for the ESPN scoreboard so the browser never talks to ESPN
 * directly and responses are cached for 60 s (matching the legacy
 * st.cache_data(ttl=60)).
 */
import { NextResponse, type NextRequest } from "next/server";
import { fetchScoreboard } from "@/lib/espn/scoreboard";

export const dynamic = "force-dynamic";

function intParam(req: NextRequest, name: string): number | undefined {
  const raw = req.nextUrl.searchParams.get(name);
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isInteger(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const data = await fetchScoreboard(
      {
        seasonType: intParam(req, "seasontype"),
        week: intParam(req, "week"),
        year: intParam(req, "dates"),
      },
      { next: { revalidate: 60 } },
    );
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch {
    return NextResponse.json({ error: "Live scores unavailable" }, { status: 502 });
  }
}
