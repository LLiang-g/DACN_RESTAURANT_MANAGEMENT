import { useEffect, useMemo, useState } from "react";
import { getActivityLogs, getStockTransactions } from "../../services/adminApi";
import { formatDateTime } from "../../utils/format";
import { journalRows, filterJournal } from "../../utils/journal";
import type { ActivityLog, StockTransaction } from "../../types";

export default function ActivityJournal({
  includeStock = false,
}: {
  includeStock?: boolean;
}) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stock, setStock] = useState<StockTransaction[]>([]);
  const [day, setDay] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([
      getActivityLogs(),
      includeStock ? getStockTransactions() : Promise.resolve([]),
    ])
      .then(([a, s]) => {
        if (active) {
          setActivities(a);
          setStock(s);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [includeStock, revision]);
  const rows = useMemo(
    () => filterJournal(journalRows(activities, stock), day),
    [activities, stock, day],
  );
  return (
    <section>
      <div className="toolbar">
        <label>
          Ngày hoạt động{" "}
          <input
            aria-label="Ngày hoạt động"
            className="field"
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <button className="btn-outline" onClick={() => setDay("")}>
          Tất cả ngày
        </button>
        <button
          className="btn-outline"
          onClick={() => {
            setLoading(true);
            setRevision((n) => n + 1);
          }}
        >
          Làm mới
        </button>
      </div>
      {loading ? (
        <p role="status">Đang tải nhật ký...</p>
      ) : error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : (
        <>
          <p>
            {rows.length} bản ghi · Mới nhất trước
            {includeStock
              ? " · Gồm nhật ký hoạt động và giao dịch kho (mỗi nguồn được ghi riêng)"
              : ""}
          </p>
          <div className="table-wrap stock-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Thời điểm</th>
                  <th>Nguồn</th>
                  <th>Người thực hiện</th>
                  <th>Hành động</th>
                  <th>Đối tượng</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td>{formatDateTime(r.createdAt)}</td>
                    <td>{r.source}</td>
                    <td>{r.actor}</td>
                    <td>{r.action}</td>
                    <td>{r.target}</td>
                    <td className="log-detail">{r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p>Không có hoạt động trong ngày đã chọn.</p>}
        </>
      )}
    </section>
  );
}
