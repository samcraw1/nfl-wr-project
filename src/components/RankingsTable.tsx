/**
 * Generic table standing in for Streamlit's st.dataframe(column_order=...):
 * shows the preferred columns that exist on the first row, in that order.
 */
export type Cell = string | number | boolean | null | undefined;

interface Props<T extends object> {
  rows: readonly T[];
  preferredColumns: readonly string[];
  emptyMessage?: string;
}

export function orderedColumns(row: object | undefined, preferred: readonly string[]): string[] {
  if (!row) return [];
  return preferred.filter((c) => c in row);
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const LABELS: Record<string, string> = {
  player_display_name: "Player",
  season: "Season",
  week: "Week",
  rank: "Rank",
  total_score: "Score",
  current_week_score: "Live Score",
  predicted_score: "Predicted",
  receptions: "Rec",
  receiving_yards: "Yds",
  receiving_tds: "TD",
  targets: "Tgt",
};

export default function RankingsTable<T extends object>({
  rows,
  preferredColumns,
  emptyMessage = "No data",
}: Props<T>) {
  const columns = orderedColumns(rows[0], preferredColumns);
  if (rows.length === 0 || columns.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyMessage}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-semibold whitespace-nowrap">
                {LABELS[c] ?? c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-neutral-100 odd:bg-white even:bg-neutral-50">
              {columns.map((c) => {
                const v = (row as Record<string, unknown>)[c];
                const numeric = typeof v === "number";
                return (
                  <td
                    key={c}
                    className={`px-3 py-1.5 whitespace-nowrap ${numeric ? "text-right tabular-nums" : ""}`}
                  >
                    {formatCell(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
