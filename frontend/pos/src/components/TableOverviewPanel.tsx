import type { TableOverview } from '../types/pos';

interface Props {
  tables: TableOverview[];
  onSelectInvoice: (invoiceId: number) => void;
}

export default function TableOverviewPanel({ tables, onSelectInvoice }: Props) {
  const byFloor = tables.reduce<Record<string, TableOverview[]>>((acc, t) => {
    (acc[t.floor] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="table-overview">
      {Object.entries(byFloor).map(([floor, floorTables]) => (
        <section key={floor}>
          <h3> {floor}</h3>
          <div className="table-grid">
            {floorTables.map((t) => (
              <div
                key={t.tableId}
                className={`table-card ${t.status.toLowerCase()} ${t.invoiceId ? 'clickable' : ''}`}
                onClick={() => t.invoiceId && onSelectInvoice(t.invoiceId)}
              >
                <strong>{t.tableNumber}</strong>
                <span>{t.status === 'SERVING' ? 'Đang phục vụ' : 'Trống'}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}