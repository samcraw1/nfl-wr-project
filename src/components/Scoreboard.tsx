"use client";

/**
 * Livescore strip: week picker, prev/next arrows, three game cards.
 * Port of legacy scoreboard.render_header.
 */
import { useRef, useState } from "react";
import {
  GAMES_PER_PAGE,
  parseGames,
  type EspnScoreboard,
  type Game,
  type WeekOption,
} from "@/lib/espn/scoreboard";

interface Props {
  /** Current-week payload fetched on the server, or null if ESPN was unreachable. */
  initial: EspnScoreboard | null;
  options: WeekOption[];
  defaultOption: WeekOption | null;
  year: number | undefined;
}

const key = (o: { seasonType: number; week: number }) => `${o.seasonType}:${o.week}`;

export default function Scoreboard({ initial, options, defaultOption, year }: Props) {
  const [selected, setSelected] = useState<string>(defaultOption ? key(defaultOption) : "");
  const [page, setPage] = useState(0);
  const [games, setGames] = useState<Game[] | null>(initial ? parseGames(initial) : null);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  function selectWeek(value: string) {
    setSelected(value);
    setPage(0);
    const option = options.find((o) => key(o) === value);
    if (!option) return;

    if (defaultOption && value === key(defaultOption) && initial) {
      setGames(parseGames(initial));
      return;
    }

    const params = new URLSearchParams({
      seasontype: String(option.seasonType),
      week: String(option.week),
    });
    if (year !== undefined) params.set("dates", String(year));
    const id = ++requestId.current;
    setGames(null);
    fetch(`/api/scoreboard?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: EspnScoreboard) => {
        if (id === requestId.current) setGames(parseGames(data));
      })
      .catch(() => {
        if (id === requestId.current) setError(true);
      });
  }

  if (!initial || options.length === 0 || error) {
    return <p className="mb-4 text-sm text-neutral-500">Live scores unavailable</p>;
  }

  const lastPage = Math.max(Math.ceil((games?.length ?? 0) / GAMES_PER_PAGE) - 1, 0);
  const current = Math.min(page, lastPage);
  const visible: (Game | null)[] = (games ?? []).slice(
    current * GAMES_PER_PAGE,
    (current + 1) * GAMES_PER_PAGE,
  );
  while (visible.length < GAMES_PER_PAGE) visible.push(null);

  return (
    <div className="mb-5 rounded-md bg-[var(--banner)] px-4 py-3 text-white">
      <div className="grid grid-cols-[minmax(0,2.2fr)_auto_repeat(3,minmax(0,2.8fr))_auto] items-center gap-3 max-sm:grid-cols-[1fr_auto_auto]">
        <div className="max-sm:col-span-3">
          <select
            aria-label="Week"
            className="w-full rounded bg-white px-2 py-1 text-sm text-neutral-900"
            value={selected}
            onChange={(e) => selectWeek(e.target.value)}
          >
            {options.map((o) => (
              <option key={key(o)} value={key(o)}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs font-bold tracking-wider text-white/90">LIVESCORES ▸</div>
        </div>

        <ArrowButton
          label="Previous games"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          ‹
        </ArrowButton>

        {visible.map((game, i) => (
          <GameCard key={i} game={game} loading={games === null} />
        ))}

        <ArrowButton
          label="Next games"
          disabled={current >= lastPage}
          onClick={() => setPage(current + 1)}
        >
          ›
        </ArrowButton>
      </div>
    </div>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded px-2 text-2xl leading-none text-white/90 hover:bg-white/10 hover:text-white disabled:text-white/30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function GameCard({ game, loading }: { game: Game | null; loading: boolean }) {
  if (!game) {
    return (
      <div className="min-h-[68px] px-1 text-xs text-white/50 max-sm:col-span-3">
        {loading ? "Loading…" : ""}
      </div>
    );
  }
  return (
    <div className="min-h-[68px] border-l border-white/20 py-0.5 pr-1 pl-3.5 max-sm:col-span-3 max-sm:border-t max-sm:border-l-0 max-sm:pt-2 max-sm:pl-1">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-white/70">NFL</span>
        <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap">
          {game.badge}
        </span>
      </div>
      <TeamRow side={game.away} />
      <TeamRow side={game.home} />
    </div>
  );
}

function TeamRow({ side }: { side: Game["away"] }) {
  return (
    <div
      className={`flex items-center gap-2 text-[13px] leading-relaxed ${
        side.winner ? "font-bold text-white" : "text-white/80"
      }`}
    >
      {side.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- ESPN CDN logos, tiny, no optimisation needed
        <img src={side.logo} alt="" width={18} height={18} className="h-[18px] w-[18px]" />
      ) : (
        <span className="inline-block h-[18px] w-[18px]" />
      )}
      <span className="flex-1">{side.abbr}</span>
      <span className="tabular-nums">{side.score}</span>
    </div>
  );
}
