"use client";

/** Search panel: name, week/season filters, stat thresholds. Port of ui.render_search. */
import { useState, useTransition } from "react";
import { searchWrsAction, type SearchOutcome } from "@/app/actions";
import RankingsTable from "@/components/RankingsTable";
import { FALLBACK_SEASON, SEARCH_WEEKS } from "@/lib/config";

interface Props {
  weeklySeasons: number[];
  seasonTotalSeasons: number[];
}

const RESULT_COLUMNS = [
  "player_display_name",
  "season",
  "week",
  "rank",
  "total_score",
  "receptions",
  "receiving_yards",
  "receiving_tds",
  "current_week_score",
];

export default function WrSearch({ weeklySeasons, seasonTotalSeasons }: Props) {
  const [name, setName] = useState("");
  const [week, setWeek] = useState<number | null>(null);
  const [season, setSeason] = useState<number | null>(null);
  const [minYards, setMinYards] = useState(0);
  const [minTds, setMinTds] = useState(0);
  const [minRec, setMinRec] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [pending, startTransition] = useTransition();

  const seasonOptions = (week === null ? seasonTotalSeasons : weeklySeasons).length
    ? week === null
      ? seasonTotalSeasons
      : weeklySeasons
    : [FALLBACK_SEASON];
  const effectiveSeason =
    season !== null && seasonOptions.includes(season)
      ? season
      : seasonOptions[seasonOptions.length - 1]!;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      setOutcome(
        await searchWrsAction({
          name,
          season: effectiveSeason,
          week,
          minReceivingYards: minYards,
          minReceivingTds: minTds,
          minReceptions: minRec,
        }),
      );
    });
  }

  return (
    <section className="mb-8">
      <h1 className="mb-3 text-2xl font-bold">Search WRs</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="search"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter WR name"
          aria-label="Search WRs by name"
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2"
        />
        <div className="flex flex-wrap items-start gap-3">
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="rounded bg-[var(--banner)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Searching…" : "Search"}
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm"
            aria-expanded={filtersOpen}
          >
            Filter Options
          </button>
        </div>

        {filtersOpen && (
          <div className="grid max-w-xl gap-3 rounded border border-neutral-200 bg-white p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Select Week
              <select
                value={week ?? ""}
                onChange={(e) => setWeek(e.target.value === "" ? null : Number(e.target.value))}
                className="rounded border border-neutral-300 px-2 py-1"
              >
                <option value="">Season Total</option>
                {SEARCH_WEEKS.map((w) => (
                  <option key={w} value={w}>
                    Week {w}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Select Season
              <select
                value={effectiveSeason}
                onChange={(e) => setSeason(Number(e.target.value))}
                className="rounded border border-neutral-300 px-2 py-1"
              >
                {seasonOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <NumberField
              label="Minimum Receiving Yards"
              value={minYards}
              step={10}
              onChange={setMinYards}
            />
            <NumberField
              label="Minimum Receiving TDs"
              value={minTds}
              step={1}
              onChange={setMinTds}
            />
            <NumberField label="Minimum Receptions" value={minRec} step={1} onChange={setMinRec} />
          </div>
        )}
      </form>

      <div className="mt-4">
        {outcome?.ok === false && (
          <p className="text-sm text-red-700">An error occurred: {outcome.error}</p>
        )}
        {outcome?.ok &&
          (outcome.rows.length > 0 ? (
            <RankingsTable rows={outcome.rows} preferredColumns={RESULT_COLUMNS} />
          ) : (
            <p className="text-sm text-neutral-600">No WRs found with that name.</p>
          ))}
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="rounded border border-neutral-300 px-2 py-1"
      />
    </label>
  );
}
