import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/dashboard-alerts.css";
import { subscribeAdminChanges } from "../../realtime/adminSocket";
import { getActivityLogs } from "../../services/adminApi";
import { formatDayLabel, journalLines, localDay, shiftDay } from "../../utils/journal";
import type { ActivityLog } from "../../types";

/**
 * Nhật ký tổng hợp hiện thẳng trên Dashboard, tự cập nhật realtime (STOMP /topic/admin/activity).
 * Mặc định là hôm nay (qua nửa đêm tự sang ngày mới), có thể chọn ngày khác để xem lại.
 * Dòng log: "[07:31 30/10/2026]tài khoản đã <hành động> <Đối tượng> : <Chi tiết>".
 */
export default function JournalFeed() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [today, setToday] = useState(() => localDay());
  const [picked, setPicked] = useState<string | null>(null); // null = đang theo dõi "hôm nay"
  const latest = useRef(0);

  const day = picked ?? today;
  const isToday = day === today;

  const load = useCallback(() => {
    const id = ++latest.current;
    getActivityLogs()
      .then((a) => {
        if (id !== latest.current) return;
        setActivities(a);
        setError("");
      })
      .catch((e) => {
        if (id === latest.current)
          setError(e instanceof Error ? e.message : "Không tải được nhật ký");
      })
      .finally(() => {
        if (id === latest.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    return subscribeAdminChanges(load, setConnected);
  }, [load]);

  // Qua nửa đêm thì "hôm nay" tự chuyển sang ngày mới
  useEffect(() => {
    const timer = window.setInterval(() => setToday(localDay()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const lines = useMemo(() => journalLines(activities, day), [activities, day]);

  const choose = (next: string) => {
    if (!next) return;
    setPicked(next >= today ? null : next); // không cho xem tương lai; chọn lại hôm nay thì quay về chế độ theo dõi
  };

  return (
    <section className="card journal-feed" aria-label="Nhật ký tổng hợp">
      <div className="journal-head">
        <div className="journal-title">
          <h2>
            Nhật ký tổng hợp <span className="journal-count">{lines.length}</span>
          </h2>
          <span className="journal-day">
            {isToday ? "Hôm nay · " : ""}
            {formatDayLabel(day)}
          </span>
        </div>
        <div className="journal-tools">
          <span className={`journal-live${connected ? "" : " is-offline"}`}>
            {connected ? "● Realtime" : "○ Mất kết nối, đang thử lại..."}
          </span>
          <div className="journal-nav" role="group" aria-label="Chọn ngày xem nhật ký">
            <button
              type="button"
              className="journal-nav-btn"
              aria-label="Ngày trước"
              title="Ngày trước"
              onClick={() => choose(shiftDay(day, -1))}
            >
              ‹
            </button>
            <input
              type="date"
              className="journal-date"
              aria-label="Chọn ngày"
              value={day}
              max={today}
              onChange={(e) => choose(e.target.value)}
            />
            <button
              type="button"
              className="journal-nav-btn"
              aria-label="Ngày sau"
              title="Ngày sau"
              disabled={isToday}
              onClick={() => choose(shiftDay(day, 1))}
            >
              ›
            </button>
          </div>
          {!isToday && (
            <button type="button" className="journal-today" onClick={() => setPicked(null)}>
              Về hôm nay
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="journal-log" role="log" aria-live="polite">
        {loading ? (
          <p className="journal-empty" role="status">
            Đang tải nhật ký...
          </p>
        ) : lines.length === 0 ? (
          <p className="journal-empty">
            {isToday ? "Chưa có hoạt động nào trong hôm nay." : "Không có hoạt động nào trong ngày này."}
          </p>
        ) : (
          lines.map((l) => (
            <div className={`journal-line tone-${l.tone}`} key={l.key}>
              <span className="journal-time">{l.time}</span>
              <span className="journal-actor">{l.actor}</span> đã {l.text}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
