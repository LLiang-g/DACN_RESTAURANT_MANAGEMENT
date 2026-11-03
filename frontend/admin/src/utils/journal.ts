import type { ActivityLog, StockTransaction } from "../types/index.ts";
export interface JournalRow {
  key: string;
  source: string;
  createdAt: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  id: number;
}
const stockLabels: Record<string, string> = {
  IMPORT: "Nhập kho",
  EXPORT: "Xuất kho",
  ADJUST: "Điều chỉnh kho",
};
export function journalRows(
  activities: ActivityLog[],
  stock: StockTransaction[],
): JournalRow[] {
  return [
    ...activities.map((a) => ({
      key: `activity-${a.id}`,
      id: a.id,
      source: "Hoạt động",
      createdAt: a.createdAt,
      actor: a.actorName || "Tài khoản không còn tồn tại",
      action: a.actionName || a.action,
      target: a.targetName || "Đối tượng đã xóa",
      detail:
        a.detail?.trim() ||
        `${a.actionName || a.action} ${a.targetName || "đối tượng đã xóa"}.`,
    })),
    ...stock.map((s) => ({
      key: `stock-${s.id}`,
      id: s.id,
      source: "Giao dịch kho",
      createdAt: s.createdAt || "",
      actor: "Xem nhật ký hoạt động liên quan",
      action: stockLabels[s.type],
      target: s.ingredient?.name || "Nguyên liệu đã xóa",
      detail:
        s.note?.trim() ||
        `${stockLabels[s.type]} ${s.quantity} ${s.ingredient?.unit || ""} ${s.ingredient?.name || "nguyên liệu đã xóa"}.`,
    })),
  ].sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) ||
      b.id - a.id ||
      a.key.localeCompare(b.key),
  );
}
export function filterJournal(rows: JournalRow[], day: string) {
  return day ? rows.filter((r) => r.createdAt.slice(0, 10) === day) : rows;
}

/** Ngày theo giờ máy (yyyy-mm-dd), dùng làm mặc định "hôm nay" của nhật ký. */
export function localDay(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** "2026-10-30T07:31:12" → "07:31 30/10/2026" (cắt chuỗi, không phụ thuộc múi giờ trình duyệt). */
export function formatLogTime(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(iso || "");
  return m ? `${m[4]}:${m[5]} ${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Ghép "<hành động> <Đối tượng> : <Chi tiết>" khi in log — luôn đủ cả 3 phần, kể cả khi chi tiết trống.
 * Hành động in chữ thường ("đã xóa Gà rán"). Backend chỉ lưu chi tiết thô, việc ghép chỉ làm ở đây;
 * dữ liệu cũ đã lưu thế nào thì hiện thế ấy.
 */
export function describeAction(action: string, target: string, detail: string): string {
  return `${action.trim().toLocaleLowerCase("vi")} ${target}: ${detail.trim()}`;
}

/** Màu dòng log: thêm (xanh), xóa (đỏ), sửa (vàng), còn lại (xám). */
export type JournalTone = "add" | "remove" | "edit" | "other";

export interface JournalLine {
  key: string;
  createdAt: string;
  time: string;
  actor: string;
  text: string;
  tone: JournalTone;
}

export function journalTone(action: string): JournalTone {
  switch ((action || "").toLowerCase()) {
    case "create":
    case "import":
      return "add";
    case "delete":
    case "export":
      return "remove";
    case "update":
    case "adjust":
      return "edit";
    default:
      return "other";
  }
}

/** Lùi/tiến theo ngày: shiftDay("2026-10-31", -1) = "2026-10-30" (theo lịch địa phương). */
export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + delta));
}

/** "2026-10-30" -> "Thứ Sáu, 30/10/2026" */
export function formatDayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Các dòng log của một ngày, mới nhất trước: "[07:31 30/10/2026]<tài khoản> đã <Hành động> <Đối tượng> : <Chi tiết>".
 * Chỉ đọc nhật ký hoạt động (ActivityLog) — nhập/xuất/điều chỉnh kho cũng được ghi ở đó cùng người thao tác.
 */
export function journalLines(activities: ActivityLog[], day: string): JournalLine[] {
  return activities
    .filter((a) => !day || a.createdAt.slice(0, 10) === day)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
    .map((a) => ({
      key: `activity-${a.id}`,
      createdAt: a.createdAt,
      time: `[${formatLogTime(a.createdAt)}]`,
      actor: a.actorName || "Tài khoản không còn tồn tại",
      text: describeAction(a.actionName || a.action, a.targetName || "Đối tượng đã xóa", a.detail ?? ""),
      tone: journalTone(a.action),
    }));
}
