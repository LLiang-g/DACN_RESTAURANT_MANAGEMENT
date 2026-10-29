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
