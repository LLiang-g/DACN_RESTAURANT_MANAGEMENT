import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (row: T) => ReactNode;
}

interface Props<T extends { id: number }> {
  columns: Column<T>[];
  rows: T[];
  actions?: (row: T) => ReactNode;
  empty?: string;
}

export default function DataTable<T extends { id: number }>({
  columns,
  rows,
  actions,
  empty = "Chưa có dữ liệu",
}: Props<T>) {
  return (
    <div className="card table-wrap">
      {rows.length === 0 ? (
        <div className="empty">{empty}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.className}>{c.header}</th>
              ))}
              {actions && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key} className={c.className}>
                    {c.render ? c.render(row) : (row as unknown as Record<string, ReactNode>)[c.key]}
                  </td>
                ))}
                {actions && <td>{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
